'use client'
import { useState, useEffect } from 'react'
import { COMPANY_API } from '../lib/api'

interface Department {
  id: string
  name: string
  type: string
  agent_count: number
}

interface Agent {
  id: string
  name: string
  role: string
  department: string
  status: string
}

const DEPARTMENTS = [
  { type: 'sales', name: 'Sales', icon: '💰', desc: 'Customer acquisition and sales' },
  { type: 'engineering', name: 'Engineering', icon: '💻', desc: 'Software development' },
  { type: 'marketing', name: 'Marketing', icon: '📢', desc: 'Brand and engagement' },
  { type: 'finance', name: 'Finance', icon: '💵', desc: 'Financial planning' },
  { type: 'operations', name: 'Operations', icon: '⚙️', desc: 'Day-to-day operations' },
  { type: 'product', name: 'Product', icon: '🎨', desc: 'Design and UX' },
  { type: 'support', name: 'Support', icon: '🎧', desc: 'Customer support' },
  { type: 'hr', name: 'HR', icon: '👥', desc: 'Recruitment and employee' },
  { type: 'legal', name: 'Legal', icon: '⚖️', desc: 'Legal and compliance' },
  { type: 'customer_service', name: 'Customer Service', icon: '📞', desc: 'Customer service' },
]

const SKILLS = [
  'coding', 'design', 'communication', 'analysis', 'leadership',
  'marketing', 'sales', 'finance', 'support', 'research'
]

export default function HRPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedDept, setSelectedDept] = useState<string>('engineering')
  const [newAgent, setNewAgent] = useState({ name: '', role: '', department: 'engineering', skills: [] as string[] })
  const [agentToRemove, setAgentToRemove] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [deptData, agentsData] = await Promise.all([
        COMPANY_API.departments(),
        COMPANY_API.agents()
      ])
      setDepartments((deptData as any).departments || [])
      setAgents((agentsData as any).agents || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const addAgent = async () => {
    if (!newAgent.name || !newAgent.role) return
    try {
      await COMPANY_API.addAgent(newAgent)
      setShowAddModal(false)
      setNewAgent({ name: '', role: '', department: 'engineering', skills: [] })
      fetchData()
    } catch (err) {
      console.error('Failed to add agent:', err)
    }
  }

  const removeAgent = async () => {
    if (!agentToRemove) return
    try {
      await COMPANY_API.removeAgent(agentToRemove.id)
      setShowRemoveModal(false)
      setAgentToRemove(null)
      fetchData()
    } catch (err) {
      console.error('Failed to remove agent:', err)
    }
  }

  const moveAgent = async (agentId: string, newDept: string) => {
    try {
      await COMPANY_API.moveAgent(agentId, newDept)
      fetchData()
    } catch (err) {
      console.error('Failed to move agent:', err)
    }
  }

  const getDeptAgentCount = (deptType: string) => {
    const dept = departments.find(d => d.type === deptType)
    return dept?.agent_count || 0
  }

  const getDeptAgents = (deptType: string) => {
    return agents.filter(a => a.department === deptType)
  }

  const toggleSkill = (skill: string) => {
    setNewAgent(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }))
  }

  if (loading) return <div className="text-white">Loading HR...</div>

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">HR Management</h1>
          <p className="text-gray-400">Add, remove, and manage agents</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
        >
          + Add Agent
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEPARTMENTS.map(dept => {
          const deptAgents = getDeptAgents(dept.type)
          return (
            <div key={dept.type} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{dept.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white">{dept.name}</h3>
                    <p className="text-xs text-gray-400">{dept.desc}</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-gray-700 rounded text-sm text-gray-300">
                  {getDeptAgentCount(dept.type)}
                </span>
              </div>

              <div className="space-y-2">
                {deptAgents.slice(0, 3).map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                    <div>
                      <p className="text-sm text-white">{agent.name}</p>
                      <p className="text-xs text-gray-400">{agent.role}</p>
                    </div>
                    <div className="flex gap-1">
                      <select
                        onChange={e => moveAgent(agent.id, e.target.value)}
                        value={agent.department}
                        className="bg-gray-600 text-xs text-gray-300 px-1 py-1 rounded"
                      >
                        {DEPARTMENTS.map(d => (
                          <option key={d.type} value={d.type}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { setAgentToRemove(agent); setShowRemoveModal(true) }}
                        className="text-red-400 hover:text-red-300 text-sm px-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {deptAgents.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">+{deptAgents.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Add New Agent</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Agent name"
                value={newAgent.name}
                onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              />
              <input
                type="text"
                placeholder="Role (e.g., Senior Developer)"
                value={newAgent.role}
                onChange={e => setNewAgent({ ...newAgent, role: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              />
              <select
                value={newAgent.department}
                onChange={e => setNewAgent({ ...newAgent, department: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d.type} value={d.type}>{d.icon} {d.name}</option>
                ))}
              </select>
              <div>
                <p className="text-sm text-gray-400 mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        newAgent.skills.includes(skill)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addAgent}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
                >
                  Add Agent
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRemoveModal && agentToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Remove Agent</h2>
            <p className="text-gray-300 mb-4">
              Are you sure you want to remove <span className="text-white font-semibold">{agentToRemove.name}</span> from {agentToRemove.department}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={removeAgent}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
              >
                Remove
              </button>
              <button
                onClick={() => { setShowRemoveModal(false); setAgentToRemove(null) }}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}