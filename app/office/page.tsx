'use client'
import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  department: string
  status: string
  behavior: string
}

interface Department {
  id: string
  name: string
  type: string
  agents: Agent[]
}

const BEHAVIOR_COLORS: Record<string, string> = {
  idle: '#6b7280',
  working: '#3b82f6',
  thinking: '#8b5cf6',
  meeting: '#f59e0b',
  break: '#10b981',
  traveling: '#06b6d4',
  error: '#ef4444',
  success: '#22c55e',
  waiting: '#64748b',
  researching: '#ec4899',
  debugging: '#f97316',
  planning: '#6366f1',
  communicating: '#14b8a6',
  analyzing: '#a855f7',
  creating: '#f43f5e',
  reviewing: '#0ea5e9',
  testing: '#84cc16',
  deploying: '#eab308',
}

const DEPARTMENT_POSITIONS: Record<string, { x: number; y: number }> = {
  engineering: { x: 2, y: 2 },
  sales: { x: 8, y: 2 },
  marketing: { x: 2, y: 6 },
  finance: { x: 8, y: 6 },
  operations: { x: 5, y: 4 },
  product: { x: 2, y: 10 },
  support: { x: 8, y: 10 },
  hr: { x: 5, y: 8 },
  legal: { x: 5, y: 10 },
  customer_service: { x: 5, y: 12 },
}

export default function Office() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [theme, setTheme] = useState('dark')
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    fetchDepartments()
    const interval = setInterval(() => {
      setTime(t => t + 1)
      fetchDepartments()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/company/departments')
      const data = await res.json()
      setDepartments(data.departments)
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const gridSize = 12
  
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Pixel Office</h1>
          <p className="text-gray-400">Real-time agent visualization</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-3 h-3 rounded-full bg-gray-500" /> Idle
            <div className="w-3 h-3 rounded-full bg-blue-500" /> Working
            <div className="w-3 h-3 rounded-full bg-purple-500" /> Thinking
            <div className="w-3 h-3 rounded-full bg-yellow-500" /> Meeting
            <div className="w-3 h-3 rounded-full bg-red-500" /> Error
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 overflow-hidden">
            <div 
              className="relative"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                gap: '4px',
                aspectRatio: '16/10',
              }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                const x = i % gridSize
                const y = Math.floor(i / gridSize)
                const dept = Object.entries(DEPARTMENT_POSITIONS).find(([_, pos]) => pos.x === x && pos.y === y)
                
                return (
                  <div
                    key={i}
                    className={`
                      rounded-lg border transition-all duration-300
                      ${dept ? 'border-2' : 'border border-gray-700'}
                    `}
                    style={{
                      backgroundColor: dept 
                        ? getDepartmentColor(dept[0], theme)
                        : (x + y) % 2 === 0 ? '#1f2937' : '#111827',
                    }}
                  >
                    {dept && (
                      <DepartmentCell 
                        deptType={dept[0]} 
                        deptName={getDeptName(dept[0])}
                        agents={departments.find(d => d.type === dept[0])?.agents || []}
                        selected={selectedDept === dept[0]}
                        onClick={() => setSelectedDept(selectedDept === dept[0] ? null : dept[0])}
                        time={time}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold text-white mb-3">Departments</h3>
            <div className="space-y-2">
              {departments.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(selectedDept === dept.type ? null : dept.type)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                    selectedDept === dept.type ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-white text-sm">{dept.name}</span>
                  <span className="text-gray-400 text-xs">{dept.agent_count} agents</span>
                </button>
              ))}
            </div>
          </div>

          {selectedDept && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h3 className="font-semibold text-white mb-3">
                {getDeptName(selectedDept)} Agents
              </h3>
              <div className="space-y-2">
                {departments.find(d => d.type === selectedDept)?.agents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-2 p-2 bg-gray-700 rounded-lg">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: BEHAVIOR_COLORS[agent.behavior] || '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{agent.name}</p>
                      <p className="text-gray-400 text-xs">{agent.behavior}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DepartmentCell({ 
  deptType, 
  deptName, 
  agents, 
  selected, 
  onClick,
  time 
}: { 
  deptType: string
  deptName: string
  agents: Agent[]
  selected: boolean
  onClick: () => void
  time: number
}) {
  const activeAgents = agents.filter(a => a.status !== 'idle')
  
  return (
    <button
      onClick={onClick}
      className={`w-full h-full p-1 flex flex-col items-center justify-center transition-all ${
        selected ? 'ring-2 ring-white' : ''
      }`}
    >
      <span className="text-xs">{deptName}</span>
      <div className="flex gap-1 mt-1">
        {agents.slice(0, 3).map((agent, i) => (
          <div
            key={agent.id}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: BEHAVIOR_COLORS[agent.behavior] || '#6b7280',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
        {agents.length > 3 && (
          <span className="text-xs text-gray-400">+{agents.length - 3}</span>
        )}
      </div>
    </button>
  )
}

function getDepartmentColor(deptType: string, theme: string): string {
  const colors: Record<string, string> = {
    engineering: '#1e3a5f',
    sales: '#1e3d1e',
    marketing: '#3d1e3d',
    finance: '#3d3d1e',
    operations: '#1e3d3d',
    product: '#3d1e1e',
    support: '#1e2d3d',
    hr: '#2d1e3d',
    legal: '#3d2d1e',
    customer_service: '#1e3d2d',
  }
  return colors[deptType] || '#1f2937'
}

function getDeptName(deptType: string): string {
  const names: Record<string, string> = {
    engineering: 'Engineering',
    sales: 'Sales',
    marketing: 'Marketing',
    finance: 'Finance',
    operations: 'Operations',
    product: 'Product',
    support: 'Support',
    hr: 'HR',
    legal: 'Legal',
    customer_service: 'CS',
  }
  return names[deptType] || deptType
}