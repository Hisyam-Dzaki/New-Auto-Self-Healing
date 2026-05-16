import { useState, useEffect } from 'react'

interface LLMProvider {
  id: string
  name: string
  provider: string
  model: string
  api_key: string
  enabled: boolean
  config: Record<string, string>
}

const API_BASE = 'http://localhost:8888/api'

const DEFAULT_PROVIDERS: LLMProvider[] = [
  { id: '1', name: 'OpenAI', provider: 'openai', model: 'gpt-4', api_key: '', enabled: true, config: {} },
  { id: '2', name: 'Anthropic', provider: 'anthropic', model: 'claude-3-opus', api_key: '', enabled: false, config: {} },
  { id: '3', name: 'Ollama (Local)', provider: 'ollama', model: 'llama2', api_key: '', enabled: true, config: { url: 'http://localhost:11434' } },
  { id: '4', name: 'LM Studio (Local)', provider: 'lmstudio', model: 'llama-2-7b', api_key: '', enabled: false, config: { url: 'http://localhost:1234' } }
]

export default function Settings() {
  const [providers, setProviders] = useState<LLMProvider[]>(DEFAULT_PROVIDERS)
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ model: '', api_key: '', url: '' })
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/providers`)
      if (res.ok) {
        const data = await res.json()
        if (data.providers?.length > 0) setProviders(data.providers)
      }
    } catch (err) {
      console.log('Using default providers')
    }
  }

  const toggleProvider = async (id: string) => {
    setProviders(providers.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const saveProvider = async (id: string) => {
    const provider = providers.find(p => p.id === id)
    if (!provider) return

    setProviders(providers.map(p => 
      p.id === id ? { ...p, model: editForm.model, api_key: editForm.api_key, config: { ...p.config, url: editForm.url } } : p
    ))
    setEditingProvider(null)
  }

  const testProvider = async (id: string) => {
    setTestStatus({ ...testStatus, [id]: 'testing' })
    try {
      await fetch(`${API_BASE}/settings/providers/${id}/test`, { method: 'POST' })
      setTestStatus({ ...testStatus, [id]: 'success' })
    } catch (err) {
      setTestStatus({ ...testStatus, [id]: 'error' })
    }
    setTimeout(() => setTestStatus({ ...testStatus, [id]: 'idle' }), 3000)
  }

  const isDark = theme === 'dark'

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Settings</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Configure LLM providers and application settings</p>
      </header>

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>LLM Providers</h2>
        <div className="space-y-4">
          {providers.map(provider => (
            <div key={provider.id} className="p-4 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={provider.enabled}
                    onChange={() => toggleProvider(provider.id)}
                    className="w-5 h-5"
                  />
                  <h3 className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{provider.name}</h3>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ 
                    background: provider.enabled ? '#22c55e20' : '#6b728020',
                    color: provider.enabled ? '#22c55e' : '#6b7280'
                  }}>
                    {provider.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingProvider(provider.id)
                      setEditForm({ model: provider.model, api_key: provider.api_key, url: provider.config?.url || '' })
                    }}
                    className="px-3 py-1 rounded text-sm"
                    style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => testProvider(provider.id)}
                    disabled={testStatus[provider.id] === 'testing'}
                    className="px-3 py-1 rounded text-sm"
                    style={{ 
                      background: testStatus[provider.id] === 'success' ? '#22c55e' : testStatus[provider.id] === 'error' ? '#ef4444' : isDark ? '#374151' : '#e5e7eb',
                      color: testStatus[provider.id] === 'success' || testStatus[provider.id] === 'error' ? '#fff' : isDark ? '#fff' : '#111827'
                    }}
                  >
                    {testStatus[provider.id] === 'testing' ? 'Testing...' : testStatus[provider.id] === 'success' ? '✓' : testStatus[provider.id] === 'error' ? '✗' : 'Test'}
                  </button>
                </div>
              </div>

              {editingProvider === provider.id ? (
                <div className="space-y-3 pl-8">
                  <input
                    type="text"
                    placeholder="Model"
                    value={editForm.model}
                    onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ background: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
                  />
                  <input
                    type="password"
                    placeholder="API Key (leave empty to keep current)"
                    value={editForm.api_key}
                    onChange={e => setEditForm({ ...editForm, api_key: e.target.value })}
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ background: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
                  />
                  {provider.config?.url && (
                    <input
                      type="text"
                      placeholder="URL"
                      value={editForm.url}
                      onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ background: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
                    />
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => saveProvider(provider.id)} className="px-3 py-1 rounded bg-blue-500 text-white text-sm">Save</button>
                    <button onClick={() => setEditingProvider(null)} className="px-3 py-1 rounded text-sm" style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="pl-8 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  <span>Model: {provider.model}</span>
                  {provider.config?.url && <span className="ml-4">URL: {provider.config.url}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>General Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Auto-refresh interval</span>
              <select className="px-3 py-1 rounded border" style={{ background: isDark ? '#1f2937' : '#fff', color: isDark ? '#fff' : '#111827' }}>
                <option>5 seconds</option>
                <option>10 seconds</option>
                <option>30 seconds</option>
                <option>1 minute</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Notifications</span>
              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Theme</h2>
          <div className="flex gap-4">
            <button
              onClick={() => { localStorage.setItem('agentforge-theme', 'dark'); setTheme('dark') }}
              className="flex-1 py-3 rounded-lg border-2"
              style={{ borderColor: theme === 'dark' ? '#3b82f6' : 'transparent', background: isDark ? '#1f2937' : '#f3f4f6' }}
            >
              🌙 Dark
            </button>
            <button
              onClick={() => { localStorage.setItem('agentforge-theme', 'light'); setTheme('light') }}
              className="flex-1 py-3 rounded-lg border-2"
              style={{ borderColor: theme === 'light' ? '#3b82f6' : 'transparent', background: isDark ? '#1f2937' : '#f3f4f6' }}
            >
              ☀️ Light
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}