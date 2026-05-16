import { useState, useEffect } from 'react'

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  assignee: string
  department: string
  created_at: string
}

interface Agent {
  id: string
  name: string
  department: string
}

const API_BASE = 'http://localhost:8888/api'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assignee: '' })

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [tasksRes, agentsRes] = await Promise.all([
        fetch(`${API_BASE}/company/tasks`),
        fetch(`${API_BASE}/company/agents`)
      ])
      const tasksData = await tasksRes.json()
      const agentsData = await agentsRes.json()
      setTasks(tasksData.tasks || [])
      setAgents(agentsData.agents || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      })
      if (res.ok) {
        fetchData()
        setShowCreateModal(false)
        setNewTask({ title: '', description: '', priority: 'medium', assignee: '' })
      }
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const assignTask = async (taskId: string, agentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/company/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId })
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error('Failed to assign task:', err)
    }
  }

  const completeTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/company/tasks/${taskId}/complete`, { method: 'POST' })
      if (res.ok) fetchData()
    } catch (err) {
      console.error('Failed to complete task:', err)
    }
  }

  const isDark = theme === 'dark'

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    in_progress: '#3b82f6',
    completed: '#22c55e',
    failed: '#ef4444'
  }

  const priorityColors: Record<string, string> = {
    low: '#6b7280',
    medium: '#f59e0b',
    high: '#ef4444'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Tasks</h1>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Manage company tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + Create Task
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Pending</div>
          <div className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>{tasks.filter(t => t.status === 'pending').length}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>In Progress</div>
          <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{tasks.filter(t => t.status === 'in_progress').length}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Completed</div>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>{tasks.filter(t => t.status === 'completed').length}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Failed</div>
          <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{tasks.filter(t => t.status === 'failed').length}</div>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="glass-card">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{task.title}</h3>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded text-xs" style={{ background: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority] }}>
                  {task.priority}
                </span>
                <span className="px-2 py-1 rounded text-xs" style={{ background: `${statusColors[task.status]}20`, color: statusColors[task.status] }}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <p className="text-sm mb-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{task.description}</p>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Assignee: <span style={{ color: isDark ? '#fff' : '#111827' }}>{task.assignee || 'Unassigned'}</span></span>
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Department: <span style={{ color: isDark ? '#fff' : '#111827' }}>{task.department}</span></span>
              </div>
              <div className="flex gap-2">
                {task.status !== 'completed' && (
                  <>
                    <select
                      onChange={e => assignTask(task.id, e.target.value)}
                      value={task.assignee || ''}
                      className="px-2 py-1 rounded text-sm"
                      style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#fff' : '#111827' }}
                    >
                      <option value="">Assign to...</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => completeTask(task.id)}
                      className="px-3 py-1 rounded text-sm bg-green-500 text-white hover:bg-green-600"
                    >
                      Complete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No tasks yet</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Create Task</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Task Title"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <textarea
                placeholder="Description"
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border h-24"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <select
                value={newTask.priority}
                onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={createTask}
                  className="flex-1 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-lg"
                  style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}