'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'

interface LLMProvider {
  id: string
  name: string
  icon?: string
  type: 'primary' | 'secondary'
  endpoint: string
  api_key: string
  model: string
  status: 'active' | 'inactive' | 'error'
}

const DEFAULT_PROVIDERS = [
  { id: '9router', name: '9Router', icon: '🌐', type: 'primary', endpoint: 'https://9router.io/api', model: 'default' },
  { id: 'ollama', name: 'Ollama', icon: '💻', type: 'secondary', endpoint: 'http://localhost:11434', model: 'llama2' },
  { id: 'openai', name: 'OpenAI', icon: '🔵', type: 'secondary', endpoint: 'https://api.openai.com/v1', model: 'gpt-4' },
  { id: 'anthropic', name: 'Anthropic', icon: '🟣', type: 'secondary', endpoint: 'https://api.anthropic.com', model: 'claude-3' },
  { id: 'gemini', name: 'Gemini', icon: '🟡', type: 'secondary', endpoint: 'https://generativelanguage.googleapis.com/v1', model: 'gemini-pro' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔷', type: 'secondary', endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'groq', name: 'Groq', icon: '⚡', type: 'secondary', endpoint: 'https://api.groq.com/openai/v1', model: 'llama-3' },
  { id: 'lmstudio', name: 'LM Studio', icon: '🏠', type: 'secondary', endpoint: 'http://localhost:1234/v1', model: 'local' },
]

export default function SettingsPage() {
  const [providers, setProviders] = useState<LLMProvider[]>(DEFAULT_PROVIDERS as any)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null)
  const [newProvider, setNewProvider] = useState({ name: '', endpoint: '', api_key: '', model: '', type: 'secondary' as 'primary' | 'secondary' })
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const primaryProvider = providers.find(p => p.type === 'primary')
  const secondaryProviders = providers.filter(p => p.type === 'secondary')

  const setPrimary = (id: string) => {
    setProviders(prev => prev.map(p => ({
      ...p,
      type: p.id === id ? 'primary' : p.type === 'primary' ? 'secondary' : p.type
    })))
  }

  const toggleProvider = (id: string) => {
    setProviders(prev => prev.map(p => 
      p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
    ))
  }

  const deleteProvider = (id: string) => {
    setProviders(prev => prev.filter(p => p.id !== id))
  }

  const openEdit = (provider: LLMProvider) => {
    setEditingProvider(provider)
    setNewProvider({
      name: provider.name,
      endpoint: provider.endpoint,
      api_key: provider.api_key,
      model: provider.model,
      type: provider.type
    })
  }

  const saveProvider = () => {
    if (editingProvider) {
      setProviders(prev => prev.map(p => 
        p.id === editingProvider.id ? { ...p, ...newProvider } : p
      ))
      setEditingProvider(null)
    } else {
      const id = newProvider.name.toLowerCase().replace(/\s+/g, '-')
      setProviders(prev => [...prev, { id, ...newProvider, status: 'inactive' }])
      setShowAddModal(false)
    }
    setNewProvider({ name: '', endpoint: '', api_key: '', model: '', type: 'secondary' })
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Settings</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Configure your AgentForge instance</p>
      </header>

      {/* Primary Provider */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>
            🔴 Primary LLM Provider
          </h2>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-lg" style={{ background: isDark ? '#374151' : '#f3f4f6' }}>
          <span className="text-3xl">{primaryProvider?.icon || '🌐'}</span>
          <div className="flex-1">
            <p className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{primaryProvider?.name || '9Router'}</p>
            <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{primaryProvider?.endpoint}</p>
          </div>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm">Active</span>
        </div>
        <p className="text-sm mt-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          Primary provider will be used for all AI tasks. This is the main LLM for your agents.
        </p>
      </div>

      {/* Secondary Providers */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>
            🔵 Secondary LLM Providers (Backup)
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1 rounded-lg text-sm"
            style={{ background: '#3b82f6', color: 'white' }}
          >
            + Add Provider
          </button>
        </div>
        <div className="space-y-3">
          {secondaryProviders.map(provider => (
            <div key={provider.id} className="flex items-center gap-4 p-4 rounded-lg" style={{ background: isDark ? '#374151' : '#f3f4f6' }}>
              <span className="text-2xl">{provider.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{provider.name}</p>
                  <button 
                    onClick={() => setPrimary(provider.id)}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: isDark ? '#1f2937' : '#e5e7eb', color: isDark ? '#9ca3af' : '#6b7280' }}
                  >
                    Set as Primary
                  </button>
                </div>
                <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{provider.endpoint}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openEdit(provider)}
                  className="p-2 rounded"
                  style={{ background: isDark ? '#1f2937' : '#e5e7eb' }}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => deleteProvider(provider.id)}
                  className="p-2 rounded"
                  style={{ background: isDark ? '#1f2937' : '#e5e7eb', color: '#ef4444' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm mt-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          Secondary providers serve as backup when primary is unavailable.
        </p>
      </div>

      {/* Company Info */}
      <div className="glass-card">
        <h2 className="text-lg font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Company Info</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm mb-2 block" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Company Name</label>
            <input
              type="text"
              defaultValue="AgentForge Inc."
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm mb-2 block" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Auto-save Interval</label>
            <select className="input-field">
              <option>5 seconds</option>
              <option>10 seconds</option>
              <option>30 seconds</option>
              <option>1 minute</option>
            </select>
          </div>
          <button className="btn-primary">Save Settings</button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingProvider) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-xl font-bold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>
              {editingProvider ? 'Edit Provider' : 'Add Provider'}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Provider name"
                value={newProvider.name}
                onChange={e => setNewProvider({ ...newProvider, name: e.target.value })}
                className="input-field"
              />
              <input
                type="text"
                placeholder="API Endpoint"
                value={newProvider.endpoint}
                onChange={e => setNewProvider({ ...newProvider, endpoint: e.target.value })}
                className="input-field"
              />
              <input
                type="password"
                placeholder="API Key"
                value={newProvider.api_key}
                onChange={e => setNewProvider({ ...newProvider, api_key: e.target.value })}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Model name"
                value={newProvider.model}
                onChange={e => setNewProvider({ ...newProvider, model: e.target.value })}
                className="input-field"
              />
              <select
                value={newProvider.type}
                onChange={e => setNewProvider({ ...newProvider, type: e.target.value as 'primary' | 'secondary' })}
                className="input-field"
              >
                <option value="secondary">Secondary (Backup)</option>
                <option value="primary">Primary</option>
              </select>
              <div className="flex gap-2">
                <button onClick={saveProvider} className="btn-primary flex-1">Save</button>
                <button 
                  onClick={() => { setShowAddModal(false); setEditingProvider(null); setNewProvider({ name: '', endpoint: '', api_key: '', model: '', type: 'secondary' }) }} 
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}