'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'

interface AgentBudget {
  agent_id: string
  agent_name: string
  department: string
  role: string
  monthly_budget: number
  spent: number
  status: 'active' | 'warning' | 'paused'
}

interface DepartmentBudget {
  department: string
  total_budget: number
  total_spent: number
  agent_count: number
}

export default function BudgetPage() {
  const [agentBudgets, setAgentBudgets] = useState<AgentBudget[]>([])
  const [departmentBudgets, setDepartmentBudgets] = useState<DepartmentBudget[]>([])
  const [totalBudget, setTotalBudget] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [editBudget, setEditBudget] = useState(0)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [agentsRes, statsRes] = await Promise.all([
        fetch('http://localhost:8888/api/company/agents'),
        fetch('http://localhost:8888/api/company/stats')
      ])
      
      const agentsData = await agentsRes.json()
      const statsData = await statsRes.json()
      
      const mockBudgets: AgentBudget[] = (agentsData.agents || []).map((agent: any, idx: number) => {
        const budget = 50 + Math.floor(Math.random() * 150)
        const spent = Math.floor(Math.random() * budget * 0.8)
        return {
          agent_id: agent.id,
          agent_name: agent.name,
          department: agent.department,
          role: agent.role,
          monthly_budget: budget,
          spent: spent,
          status: spent / budget > 0.8 ? (spent / budget >= 1 ? 'paused' : 'warning') : 'active'
        }
      })
      
      setAgentBudgets(mockBudgets)
      
      const deptMap = new Map<string, DepartmentBudget>()
      mockBudgets.forEach(agent => {
        const existing = deptMap.get(agent.department) || {
          department: agent.department,
          total_budget: 0,
          total_spent: 0,
          agent_count: 0
        }
        existing.total_budget += agent.monthly_budget
        existing.total_spent += agent.spent
        existing.agent_count += 1
        deptMap.set(agent.department, existing)
      })
      setDepartmentBudgets(Array.from(deptMap.values()))
      
      const total = mockBudgets.reduce((sum, a) => sum + a.monthly_budget, 0)
      const spent = mockBudgets.reduce((sum, a) => sum + a.spent, 0)
      setTotalBudget(total)
      setTotalSpent(spent)
      
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveBudget = async (agentId: string) => {
    try {
      await fetch(`http://localhost:8888/api/company/agents/${agentId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_budget: editBudget })
      })
      setEditingAgent(null)
      fetchData()
    } catch (err) {
      console.error('Failed to update budget:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e'
      case 'warning': return '#f59e0b'
      case 'paused': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Running'
      case 'warning': return 'Warning'
      case 'paused': return 'Paused'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Loading budgets...</div>
      </div>
    )
  }

  const spentPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Budget</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Track agent spending and budget limits</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <div className="text-sm mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Monthly Budget</div>
          <div className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>${totalBudget}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Spent</div>
          <div className="text-3xl font-bold" style={{ color: '#22c55e' }}>${totalSpent}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Remaining</div>
          <div className="text-3xl font-bold" style={{ color: spentPercent > 80 ? '#ef4444' : '#3b82f6' }}>
            ${totalBudget - totalSpent}
          </div>
          <div className="mt-2 h-2 rounded-full" style={{ background: isDark ? '#374151' : '#e5e7eb' }}>
            <div 
              className="h-2 rounded-full transition-all"
              style={{ 
                width: `${spentPercent}%`,
                background: spentPercent > 80 ? '#ef4444' : '#22c55e'
              }}
            />
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Department Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departmentBudgets.map(dept => {
            const percent = (dept.total_spent / dept.total_budget) * 100
            return (
              <div key={dept.department} className="p-4 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{dept.department}</h3>
                  <span className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{dept.agent_count} agents</span>
                </div>
                <div className="flex justify-between text-sm mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  <span>${dept.total_spent} / ${dept.total_budget}</span>
                  <span>{percent.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: isDark ? '#374151' : '#e5e7eb' }}>
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      width: `${percent}%`,
                      background: percent > 80 ? '#ef4444' : percent > 50 ? '#f59e0b' : '#22c55e'
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Agent Budgets</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}>
                <th className="text-left py-3 px-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Agent</th>
                <th className="text-left py-3 px-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Department</th>
                <th className="text-left py-3 px-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Budget</th>
                <th className="text-left py-3 px-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Spent</th>
                <th className="text-left py-3 px-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Usage</th>
                <th className="text-left py-3 px-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Status</th>
                <th className="text-left py-3 px-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {agentBudgets.map(agent => {
                const percent = (agent.spent / agent.monthly_budget) * 100
                return (
                  <tr key={agent.agent_id} style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#f3f4f6'}` }}>
                    <td className="py-3 px-4">
                      <div className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{agent.agent_name}</div>
                      <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{agent.role}</div>
                    </td>
                    <td className="py-3 px-4" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>{agent.department}</td>
                    <td className="py-3 px-4">
                      {editingAgent === agent.agent_id ? (
                        <div className="flex items-center gap-2">
                          <span>$</span>
                          <input
                            type="number"
                            value={editBudget}
                            onChange={e => setEditBudget(Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded"
                            style={{ background: isDark ? '#1f2937' : '#fff', color: isDark ? '#fff' : '#111827' }}
                          />
                        </div>
                      ) : (
                        <span style={{ color: isDark ? '#fff' : '#111827' }}>${agent.monthly_budget}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span style={{ color: '#22c55e' }}>${agent.spent}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full" style={{ background: isDark ? '#374151' : '#e5e7eb' }}>
                          <div 
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${Math.min(percent, 100)}%`,
                              background: percent > 80 ? '#ef4444' : '#22c55e'
                            }}
                          />
                        </div>
                        <span className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{percent.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span 
                        className="px-2 py-1 rounded text-xs"
                        style={{ 
                          background: `${getStatusColor(agent.status)}20`,
                          color: getStatusColor(agent.status)
                        }}
                      >
                        {getStatusText(agent.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {editingAgent === agent.agent_id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveBudget(agent.agent_id)}
                            className="text-sm px-2 py-1 rounded"
                            style={{ background: '#22c55e', color: 'white' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAgent(null)}
                            className="text-sm px-2 py-1 rounded"
                            style={{ background: isDark ? '#374151' : '#f3f4f6', color: isDark ? '#d1d5db' : '#4b5563' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingAgent(agent.agent_id); setEditBudget(agent.monthly_budget) }}
                          className="text-sm px-2 py-1 rounded"
                          style={{ background: isDark ? '#374151' : '#f3f4f6', color: isDark ? '#d1d5db' : '#4b5563' }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}