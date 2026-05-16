'use client'
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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, agentsRes] = await Promise.all([
        fetch('http://localhost:8000/api/company/stats'),
        fetch('http://localhost:8000/api/company/agents')
      ])
      const statsData = await statsRes.json()
      const agentsData = await agentsRes.json()
      setStats(statsData)
      setAgents(agentsData.agents)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-500">Loading AgentForge...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{stats?.company_name}</h1>
          <p className="text-gray-400">AI Company Simulation Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge label="API" status="online" />
          <StatusBadge label="Workers" status="active" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Agents" 
          value={stats?.total_agents || 0} 
          icon="🤖" 
          color="blue"
        />
        <StatCard 
          title="Departments" 
          value={stats?.total_departments || 0} 
          icon="🏢" 
          color="purple"
        />
        <StatCard 
          title="Active Tasks" 
          value={stats?.active_tasks || 0} 
          icon="📋" 
          color="orange"
        />
        <StatCard 
          title="Tokens Used" 
          value={stats?.total_tokens || 0} 
          icon="💎" 
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Department Overview">
            <div className="space-y-3">
              {stats?.departments.map((dept) => (
                <DepartmentRow key={dept.id} department={dept} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Agents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agents.slice(0, 6).map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              <QuickActionButton icon="➕" label="Add Agent" href="/hr" />
              <QuickActionButton icon="📝" label="New Task" href="/tasks" />
              <QuickActionButton icon="💬" label="Broadcast" href="/chat" />
              <QuickActionButton icon="🔄" label="Refresh" onClick={fetchData} />
            </div>
          </SectionCard>

          <SectionCard title="Activity Feed">
            <ActivityFeed agents={agents} />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
  }
  
  return (
    <div className={`p-4 rounded-xl border ${colors[color]} bg-opacity-10`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

function DepartmentRow({ department }: { department: Department }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏢</span>
        <div>
          <p className="font-medium text-white">{department.name}</p>
          <p className="text-sm text-gray-400">{department.agent_count} agents</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-orange-400">{department.active_tasks} active</p>
        <p className="text-sm text-gray-400">{department.completed_tasks} done</p>
      </div>
    </div>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const statusColors: Record<string, string> = {
    idle: 'bg-gray-500',
    working: 'bg-blue-500',
    thinking: 'bg-purple-500',
    meeting: 'bg-yellow-500',
    break: 'bg-green-500',
    error: 'bg-red-500',
    success: 'bg-green-400',
  }
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
      <div className={`w-3 h-3 rounded-full ${statusColors[agent.status] || 'bg-gray-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{agent.name}</p>
        <p className="text-sm text-gray-400 truncate">{agent.role} • {agent.department}</p>
      </div>
    </div>
  )
}

function QuickActionButton({ icon, label, href, onClick }: { icon: string; label: string; href?: string; onClick?: () => void }) {
  const content = (
    <div className="flex flex-col items-center p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors cursor-pointer">
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  )
  
  if (href) {
    return <a href={href}>{content}</a>
  }
  return <div onClick={onClick}>{content}</div>
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  const statusColors: Record<string, string> = {
    online: 'bg-green-500',
    active: 'bg-blue-500',
    offline: 'bg-red-500',
  }
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  )
}

function ActivityFeed({ agents }: { agents: Agent[] }) {
  const activities = agents.slice(0, 5).map((agent, i) => ({
    id: i,
    icon: agent.status === 'working' ? '⚡' : agent.status === 'thinking' ? '💭' : '✅',
    text: `${agent.name} is ${agent.behavior}`,
    time: 'Just now',
  }))
  
  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <span className="text-lg">{activity.icon}</span>
          <div>
            <p className="text-sm text-gray-300">{activity.text}</p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}