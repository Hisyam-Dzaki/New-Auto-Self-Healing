import { useState, useEffect } from 'react'

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string
  private: boolean
  html_url: string
  default_branch: string
  language: string
}

interface GitHubConfig {
  connected: boolean
  username: string
  access_token: string
}

const API_BASE = 'http://localhost:8888/api'

export default function GitHub() {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [config, setConfig] = useState<GitHubConfig>({ connected: false, username: '', access_token: '' })
  const [tokenInput, setTokenInput] = useState('')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const res = await fetch(`${API_BASE}/github/status`)
      const data = await res.json()
      setConfig(data)
      if (data.connected) fetchRepos()
    } catch (err) {
      console.error('Failed to check GitHub connection:', err)
    } finally {
      setLoading(false)
    }
  }

  const connect = async () => {
    setConnecting(true)
    try {
      const res = await fetch(`${API_BASE}/github/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: tokenInput })
      })
      if (res.ok) {
        setConfig({ connected: true, username: 'Connected', access_token: tokenInput })
        fetchRepos()
      } else {
        alert('Failed to connect. Check your token.')
      }
    } catch (err) {
      console.error('Failed to connect to GitHub:', err)
    }
    setConnecting(false)
  }

  const disconnect = async () => {
    try {
      await fetch(`${API_BASE}/github/disconnect`, { method: 'POST' })
      setConfig({ connected: false, username: '', access_token: '' })
      setRepos([])
    } catch (err) {
      console.error('Failed to disconnect:', err)
    }
  }

  const importRepo = async (repoFullName: string) => {
    try {
      const res = await fetch(`${API_BASE}/projects/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: repoFullName.split('/')[1], repository_url: `https://github.com/${repoFullName}`, import_mode: 'github' })
      })
      if (res.ok) {
        alert('Repository imported successfully!')
      }
    } catch (err) {
      console.error('Failed to import repo:', err)
    }
  }

  const fetchRepos = async () => {
    try {
      const res = await fetch(`${API_BASE}/github/repos`)
      const data = await res.json()
      setRepos(data.repositories || [])
    } catch (err) {
      console.error('Failed to fetch repos:', err)
    }
  }

  const isDark = theme === 'dark'

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
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>GitHub Integration</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Connect and import repositories</p>
      </header>

      {!config.connected ? (
        <div className="glass-card max-w-xl">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Connect GitHub</h2>
          <p className="text-sm mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            Enter your GitHub personal access token to connect your account and import repositories.
          </p>
          <input
            type="password"
            placeholder="GitHub Personal Access Token"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border mb-4"
            style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
          />
          <button
            onClick={connect}
            disabled={!tokenInput || connecting}
            className="px-6 py-2 rounded-lg font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect GitHub'}
          </button>
          <p className="text-xs mt-3" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
            Need a token? Create one at GitHub Settings → Developer settings → Personal access tokens
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span style={{ color: isDark ? '#fff' : '#111827' }}>Connected to GitHub</span>
            </div>
            <button
              onClick={disconnect}
              className="px-4 py-2 rounded-lg text-red-500 hover:text-red-600"
            >
              Disconnect
            </button>
          </div>

          <div className="glass-card">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Your Repositories</h2>
            <div className="space-y-3">
              {repos.map(repo => (
                <div key={repo.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{repo.name}</h3>
                      {repo.private && <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">Private</span>}
                    </div>
                    <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{repo.description || 'No description'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                      <span>⭐ {repo.default_branch}</span>
                      <span>💻 {repo.language || 'Unknown'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => importRepo(repo.full_name)}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Import
                  </button>
                </div>
              ))}
              {repos.length === 0 && (
                <p className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No repositories found</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}