import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  department: string
  status: string
  behavior: string
}

interface OfficeRoom {
  id: string
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

interface AgentSprite {
  id: string
  name: string
  x: number
  y: number
  targetX: number
  targetY: number
  department: string
  behavior: string
  currentRoom: string
}

const API_BASE = 'http://localhost:8888/api'

const ROOMS: OfficeRoom[] = [
  { id: 'reception', name: 'Reception', type: 'reception', x: 2, y: 8, width: 2, height: 2, color: '#f59e0b' },
  { id: 'ceo', name: 'CEO Office', type: 'ceo', x: 0, y: 0, width: 2, height: 2, color: '#8b5cf6' },
  { id: 'meeting1', name: 'Meeting Room A', type: 'meeting', x: 3, y: 0, width: 2, height: 2, color: '#3b82f6' },
  { id: 'meeting2', name: 'Meeting Room B', type: 'meeting', x: 6, y: 0, width: 2, height: 2, color: '#06b6d4' },
  { id: 'lounge', name: 'Lounge', type: 'lounge', x: 9, y: 2, width: 2, height: 2, color: '#10b981' },
  { id: 'kitchen', name: 'Kitchen', type: 'kitchen', x: 9, y: 5, width: 2, height: 1, color: '#f97316' },
  { id: 'server', name: 'Server Room', type: 'server', x: 0, y: 3, width: 1, height: 2, color: '#ef4444' },
  { id: 'storage', name: 'Storage', type: 'storage', x: 0, y: 6, width: 1, height: 2, color: '#6b7280' },
  { id: 'eng1', name: 'Engineering Desk 1', type: 'desk', x: 2, y: 3, width: 2, height: 1, color: '#3b82f6' },
  { id: 'eng2', name: 'Engineering Desk 2', type: 'desk', x: 5, y: 3, width: 2, height: 1, color: '#3b82f6' },
  { id: 'sales1', name: 'Sales Desk 1', type: 'desk', x: 2, y: 5, width: 2, height: 1, color: '#22c55e' },
  { id: 'sales2', name: 'Sales Desk 2', type: 'desk', x: 5, y: 5, width: 2, height: 1, color: '#22c55e' },
  { id: 'marketing', name: 'Marketing Desk', type: 'desk', x: 2, y: 7, width: 2, height: 1, color: '#f59e0b' },
  { id: 'finance', name: 'Finance Desk', type: 'desk', x: 5, y: 7, width: 2, height: 1, color: '#8b5cf6' },
  { id: 'hr', name: 'HR Desk', type: 'desk', x: 8, y: 8, width: 2, height: 1, color: '#ec4899' },
  { id: 'parking', name: 'Parking', type: 'parking', x: 11, y: 7, width: 1, height: 3, color: '#374151' },
]

const DEPARTMENT_ROOM_MAP: Record<string, string> = {
  engineering: 'eng1',
  sales: 'sales1',
  marketing: 'marketing',
  finance: 'finance',
  operations: 'eng2',
  product: 'eng2',
  support: 'sales2',
  hr: 'hr',
  legal: 'hr',
  customer_service: 'sales2',
}

const STATUS_COLORS: Record<string, string> = {
  idle: '#6b7280',
  working: '#3b82f6',
  thinking: '#8b5cf6',
  meeting: '#f59e0b',
  break: '#10b981',
  traveling: '#06b6d4',
  error: '#ef4444',
  success: '#22c55e',
}

function getStatusRoom(behavior: string): string {
  if (['meeting', 'communicating'].includes(behavior)) return 'meeting1'
  if (['break', 'idle'].includes(behavior)) return 'lounge'
  return 'eng1'
}

export default function Office() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [sprites, setSprites] = useState<AgentSprite[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)
  const [time, setTime] = useState(0)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchAgents()
    const interval = setInterval(() => {
      setTime(t => t + 1)
      fetchAgents()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (agents.length > 0) {
      updateSprites()
    }
  }, [agents, time])

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/agents`)
      const data = await res.json()
      setAgents(data.agents || [])
    } catch (err) {
      console.error('Failed to fetch agents:', err)
      setAgents([])
    }
  }

  const updateSprites = () => {
    setSprites(prev => {
      const newSprites = agents.map(agent => {
        const existing = prev.find(s => s.id === agent.id)
        const deptRoom = DEPARTMENT_ROOM_MAP[agent.department] || 'eng1'
        const targetRoomId = getStatusRoom(agent.behavior)
        const targetRoom = ROOMS.find(r => r.id === targetRoomId) || ROOMS.find(r => r.id === deptRoom) || ROOMS[0]
        
        let targetX = targetRoom.x + targetRoom.width / 2
        let targetY = targetRoom.y + targetRoom.height / 2
        
        const roomAgents = agents.filter(a => a.department === agent.department)
        const agentIndex = roomAgents.findIndex(a => a.id === agent.id)
        targetX += (agentIndex % 3) * 0.3
        targetY += Math.floor(agentIndex / 3) * 0.2
        
        if (existing) {
          return {
            ...existing,
            targetX,
            targetY,
            behavior: agent.behavior,
            currentRoom: targetRoomId,
          }
        }
        
        return {
          id: agent.id,
          name: agent.name,
          x: targetX,
          y: targetY,
          targetX,
          targetY,
          department: agent.department,
          behavior: agent.behavior,
          currentRoom: targetRoomId,
        }
      })
      
      return newSprites.map(sprite => {
        const dx = sprite.targetX - sprite.x
        const dy = sprite.targetY - sprite.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > 0.05) {
          return {
            ...sprite,
            x: sprite.x + dx * 0.03,
            y: sprite.y + dy * 0.03,
          }
        }
        return sprite
      })
    })
  }

  const toIsometric = (x: number, y: number) => {
    const isoX = (x - y) * 40 + 300
    const isoY = (x + y) * 25 + 80
    return { x: isoX, y: isoY }
  }

  const getRoomCoords = (room: OfficeRoom) => {
    const topLeft = toIsometric(room.x, room.y)
    const topRight = toIsometric(room.x + room.width, room.y)
    const bottomLeft = toIsometric(room.x, room.y + room.height)
    const bottomRight = toIsometric(room.x + room.width, room.y + room.height)
    return { topLeft, topRight, bottomLeft, bottomRight }
  }

  const getAgentPosition = (sprite: AgentSprite) => {
    return toIsometric(sprite.x, sprite.y)
  }

  const isDark = theme === 'dark'

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Office</h1>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Isometric office visualization</p>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-500" /> Idle</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> Working</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Meeting</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-4">
          <div 
            className="relative rounded-xl overflow-hidden"
            style={{ 
              background: isDark 
                ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
              minHeight: '500px',
            }}
          >
            <svg viewBox="0 0 800 500" className="w-full h-full" style={{ minHeight: '500px' }}>
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
                </filter>
              </defs>

              {ROOMS.map(room => {
                const { topLeft, topRight, bottomLeft, bottomRight } = getRoomCoords(room)
                const isHovered = hoveredRoom === room.id
                const roomAgents = sprites.filter(s => s.currentRoom === room.id)
                
                return (
                  <g 
                    key={room.id}
                    onMouseEnter={() => setHoveredRoom(room.id)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <polygon
                      points={`${bottomLeft.x},${bottomLeft.y} ${bottomRight.x},${bottomRight.y} ${topRight.x},${topRight.y} ${topLeft.x},${topLeft.y}`}
                      fill={room.color}
                      fillOpacity={isHovered ? 0.4 : 0.25}
                      stroke={isHovered ? room.color : 'rgba(255,255,255,0.1)'}
                      strokeWidth={isHovered ? 2 : 1}
                      filter="url(#shadow)"
                    />
                    <text
                      x={(topLeft.x + bottomRight.x) / 2}
                      y={(topLeft.y + bottomRight.y) / 2 + 5}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {room.name}
                    </text>
                  </g>
                )
              })}
              
              {sprites.map(sprite => {
                const pos = getAgentPosition(sprite)
                const color = STATUS_COLORS[sprite.behavior] || '#6b7280'
                const isSelected = selectedAgent === sprite.id
                
                return (
                  <g 
                    key={sprite.id}
                    onClick={() => setSelectedAgent(isSelected ? null : sprite.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={pos.x} cy={pos.y} r={isSelected ? 18 : 14} fill={color} fillOpacity={0.3} />
                    <circle cx={pos.x} cy={pos.y} r={12} fill={color} stroke="white" strokeWidth={isSelected ? 3 : 2} filter="url(#shadow)" />
                    <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">🤖</text>
                  </g>
                )
              })}
              
              <text x="400" y="480" textAnchor="middle" fill={isDark ? '#6b7280' : '#9ca3af'} fontSize="12">
                {agents.length} Agents Online
              </text>
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card">
            <h3 className="font-semibold mb-3" style={{ color: isDark ? '#fff' : '#111827' }}>Rooms</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ROOMS.map(room => {
                const roomAgents = sprites.filter(s => s.currentRoom === room.id)
                return (
                  <div key={room.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ background: room.color }} />
                      <span className="text-sm" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>{room.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{roomAgents.length}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="glass-card">
            <h3 className="font-semibold mb-3" style={{ color: isDark ? '#fff' : '#111827' }}>Agents ({agents.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agents.map(agent => {
                const color = STATUS_COLORS[agent.behavior] || '#6b7280'
                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                      selectedAgent === agent.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: isDark ? '#fff' : '#111827' }}>{agent.name}</p>
                      <p className="text-xs truncate" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{agent.department}</p>
                    </div>
                  </button>
                )
              })}
              {agents.length === 0 && (
                <p className="text-center py-4 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No agents</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}