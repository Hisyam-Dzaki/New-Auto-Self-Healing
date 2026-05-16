'use client'
import { useState, useEffect } from 'react'
import { COMPANY_API } from './lib/api'
import { useTheme } from './hooks/useTheme'

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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsData, agentsData] = await Promise.all([
        COMPANY_API.stats(),
        COMPANY_API.agents()
      ])
      setStats(statsData as Stats)
      setAgents((agentsData as any).agents || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Loading AgentForge...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>{stats?.company_name}</h1>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>AI Company Simulation Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge isDark={isDark} label="API" online />
          <StatusBadge isDark={isDark} label="Workers" online />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard isDark={isDark} title="Total Agents" value={stats?.total_agents || 0} icon="🤖" />
        <StatCard isDark={isDark} title="Departments" value={stats?.total_departments || 0} icon="🏢" />
        <StatCard isDark={isDark} title="Active Tasks" value={stats?.active_tasks || 0} icon="📋" />
        <StatCard isDark={isDark} title="Tokens Used" value={stats?.total_tokens || 0} icon="💎" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Department Overview</h2>
            <div className="space-y-3">
              {stats?.departments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: isDark ? '#374151' : '#f3f4f6' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                      <p className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{dept.name}</p>
                      <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{dept.agent_count} agents</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p style={{ color: '#f59e0b' }}>{dept.active_tasks} active</p>
                    <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{dept.completed_tasks} done</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Recent Agents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agents.slice(0, 6).map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: isDark ? '#374151' : '#f3f4f6' }}>
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === 'working' ? 'bg-blue-500' :
                    agent.status === 'thinking' ? 'bg-purple-500' :
                    agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: isDark ? '#fff' : '#111827' }}>{agent.name}</p>
                    <p className="text-sm truncate" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{agent.role} • {agent.department}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <a href="/hr" className="flex flex-col items-center p-3 rounded-lg" style={{ background: isDark ? '#374151' : '#f3f4f6' }}>
                <span className="text-2xl mb-1">➕</span>
                <span className="text-sm" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Add Agent</span>
              </a>
              <a href="/tasks" className="flex flex-col items-center p-3 rounded-lg" style={{ background: isDark ? '#374151' : '#f3f4f6' }}>
                <span className="text-2xl mb-1">📝</span>
                <span className="text-sm" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>New Task</span>
              </a>
              <a href="/chat" className="flex flex-col items-center p-3 rounded-lg" style={{ background: isDark ? '#374151' : '#f3f4f6' }}>
                <span className="text-2xl mb-1">💬</span>
                <span className="text-sm" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Broadcast</span>
              </a>
              <div onClick={fetchData} className="flex flex-col items-center p-3 rounded-lg cursor-pointer" style={{ background: isDark ? '#374151' : '#f3f4f6' }}>
                <span className="text-2xl mb-1">🔄</span>
                <span className="text-sm" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Refresh</span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Activity Feed</h2>
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg">
                    {agent.status === 'working' ? '⚡' : agent.status === 'thinking' ? '💭' : '✅'}
                  </span>
                  <div>
                    <p className="text-sm" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>{agent.name} is {agent.behavior}</p>
                    <p className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Just now</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ isDark, title, value, icon }: { isDark: boolean; title: string; value: number; icon: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: isDark ? '#1f2937' : '#fff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{title}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: isDark ? '#fff' : '#111827' }}>{value.toLocaleString()}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

function StatusBadge({ isDark, label, online }: { isDark: boolean; label: string; online: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: isDark ? '#1f2937' : '#fff' }}>
      <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{label}</span>
    </div>
  )
}