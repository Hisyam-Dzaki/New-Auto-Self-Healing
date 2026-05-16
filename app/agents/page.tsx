'use client'
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

const DEPARTMENTS = [
  'sales', 'engineering', 'marketing', 'finance', 'operations',
  'product', 'support', 'hr', 'legal', 'customer_service'
]

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/company/agents')
      const data = await res.json()
      setAgents(data.agents)
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = filter === 'all' 
    ? agents 
    : agents.filter(a => a.department === filter)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      idle: 'bg-gray-500',
      working: 'bg-blue-500',
      thinking: 'bg-purple-500',
      meeting: 'bg-yellow-500',
      break: 'bg-green-500',
      error: 'bg-red-500',
      success: 'bg-green-400',
    }
    return colors[status] || 'bg-gray-500'
  }

  const getDeptIcon = (dept: string) => {
    const icons: Record<string, string> = {
      engineering: '💻',
      sales: '💰',
      marketing: '📢',
      finance: '💵',
      operations: '⚙️',
      product: '🎨',
      support: '🎧',
      hr: '👥',
      legal: '⚖️',
      customer_service: '📞',
    }
    return icons[dept] || '🏢'
  }

  if (loading) {
    return <div className="text-white">Loading agents...</div>
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Agents</h1>
          <p className="text-gray-400">{agents.length} total agents</p>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {DEPARTMENTS.map(dept => (
          <button
            key={dept}
            onClick={() => setFilter(dept)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === dept ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {getDeptIcon(dept)} {dept.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map(agent => (
          <div key={agent.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <h3 className="font-semibold text-white">{agent.name}</h3>
                  <p className="text-sm text-gray-400">{agent.role}</p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{getDeptIcon(agent.department)}</span>
              <span className="text-sm text-gray-300 capitalize">{agent.department.replace('_', ' ')}</span>
              <span className="text-xs text-gray-500">• {agent.behavior}</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {agent.skills.slice(0, 3).map(skill => (
                <span key={skill} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                  {skill}
                </span>
              ))}
              {agent.skills.length > 3 && (
                <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
                  +{agent.skills.length - 3}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-700/50 rounded p-2">
                <p className="text-lg font-bold text-green-400">{agent.tasks_completed}</p>
                <p className="text-xs text-gray-400">Done</p>
              </div>
              <div className="bg-gray-700/50 rounded p-2">
                <p className="text-lg font-bold text-red-400">{agent.tasks_failed}</p>
                <p className="text-xs text-gray-400">Failed</p>
              </div>
              <div className="bg-gray-700/50 rounded p-2">
                <p className="text-lg font-bold text-blue-400">{agent.tokens_used}</p>
                <p className="text-xs text-gray-400">Tokens</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No agents found</p>
        </div>
      )}
    </div>
  )
}