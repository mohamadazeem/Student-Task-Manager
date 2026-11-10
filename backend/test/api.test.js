const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../src/server');
const pool = require('../config/db');

test('authentication, task ownership, validation and safe errors (mock database)', async (t) => {
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret';
  const owner = 1;
  const stranger = 2;
  let user = null;
  let task = null;

  t.mock.method(pool, 'query', async (sql, params = []) => {
    const text = typeof sql === 'string' ? sql : sql.text;

    // Check user exists
    if (/SELECT\s+id\s+FROM\s+users\s+WHERE\s+email\s*=/i.test(text)) {
      const email = params[0];
      return { rows: user && user.email === email ? [{ id: user.id }] : [] };
    }

    // Register user
    if (/INSERT\s+INTO\s+users/i.test(text)) {
      user = { id: owner, name: params[0], email: params[1], password: params[2] };
      return { rows: [{ id: user.id, name: user.name, email: user.email }] };
    }

    // Login user
    if (/SELECT\s+id,\s*name,\s*email,\s*password\s+FROM\s+users/i.test(text)) {
      const email = params[0];
      return { rows: user && user.email === email ? [user] : [] };
    }

    // Get current user profile
    if (/SELECT\s+id,\s*name,\s*email\s+FROM\s+users\s+WHERE\s+id\s*=/i.test(text)) {
      const id = Number(params[0]);
      return { rows: user && user.id === id ? [{ id: user.id, name: user.name, email: user.email }] : [] };
    }

    // List tasks
    if (/SELECT\s+\*\s+FROM\s+tasks\s+WHERE\s+user_id\s*=/i.test(text)) {
      const userId = Number(params[0]);
      return { rows: task && task.user_id === userId ? [task] : [] };
    }

    // Create task
    if (/INSERT\s+INTO\s+tasks/i.test(text)) {
      task = {
        id: 1,
        user_id: Number(params[0]),
        title: params[1],
        description: params[2] || '',
        deadline: params[3] || null,
        priority: params[4] || 'Medium',
        status: params[5] || 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { rows: [task] };
    }

    // Get one task
    if (/SELECT\s+\*\s+FROM\s+tasks\s+WHERE\s+id\s*=\s*\$1\s+AND\s+user_id\s*=\s*\$2/i.test(text)) {
      const id = Number(params[0]);
      const userId = Number(params[1]);
      return { rows: task && task.id === id && task.user_id === userId ? [task] : [] };
    }

    // Update task
    if (/UPDATE\s+tasks\s+SET/i.test(text)) {
      const id = Number(params[5]);
      const userId = Number(params[6]);
      if (!task || task.id !== id || task.user_id !== userId) return { rows: [] };
      task = {
        ...task,
        title: params[0],
        description: params[1] ?? '',
        deadline: params[2] ?? null,
        priority: params[3] ?? 'Medium',
        status: params[4] ?? 'Pending',
        updated_at: new Date().toISOString(),
      };
      return { rows: [task] };
    }

    // Delete task
    if (/DELETE\s+FROM\s+tasks/i.test(text)) {
      const id = Number(params[0]);
      const userId = Number(params[1]);
      if (!task || task.id !== id || task.user_id !== userId) return { rows: [] };
      const deleted = task;
      task = null;
      return { rows: [deleted] };
    }

    return { rows: [] };
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    await new Promise(resolve => server.close(resolve));
  });

  async function call(path, method = 'GET', body, token, raw = false) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  }

  assert.equal((await call('/tasks')).status, 401);
  const invalid = await call('/auth/register', 'POST', { name: 'Test', email: 'invalid', password: 'short' });
  assert.equal(invalid.status, 400);
  assert.ok(!JSON.stringify(invalid.body).includes('short'));
  assert.equal((await call('/auth/login', 'POST', { email: 'test@example.com', password: {} })).status, 400);
  assert.equal((await call('/auth/login', 'POST', '{broken', undefined, true)).body.error, 'Invalid JSON body');

  const credentials = { name: 'Test', email: 'TEST@example.com', password: '123456' };
  const registered = await call('/auth/register', 'POST', credentials);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.id, owner);
  assert.ok(!registered.body.user.password);
  assert.ok(await bcrypt.compare(credentials.password, user.password));

  assert.equal((await call('/auth/register', 'POST', credentials)).status, 400);
  assert.equal((await call('/auth/login', 'POST', { ...credentials, password: 'wrong' })).status, 401);

  const login = await call('/auth/login', 'POST', credentials);
  assert.equal(login.status, 200);
  const token = login.body.token;
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(payload.userId, owner);
  assert.equal(payload.exp - payload.iat, 86400);

  const alien = jwt.sign({ userId: stranger }, process.env.JWT_SECRET);
  const expired = jwt.sign({ userId: owner }, process.env.JWT_SECRET, { expiresIn: -1 });
  assert.equal((await call('/tasks', 'GET', undefined, expired)).status, 403);
  assert.equal((await call('/tasks', 'POST', { title: {}, priority: 'High' }, token)).status, 400);
  assert.equal((await call('/tasks', 'POST', { title: 'Task', priority: 'Urgent' }, token)).status, 400);

  const created = await call('/tasks', 'POST', { title: 'Task', deadline: '2026-10-21', userId: stranger }, token);
  assert.equal(created.status, 201);
  assert.equal(created.body.user_id, owner);
  assert.match(String(created.body.id), /^\d+$/);

  const path = '/tasks/' + created.body.id;
  assert.equal((await call('/tasks', 'GET', undefined, token)).body.length, 1);
  assert.equal((await call('/tasks', 'GET', undefined, alien)).body.length, 0);

  for (const method of ['GET', 'PUT', 'DELETE']) {
    const body = method === 'PUT' ? { title: 'Changed' } : undefined;
    assert.equal((await call(path, method, body, alien)).status, 404);
    assert.equal((await call('/tasks/invalid', method, body, token)).status, 400);
  }

  const updated = await call(path, 'PUT', { title: 'Updated', status: 'Completed' }, token);
  assert.equal(updated.body.status, 'Completed');
  assert.equal(updated.body.deadline, null);

  assert.equal((await call('/users')).status, 401);
  const profile = await call('/users', 'GET', undefined, token);
  assert.equal(profile.body.length, 1);
  assert.ok(!profile.body[0].password);
  assert.equal((await call('/users', 'GET', undefined, alien)).body.length, 0);
  assert.equal((await call('/users', 'POST', credentials, token)).status, 403);

  assert.equal((await call(path, 'DELETE', undefined, token)).status, 200);
  assert.equal((await call(path, 'GET', undefined, token)).status, 404);
});

test('unexpected errors return generic messages without logging sensitive details', () => {
  const handler = require('../middleware/errorMiddleware');
  let status, body;
  const response = {
    status(code) { status = code; return this; },
    json(data) { body = data; },
  };
  handler(new Error('sensitive connection details'), {}, response, () => {});
  assert.equal(status, 500);
  assert.deepEqual(body, { error: 'Internal server error' });
});
