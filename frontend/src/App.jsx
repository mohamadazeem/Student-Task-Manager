import { useEffect, useState } from 'react'

const empty = {
  title: '',
  description: '',
  deadline: '',
  priority: 'Medium',
  status: 'Pending',
}

const priorities = ['Low', 'Medium', 'High']
const statuses = ['Pending', 'In Progress', 'Completed']

async function api(path, options = {}) {
  const session = JSON.parse(
    sessionStorage.getItem('taskManagerSession') || 'null'
  )

  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.token || ''}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    let errorMsg = body.error || body.message || `Request failed (${response.status})`
    if (Array.isArray(body.details) && body.details.length > 0) {
      errorMsg = body.details.map(d => d.msg).join(', ')
    }
    throw new Error(errorMsg)
  }

  if (response.status === 204) return null
  return response.json()
}

export default function App({ session, onLogout }) {
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadTasks() {
    setLoading(true)

    try {
      const data = await api('/tasks')

      if (!Array.isArray(data)) {
        throw new Error('Expected an array from GET /api/tasks')
      }

      setTasks(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  async function save(event) {
    event.preventDefault()
    setBusy(true)

    try {
      const payload = {
        title: form.title,
        priority: form.priority,
        status: form.status,
      }

      if (form.description) {
        payload.description = form.description
      }

      if (form.deadline) {
        payload.deadline = form.deadline
      }

      await api(
        editingId === null ? '/tasks' : `/tasks/${editingId}`,
        {
          method: editingId === null ? 'POST' : 'PUT',
          body: JSON.stringify(payload),
        }
      )

      setForm(empty)
      setEditingId(null)
      await loadTasks()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function edit(task) {
    setEditingId(task.id)

    setForm({
      title: task.title,
      description: task.description || '',
      deadline: task.deadline ? task.deadline.slice(0, 10) : '',
      priority: task.priority || 'Medium',
      status: task.status || 'Pending',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(id) {
    if (!window.confirm('Delete this task?')) return

    try {
      await api(`/tasks/${id}`, { method: 'DELETE' })
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  async function changeStatus(task, status) {
    try {
      const payload = {
        title: task.title,
        priority: task.priority,
        status,
      }

      if (task.description) {
        payload.description = task.description
      }

      if (task.deadline) {
        payload.deadline = task.deadline.slice(0, 10)
      }

      await api(`/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  const visible =
    filter === 'All'
      ? tasks
      : tasks.filter((task) => task.status === filter)

  const count = (status) =>
    tasks.filter((task) => task.status === status).length

  const studentName = session?.student?.name || session?.user?.name || 'Student'

  return (
    <main className="container">
      <header>
        <div>
          <p className="eyebrow">STUDENT TASK MANAGER</p>
          <h1>My academic tasks</h1>
          <p className="muted">
            Plan assignments and track your progress.
          </p>
        </div>

        <div className="header-actions">
          <span className="muted">
            Hi, {studentName}
          </span>

          <button
            type="button"
            className="outline"
            onClick={loadTasks}
          >
            Refresh
          </button>

          <button
            type="button"
            className="outline"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </header>

      {error && (
        <div className="error" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}

      <section className="stats" aria-label="Task summary">
        {[
          ['Total', tasks.length],
          ...statuses.map((status) => [status, count(status)]),
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <div className="columns">
        <section className="panel">
          <h2>
            {editingId === null ? 'Add a task' : 'Edit task'}
          </h2>

          <form onSubmit={save}>
            <label>
              Title
              <input
                required
                maxLength="200"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. Complete lab report"
              />
            </label>

            <label>
              Description
              <textarea
                rows="4"
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
                placeholder="What needs to be done?"
              />
            </label>

            <label>
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={(event) =>
                  setForm({
                    ...form,
                    deadline: event.target.value,
                  })
                }
              />
            </label>

            <div className="pair">
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      priority: event.target.value,
                    })
                  }
                >
                  {priorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value,
                    })
                  }
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="actions">
              <button disabled={busy}>
                {busy
                  ? 'Saving…'
                  : editingId === null
                    ? 'Add task'
                    : 'Save changes'}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  className="outline"
                  onClick={() => {
                    setForm(empty)
                    setEditingId(null)
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="list-head">
            <h2>Tasks</h2>

            <select
              aria-label="Filter by status"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {['All', ...statuses].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p>Loading tasks…</p>
          ) : visible.length === 0 ? (
            <p className="muted">No tasks to show.</p>
          ) : (
            <div className="task-list">
              {visible.map((task) => (
                <article className="task" key={task.id}>
                  <div className="task-title">
                    <h3>{task.title}</h3>

                    <span
                      className={`badge ${task.priority?.toLowerCase()}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {task.description && <p>{task.description}</p>}

                  <p className="muted">
                    Due:{' '}
                    {task.deadline
                      ? task.deadline.slice(0, 10)
                      : 'Not set'}
                  </p>

                  <label className="status-label">
                    Status
                    <select
                      value={task.status}
                      onChange={(event) =>
                        changeStatus(task, event.target.value)
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>

                  <div className="actions">
                    <button
                      type="button"
                      className="outline"
                      onClick={() => edit(task)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => remove(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
