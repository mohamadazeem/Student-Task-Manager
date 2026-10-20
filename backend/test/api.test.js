const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../src/server');
const User = require('../models/User');
const Task = require('../models/Task');

test('authentication, task ownership, validation and safe errors (mock database)', async (t) => {
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret';
  const owner = '111111111111111111111111';
  const stranger = '222222222222222222222222';
  let user, task;
  t.mock.method(User, 'exists', async ({ email }) => Boolean(user && user.email === email));
  t.mock.method(User, 'create', async data => (user = { ...data, id: owner }));
  t.mock.method(User, 'findOne', ({ email }) => ({ select: async () => user?.email === email ? user : null }));
  t.mock.method(User, 'findById', async id => id === owner ? user : null);
  const owned = filter => task && String(task._id) === filter._id && String(task.userId) === filter.userId;
  t.mock.method(Task, 'find', filter => ({ sort: async () => task && String(task.userId) === filter.userId ? [task] : [] }));
  t.mock.method(Task, 'create', async data => {
    task = new Task(data);
    await task.validate();
    return task;
  });
  t.mock.method(Task, 'findOne', async filter => owned(filter) ? task : null);
  t.mock.method(Task, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(options.runValidators, true);
    if (!owned(filter)) return null;
    Object.assign(task, update.$set);
    await task.validate();
    return task;
  });
  t.mock.method(Task, 'findOneAndDelete', async filter => {
    if (!owned(filter)) return null;
    const deleted = task;
    task = null;
    return deleted;
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
  assert.match(created.body.id, /^[a-f0-9]{24}$/);
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

test('Mongoose schemas reject invalid fields without accessing a database', async () => {
  const owner = '111111111111111111111111';
  await assert.rejects(new Task({ userId: owner, title: 'Task', status: 'Unknown' }).validate());
  await assert.rejects(new Task({ userId: owner, title: 'Task', deadline: 'invalid' }).validate());
  await assert.rejects(new Task({ userId: owner, title: 'Task', priority: 'Urgent' }).validate());
  await assert.rejects(new User({ name: '', email: 'test@example.com', password: 'hash' }).validate());
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
