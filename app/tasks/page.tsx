'use client'
import { useState, useEffect } from 'react'

interface Task {
  id: string
  title: string
  description: string
  department: string
  assigned_to: string | null
  priority: string
  status: string
  created_at: string
  result: string | null
}

const DEPARTMENTS = ['sales', 'engineering', 'marketing', 'finance', 'operations', 'product', 'support', 'hr', 'legal', 'customer_service']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<any>(null)
  const [filterDept, setFilterDept] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', department: 'engineering', priority: 'medium' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/company/tasks')
      const data = await res.json()
      setTasks(data.tasks)
      setStats(data.stats)
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async () => {
    try {
      await fetch('http://localhost:8000/api/company/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      })
      setShowCreateModal(false)
      setNewTask({ title: '', description: '', department: 'engineering', priority: 'medium' })
      fetchTasks()
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`http://localhost:8000/api/company/tasks/${taskId}`, { method: 'DELETE' })
      fetchTasks()
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const filteredTasks = tasks.filter(t => 
    (filterDept === 'all' || t.department === filterDept) &&
    (filterStatus === 'all' || t.status === filterStatus)
  )

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-500',
      medium: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500',
    }
    return colors[priority] || 'bg-gray-500'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-gray-400',
      processing: 'text-blue-400',
      completed: 'text-green-400',
      failed: 'text-red-400',
    }
    return colors[status] || 'text-gray-400'
  }

  if (loading) return <div className="text-white">Loading tasks...</div>

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Task Queue</h1>
          <p className="text-gray-400">{tasks.length} total tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
        >
          + New Task
        </button>
      </header>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats.total} color="gray" />
          <StatCard label="Pending" value={stats.pending} color="yellow" />
          <StatCard label="Processing" value={stats.processing} color="blue" />
          <StatCard label="Completed" value={stats.completed} color="green" />
          <StatCard label="Failed" value={stats.failed} color="red" />
        </div>
      )}

      <div className="flex gap-4 flex-wrap">
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredTasks.map(task => (
          <div key={task.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center gap-4">
            <div className={`w-2 h-12 rounded ${getPriorityColor(task.priority)}`} />
            <div className="flex-1">
              <h3 className="font-semibold text-white">{task.title}</h3>
              <p className="text-sm text-gray-400">{task.description}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>📁 {task.department}</span>
                <span>⏰ {new Date(task.created_at).toLocaleString()}</span>
                <span className={getStatusColor(task.status)}>● {task.status}</span>
              </div>
            </div>
            <button
              onClick={() => deleteTask(task.id)}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              🗑️
            </button>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">No tasks found</div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Create New Task</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Task title"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              />
              <textarea
                placeholder="Description"
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 h-24"
              />
              <select
                value={newTask.department}
                onChange={e => setNewTask({ ...newTask, department: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
              </select>
              <select
                value={newTask.priority}
                onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={createTask}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-700 text-white',
    yellow: 'bg-yellow-900/50 text-yellow-400',
    blue: 'bg-blue-900/50 text-blue-400',
    green: 'bg-green-900/50 text-green-400',
    red: 'bg-red-900/50 text-red-400',
  }
  return (
    <div className={`p-4 rounded-xl ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-70">{label}</p>
    </div>
  )
}