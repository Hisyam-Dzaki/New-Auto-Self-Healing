import { useState, useEffect } from 'react'

interface HealingEvent {
  id: string
  timestamp: string
  project_name: string
  error_type: string
  status: string
  action_taken: string
}

interface HealingStats {
  total_heals: number
  successful_heals: number
  failed_heals: number
  success_rate: number
}

const API_BASE = 'http://localhost:8888/api'

export default function SelfHealing() {
  const [stats, setStats] = useState<HealingStats | null>(null)
  const [events, setEvents] = useState<HealingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE}/healing/stats`),
        fetch(`${API_BASE}/healing/events`)
      ])
      const statsData = await statsRes.json()
      const eventsData = await eventsRes.json()
      setStats(statsData)
      setEvents(eventsData.events || [])
    } catch (err) {
      console.error('Failed to fetch healing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const triggerManualHealing = async () => {
    setTriggering(true)
    try {
      await fetch(`${API_BASE}/healing/trigger`, { method: 'POST' })
      setTimeout(() => {
        setTriggering(false)
        fetchData()
      }, 2000)
    } catch (err) {
      console.error('Failed to trigger healing:', err)
      setTriggering(false)
    }
  }

  const isDark = theme === 'dark'
  const webhookUrl = `http://localhost:8888/api/healing/webhook`

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
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Self Healing</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Monitor and control automatic error recovery</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Heals</div>
          <div className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>{stats?.total_heals || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Successful</div>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>{stats?.successful_heals || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Failed</div>
          <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats?.failed_heals || 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Success Rate</div>
          <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{stats?.success_rate?.toFixed(1) || 0}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Manual Trigger</h2>
          <p className="text-sm mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            Manually trigger a healing cycle to scan for and fix errors across all projects.
          </p>
          <button
            onClick={triggerManualHealing}
            disabled={triggering}
            className="px-6 py-3 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {triggering ? 'Triggering...' : '🔧 Trigger Healing Cycle'}
          </button>
        </div>

        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Webhook Integration</h2>
          <p className="text-sm mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            Use this webhook URL to trigger healing from external services:
          </p>
          <div className="p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
            <code className="text-sm break-all" style={{ color: isDark ? '#22c55e' : '#059669' }}>{webhookUrl}</code>
          </div>
          <p className="text-xs mt-2" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
            Send POST requests to this endpoint to trigger healing from CI/CD pipelines or monitoring systems.
          </p>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Recent Healing Events</h2>
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
              <div>
                <div className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{event.project_name}</div>
                <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{event.error_type}</div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs ${event.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {event.status}
                </span>
                <div className="text-xs mt-1" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>{event.timestamp}</div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No healing events yet</p>
          )}
        </div>
      </div>
    </div>
  )
}