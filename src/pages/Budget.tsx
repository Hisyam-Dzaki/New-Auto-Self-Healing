import { useState, useEffect } from 'react'

interface AgentBudget {
  agent_id: string
  agent_name: string
  department: string
  hourly_rate: number
  monthly_budget: number
  spent: number
  remaining: number
}

const API_BASE = 'http://localhost:8888/api'

export default function Budget() {
  const [budgets, setBudgets] = useState<AgentBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [editValue, setEditValue] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchBudgets()
    const interval = setInterval(fetchBudgets, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchBudgets = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/budgets`)
      const data = await res.json()
      setBudgets(data.budgets || [])
    } catch (err) {
      console.error('Failed to fetch budgets:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateBudget = async (agentId: string) => {
    try {
      await fetch(`${API_BASE}/company/budgets/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_budget: editValue })
      })
      setEditingBudget(null)
      fetchBudgets()
    } catch (err) {
      console.error('Failed to update budget:', err)
    }
  }

  const isDark = theme === 'dark'

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_budget, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalRemaining = totalBudget - totalSpent

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
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Agent Budget</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Track and manage agent budgets</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Budget</div>
          <div className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>${totalBudget.toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Spent</div>
          <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>${totalSpent.toLocaleString()}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Remaining</div>
          <div className="text-2xl font-bold" style={{ color: totalRemaining > 0 ? '#22c55e' : '#ef4444' }}>${totalRemaining.toLocaleString()}</div>
        </div>
      </div>

      <div className="space-y-4">
        {budgets.map(budget => {
          const percentage = budget.monthly_budget > 0 ? (budget.spent / budget.monthly_budget) * 100 : 0
          const barColor = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#22c55e'
          
          return (
            <div key={budget.agent_id} className="glass-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{budget.agent_name}</h3>
                  <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{budget.department} • ${budget.hourly_rate}/hr</p>
                </div>
                <div className="text-right">
                  {editingBudget === budget.agent_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(parseInt(e.target.value) || 0)}
                        className="w-24 px-2 py-1 rounded border text-right"
                        style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
                      />
                      <button onClick={() => updateBudget(budget.agent_id)} className="text-green-500 hover:text-green-600">Save</button>
                      <button onClick={() => setEditingBudget(null)} className="text-gray-500">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingBudget(budget.agent_id); setEditValue(budget.monthly_budget) }}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>${budget.spent.toLocaleString()} spent</span>
                  <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>${budget.remaining.toLocaleString()} remaining</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: isDark ? '#1f2937' : '#e5e7eb' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%`, background: barColor }}
                  />
                </div>
                <div className="text-xs mt-1 text-right" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  ${budget.monthly_budget.toLocaleString()} budget ({percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No budget data available</p>
        </div>
      )}
    </div>
  )
}