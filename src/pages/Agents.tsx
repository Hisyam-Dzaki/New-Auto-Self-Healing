import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  role: string
  department: string
  status: string
  behavior: string
  hourly_rate: number
  budget: number
}

interface Department {
  id: string
  name: string
  type: string
}

const API_BASE = 'http://localhost:8888/api'

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [filter, setFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: '', role: '', department: '' })

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [agentsRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE}/company/agents`),
        fetch(`${API_BASE}/company/departments`)
      ])
      const agentsData = await agentsRes.json()
      const deptsData = await deptsRes.json()
      setAgents(agentsData.agents || [])
      setDepartments(deptsData.departments || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const addAgent = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/agents/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
      })
      if (res.ok) {
        fetchData()
        setShowAddModal(false)
        setNewAgent({ name: '', role: '', department: '' })
      }
    } catch (err) {
      console.error('Failed to add agent:', err)
    }
  }

  const removeAgent = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/company/agents/${id}`, { method: 'DELETE' })
      if (res.ok) fetchData()
    } catch (err) {
      console.error('Failed to remove agent:', err)
    }
  }

  const isDark = theme === 'dark'
  const filteredAgents = filter === 'all' ? agents : agents.filter(a => a.department === filter)

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
          <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Agents</h1>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Manage your AI agents</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + Add Agent
        </button>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all' ? 'bg-blue-500 text-white' : ''
          }`}
          style={{ background: filter === 'all' ? '#3b82f6' : isDark ? '#1f2937' : '#f3f4f6', color: filter === 'all' ? '#fff' : isDark ? '#d1d5db' : '#4b5563' }}
        >
          All ({agents.length})
        </button>
        {departments.map(dept => (
          <button
            key={dept.id}
            onClick={() => setFilter(dept.name)}
            className={`px-4 py-2 rounded-lg transition-colors`}
            style={{ background: filter === dept.name ? '#3b82f6' : isDark ? '#1f2937' : '#f3f4f6', color: filter === dept.name ? '#fff' : isDark ? '#d1d5db' : '#4b5563' }}
          >
            {dept.name} ({agents.filter(a => a.department === dept.name).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map(agent => (
          <div key={agent.id} className="glass-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {agent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{agent.name}</h3>
                  <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{agent.role}</p>
                </div>
              </div>
              <button
                onClick={() => removeAgent(agent.id)}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Department</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }}>{agent.department}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Status</span>
                <span className="px-2 py-0.5 rounded text-xs" style={{ background: agent.status === 'active' ? '#22c55e20' : '#6b728020', color: agent.status === 'active' ? '#22c55e' : '#6b7280' }}>
                  {agent.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Behavior</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }}>{agent.behavior}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Hourly Rate</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }}>${agent.hourly_rate}/hr</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No agents found</p>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Add Agent</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Agent Name"
                value={newAgent.name}
                onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="text"
                placeholder="Role"
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
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={addAgent}
                  className="flex-1 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
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