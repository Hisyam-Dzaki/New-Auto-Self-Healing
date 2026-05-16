'use client'
import { useState, useEffect, useRef } from 'react'
import { COMPANY_API } from '../lib/api'

interface Agent {
  id: string
  name: string
  department: string
}

interface Message {
  id: string
  from: string
  to: string
  content: string
  timestamp: string
}

export default function ChatPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    if (selectedAgent) {
      fetchMessages(selectedAgent.id)
    }
  }, [selectedAgent])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchAgents = async () => {
    try {
      const data = await COMPANY_API.agents()
      const agentList = (data as any).agents || []
      setAgents(agentList)
      if (agentList.length > 0 && !selectedAgent) {
        setSelectedAgent(agentList[0])
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    }
  }

  const fetchMessages = async (agentId: string) => {
    setMessages([
      { id: '1', from: 'system', to: agentId, content: 'Chat started', timestamp: new Date().toISOString() }
    ])
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedAgent) return
    const msg: Message = {
      id: Date.now().toString(),
      from: 'boss',
      to: selectedAgent.id,
      content: newMessage,
      timestamp: new Date().toISOString()
    }
    setMessages([...messages, msg])
    setNewMessage('')
  }

  const sendBroadcast = () => {
    if (!broadcastMessage.trim()) return
    const newMessages = agents.map(agent => ({
      id: Date.now().toString() + agent.id,
      from: 'boss',
      to: agent.id,
      content: `[BROADCAST] ${broadcastMessage}`,
      timestamp: new Date().toISOString()
    }))
    setMessages([...messages, ...newMessages])
    setBroadcastMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Chat</h1>
        <p className="text-gray-400">Communicate with agents</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Agents</h2>
          <div className="space-y-2">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedAgent?.id === agent.id
                    ? 'bg-blue-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  👤
                </div>
                <div className="text-left">
                  <p className="text-white text-sm">{agent.name}</p>
                  <p className="text-gray-400 text-xs capitalize">{agent.department.replace('_', ' ')}</p>
                </div>
              </button>
            ))}
            {agents.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No agents available</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              {selectedAgent ? `Chat with ${selectedAgent.name}` : 'Select an agent'}
            </h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.from === 'boss' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-3 rounded-lg ${
                  msg.from === 'boss'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
                disabled={!selectedAgent}
              />
              <button
                onClick={sendMessage}
                disabled={!selectedAgent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">📢 Broadcast</h2>
          <p className="text-sm text-gray-400 mb-4">Send message to all agents</p>
          <textarea
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
            placeholder="Broadcast message..."
            className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 h-32 resize-none"
          />
          <button
            onClick={sendBroadcast}
            disabled={!broadcastMessage.trim()}
            className="w-full mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50"
          >
            Broadcast to All
          </button>
        </div>
      </div>
    </div>
  )
}