'use client'
import { useState } from 'react'

const THEMES = [
  { id: 'dark', name: 'Dark', colors: ['#1f2937', '#374151', '#111827'] },
  { id: 'light', name: 'Light', colors: ['#f3f4f6', '#e5e7eb', '#ffffff'] },
  { id: 'blue', name: 'Ocean', colors: ['#1e3a5f', '#2563eb', '#0f172a'] },
  { id: 'green', name: 'Forest', colors: ['#1e3d1e', '#22c55e', '#0f1f0f'] },
]

const LLM_PROVIDERS = [
  { id: '9router', name: '9Router (Primary)', icon: '🌐' },
  { id: 'ollama', name: 'Ollama (Local)', icon: '💻' },
  { id: 'openai', name: 'OpenAI', icon: '🔵' },
  { id: 'anthropic', name: 'Anthropic', icon: '🟣' },
  { id: 'gemini', name: 'Gemini', icon: '🟡' },
]

export default function SettingsPage() {
  const [theme, setTheme] = useState('dark')
  const [primaryLLM, setPrimaryLLM] = useState('9router')
  const [apiKey, setApiKey] = useState('')
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Configure your AgentForge instance</p>
        </div>
        {saved && (
          <span className="px-4 py-2 bg-green-600 text-white rounded-lg">
            ✓ Saved
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">🎨 Theme</h2>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === t.id 
                    ? 'border-blue-500 bg-blue-500/20' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {t.colors.map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-white text-sm">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">🤖 LLM Provider</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Primary Provider</label>
              <select
                value={primaryLLM}
                onChange={e => setPrimaryLLM(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                {LLM_PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">API Key (for cloud providers)</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Ollama Endpoint (local)</label>
              <input
                type="text"
                value={ollamaEndpoint}
                onChange={e => setOllamaEndpoint(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">🔌 Connections</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-white">API Server</p>
                <p className="text-sm text-gray-400">http://localhost:8000</p>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-white">Redis</p>
                <p className="text-sm text-gray-400">localhost:6379</p>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-white">PostgreSQL</p>
                <p className="text-sm text-gray-400">localhost:5432</p>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-white">Ollama</p>
                <p className="text-sm text-gray-400">localhost:11434</p>
              </div>
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm">Optional</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">⚙️ Company Info</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Company Name</label>
              <input
                type="text"
                defaultValue="AgentForge Inc."
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Auto-save Interval</label>
              <select className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600">
                <option>5 seconds</option>
                <option>10 seconds</option>
                <option>30 seconds</option>
                <option>1 minute</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}