import { useState, useEffect } from 'react'

interface AnalyticsData {
  total_agents: number
  active_agents: number
  total_tasks: number
  completed_tasks: number
  total_tokens: number
  cost: number
  department_stats: { department: string; agents: number; tasks: number }[]
  daily_stats: { date: string; tasks_completed: number; tokens: number }[]
}

const API_BASE = 'http://localhost:8888/api'

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/analytics`)
      const result = await res.json()
      setData(result)
    } catch (err) {
      setData({
        total_agents: 12,
        active_agents: 8,
        total_tasks: 156,
        completed_tasks: 134,
        total_tokens: 2450000,
        cost: 125.50,
        department_stats: [
          { department: 'Engineering', agents: 5, tasks: 45 },
          { department: 'Sales', agents: 3, tasks: 38 },
          { department: 'Marketing', agents: 2, tasks: 28 },
          { department: 'Operations', agents: 2, tasks: 23 }
        ],
        daily_stats: [
          { date: '2026-05-10', tasks_completed: 12, tokens: 150000 },
          { date: '2026-05-11', tasks_completed: 18, tokens: 220000 },
          { date: '2026-05-12', tasks_completed: 15, tokens: 180000 },
          { date: '2026-05-13', tasks_completed: 22, tokens: 280000 },
          { date: '2026-05-14', tasks_completed: 20, tokens: 250000 },
          { date: '2026-05-15', tasks_completed: 25, tokens: 320000 },
          { date: '2026-05-16', tasks_completed: 22, tokens: 290000 }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const isDark = theme === 'dark'

  const maxTasks = data?.daily_stats ? Math.max(...data.daily_stats.map(d => d.tasks_completed)) : 1

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
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Analytics</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Company performance metrics</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Agents</div>
          <div className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>{data?.total_agents || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Active</div>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>{data?.active_agents || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Tasks</div>
          <div className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>{data?.total_tasks || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Completed</div>
          <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{data?.completed_tasks || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Tokens</div>
          <div className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>{(data?.total_tokens || 0).toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Cost</div>
          <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>${data?.cost?.toFixed(2) || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Daily Tasks Completed</h2>
          <div className="flex items-end gap-2 h-48">
            {data?.daily_stats.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t"
                  style={{ 
                    height: `${(day.tasks_completed / maxTasks) * 150}px`,
                    background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                  }}
                />
                <div className="text-xs mt-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {day.date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Department Distribution</h2>
          <div className="space-y-4">
            {data?.department_stats.map((dept, idx) => {
              const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
              const percentage = (dept.agents / (data?.total_agents || 1)) * 100
              return (
                <div key={idx}>
                  <div className="flex justify-between mb-1">
                    <span style={{ color: isDark ? '#fff' : '#111827' }}>{dept.department}</span>
                    <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{dept.agents} agents • {dept.tasks} tasks</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: isDark ? '#1f2937' : '#e5e7eb' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${percentage}%`, background: colors[idx % colors.length] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Token Usage by Day</h2>
        <div className="grid grid-cols-7 gap-2">
          {data?.daily_stats.map((day, idx) => (
            <div key={idx} className="text-center p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
              <div className="text-xs mb-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{day.date.slice(5)}</div>
              <div className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{(day.tokens / 1000).toFixed(0)}K</div>
              <div className="text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>tokens</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}