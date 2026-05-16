'use client'
import { useState, useEffect } from 'react'
import { COMPANY_API } from '../lib/api'

interface Stats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  by_department: Record<string, { total: number; pending: number; processing: number; completed: number }>
}

interface AgentStat {
  name: string
  department: string
  tasks_completed: number
  tasks_failed: number
  tokens_used: number
}

export default function AnalyticsPage() {
  const [taskStats, setTaskStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<AgentStat[]>([])
  const [companyStats, setCompanyStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [taskData, agentData, compData] = await Promise.all([
        COMPANY_API.taskStats(),
        COMPANY_API.agents(),
        COMPANY_API.stats()
      ])
      setTaskStats(taskData as Stats)
      setAgents(((agentData as any).agents || []).map((a: any) => ({
        name: a.name,
        department: a.department,
        tasks_completed: a.tasks_completed,
        tasks_failed: a.tasks_failed,
        tokens_used: a.tokens_used
      })))
      setCompanyStats(compData)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const getTotalTasks = () => {
    if (!taskStats) return 0
    return taskStats.total
  }

  const getCompletionRate = () => {
    if (!taskStats || taskStats.total === 0) return 0
    return Math.round((taskStats.completed / taskStats.total) * 100)
  }

  const getTopPerformers = () => {
    return [...agents].sort((a, b) => b.tasks_completed - a.tasks_completed).slice(0, 5)
  }

  const getDeptWithMostTasks = () => {
    if (!taskStats) return 'N/A'
    let max = 0
    let dept = 'N/A'
    for (const [key, val] of Object.entries(taskStats.by_department)) {
      if (val.total > max) {
        max = val.total
        dept = key
      }
    }
    return dept.replace('_', ' ')
  }

  if (loading) return <div className="text-white">Loading analytics...</div>

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400">Performance metrics and insights</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Total Tasks" 
          value={getTotalTasks()} 
          icon="📋" 
          color="blue"
          trend="+12%"
        />
        <MetricCard 
          label="Completion Rate" 
          value={`${getCompletionRate()}%`} 
          icon="✅" 
          color="green"
          trend="+5%"
        />
        <MetricCard 
          label="Active Agents" 
          value={companyStats?.total_agents || 0} 
          icon="🤖" 
          color="purple"
        />
        <MetricCard 
          label="Most Active Dept" 
          value={getDeptWithMostTasks()} 
          icon="🏢" 
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Task Distribution</h2>
          <div className="space-y-3">
            {taskStats && Object.entries(taskStats.by_department).map(([dept, data]) => (
              <div key={dept} className="flex items-center gap-3">
                <span className="w-24 text-sm text-gray-400 capitalize">{dept.replace('_', ' ')}</span>
                <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(data.total / getTotalTasks()) * 100 || 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-300 w-12 text-right">{data.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Top Performers</h2>
          <div className="space-y-3">
            {getTopPerformers().map((agent, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-500'}`}>
                    #{i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">{agent.name}</p>
                    <p className="text-sm text-gray-400 capitalize">{agent.department.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">{agent.tasks_completed}</p>
                  <p className="text-xs text-gray-500">tasks done</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Task Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatusCard label="Pending" value={taskStats?.pending || 0} color="gray" />
          <StatusCard label="Processing" value={taskStats?.processing || 0} color="blue" />
          <StatusCard label="Completed" value={taskStats?.completed || 0} color="green" />
          <StatusCard label="Failed" value={taskStats?.failed || 0} color="red" />
          <StatusCard label="Total" value={taskStats?.total || 0} color="purple" />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, color, trend }: { label: string; value: string | number; icon: string; color: string; trend?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 border-blue-500/30',
    green: 'bg-green-500/20 border-green-500/30',
    purple: 'bg-purple-500/20 border-purple-500/30',
    orange: 'bg-orange-500/20 border-orange-500/30',
  }
  
  return (
    <div className={`p-4 rounded-xl border ${colors[color]} bg-opacity-10`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {trend && <p className="text-xs text-green-400 mt-1">{trend}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

function StatusCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-600',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  }
  
  return (
    <div className="text-center p-4 bg-gray-700/50 rounded-xl">
      <div className={`w-12 h-12 rounded-full ${colors[color]} mx-auto mb-2 flex items-center justify-center`}>
        <span className="text-white font-bold">{value}</span>
      </div>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}