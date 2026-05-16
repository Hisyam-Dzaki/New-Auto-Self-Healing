import { useState, useEffect } from 'react'

interface Department {
  id: string
  name: string
  type: string
  agent_count: number
  active_tasks: number
  completed_tasks: number
}

interface Agent {
  id: string
  name: string
  role: string
  department: string
  status: string
  behavior: string
}

interface Stats {
  company_name: string
  total_departments: number
  total_agents: number
  active_tasks: number
  completed_tasks: number
  total_tokens: number
  departments: Department[]
}

const API_BASE = 'http://localhost:8888/api'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, agentsRes] = await Promise.all([
        fetch(`${API_BASE}/company/stats`),
        fetch(`${API_BASE}/company/agents`)
      ])
      const statsData = await statsRes.json()
      const agentsData = await agentsRes.json()
      setStats(statsData)
      setAgents(agentsData.agents || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
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
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>
          {stats?.company_name || 'AgentForge Inc.'}
        </h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>AI Company Simulation Dashboard</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Agents</div>
          <div className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>{stats?.total_agents || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Departments</div>
          <div className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>{stats?.total_departments || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Active Tasks</div>
          <div className="text-3xl font-bold" style={{ color: '#3b82f6' }}>{stats?.active_tasks || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Completed</div>
          <div className="text-3xl font-bold" style={{ color: '#22c55e' }}>{stats?.completed_tasks || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Departments</h2>
          <div className="space-y-3">
            {(stats?.departments || []).map(dept => (
              <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div>
                  <div className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{dept.name}</div>
                  <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{dept.type}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{dept.agent_count} agents</div>
                  <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{dept.active_tasks} active</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Recent Agents</h2>
          <div className="space-y-3">
            {agents.slice(0, 5).map(agent => (
              <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{agent.name}</div>
                  <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{agent.role} • {agent.department}</div>
                </div>
                <div className="px-2 py-1 rounded text-xs" style={{ 
                  background: agent.status === 'active' ? '#22c55e20' : '#6b728020',
                  color: agent.status === 'active' ? '#22c55e' : '#6b7280'
                }}>
                  {agent.status}
                </div>
              </div>
            ))}
            {agents.length === 0 && (
              <p className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No agents yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}