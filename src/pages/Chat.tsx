import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'agent'
  content: string
  agent_name?: string
  timestamp: string
}

interface Agent {
  id: string
  name: string
  department: string
}

const API_BASE = 'http://localhost:8888/api'

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState('dark')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchAgents()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/agents`)
      const data = await res.json()
      setAgents(data.agents || [])
      if (data.agents?.length > 0) {
        setSelectedAgent(data.agents[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          agent_id: selectedAgent,
          history: messages.slice(-10)
        })
      })
      const data = await res.json()
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No response',
        agent_name: agents.find(a => a.id === selectedAgent)?.name || 'Agent',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, agentMessage])
    } catch (err) {
      console.error('Failed to send message:', err)
    }
    setLoading(false)
  }

  const isDark = theme === 'dark'

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Chat</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Talk to your AI agents</p>
      </header>

      <div className="flex gap-2 mb-4">
        <select
          value={selectedAgent}
          onChange={e => setSelectedAgent(e.target.value)}
          className="px-4 py-2 rounded-lg border"
          style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
        >
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>{agent.name} ({agent.department})</option>
          ))}
        </select>
        <button
          onClick={() => setMessages([])}
          className="px-4 py-2 rounded-lg"
          style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}
        >
          Clear Chat
        </button>
      </div>

      <div className="glass-card h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-500 text-white' : ''
              }`} style={{
                background: msg.role === 'user' ? '#3b82f6' : isDark ? '#1f2937' : '#f3f4f6',
                color: msg.role === 'user' ? '#fff' : isDark ? '#fff' : '#111827'
              }}>
                {msg.role !== 'user' && (
                  <div className="text-xs font-semibold mb-1" style={{ color: '#3b82f6' }}>
                    {msg.agent_name || 'Assistant'}
                  </div>
                )}
                <div>{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280' }}>
                Thinking...
              </div>
            </div>
          )}
          {messages.length === 0 && (
            <div className="text-center py-8" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              Select an agent and start chatting
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 rounded-lg border"
              style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}