import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  role: string
  department: string
  status: string
  behavior: string
  skills: string[]
  tasks_completed: number
  tasks_failed: number
  tokens_used: number
  last_active: string
}

interface Department {
  id: string
  name: string
  type: string
  description: string
  agent_count: number
  active_tasks: number
  completed_tasks: number
}

const API_BASE = 'http://localhost:8888/api'

export default function HR() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: '', role: '', department: '' })

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [agentsRes, deptRes] = await Promise.all([
        fetch(`${API_BASE}/company/agents`),
        fetch(`${API_BASE}/company/departments`)
      ])
      const agentsData = await agentsRes.json()
      const deptData = await deptRes.json()
      setAgents(agentsData.agents || [])
      setDepartments(deptData.departments || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const addAgent = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgent.name,
          role: newAgent.role,
          department: newAgent.department,
          skills: []
        })
      })
      if (res.ok) {
        fetchData()
        setShowAddAgent(false)
        setNewAgent({ name: '', role: '', department: '' })
      }
    } catch (err) {
      console.error('Failed to add agent:', err)
    }
  }

  const isDark = theme === 'dark'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>HR Management</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Manage employees and departments</p>
      </header>

      <div className="flex gap-4">
        <button
          onClick={() => setShowAddAgent(true)}
          className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + Add Agent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Departments</h2>
          <div className="space-y-3">
            {departments.map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div>
                  <div className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{dept.name}</div>
                  <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{dept.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{dept.agent_count}</div>
                  <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>agents</div>
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <p className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No departments</p>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Agents</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {agents.map(agent => (
              <div key={agent.id} className="p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{agent.name}</div>
                  <div className="text-sm px-2 py-1 rounded" style={{ 
                    background: agent.status === 'working' ? '#10b981' : agent.status === 'idle' ? '#6b7280' : '#ef4444',
                    color: '#fff'
                  }}>{agent.status}</div>
                </div>
                <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {agent.role} • {agent.department}
                </div>
                <div className="text-xs mt-1" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                  Tasks: {agent.tasks_completed} completed, {agent.tasks_failed} failed • Tokens: {agent.tokens_used}
                </div>
              </div>
            ))}
            {agents.length === 0 && (
              <p className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No agents</p>
            )}
          </div>
        </div>
      </div>

      {showAddAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Add Agent</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={newAgent.name}
                onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="text"
                placeholder="Role (e.g., Developer, Designer)"
                value={newAgent.role}
                onChange={e => setNewAgent({ ...newAgent, role: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <select
                value={newAgent.department}
                onChange={e => setNewAgent({ ...newAgent, department: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.type}>{dept.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={addAgent} className="flex-1 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">Add</button>
                <button onClick={() => setShowAddAgent(false)} className="flex-1 py-2 rounded-lg" style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}