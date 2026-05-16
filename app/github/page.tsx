'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'

interface GitHubUser {
  login: string
  name: string
  avatar_url: string
}

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  default_branch: string
  private: boolean
}

export default function GitHubPage() {
  const [tokenId, setTokenId] = useState('')
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [oauthCode, setOauthCode] = useState('')
  const [importing, setImporting] = useState<number | null>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    fetchAuthUrl()
    const savedTokenId = localStorage.getItem('github_token_id')
    if (savedTokenId) {
      setTokenId(savedTokenId)
      checkTokenStatus(savedTokenId)
    }
  }, [])

  const fetchAuthUrl = async () => {
    try {
      const res = await fetch('http://localhost:8888/api/github/auth/url')
      const data = await res.json()
      setAuthUrl(data.auth_url)
    } catch (err) {
      console.error('Failed to get auth URL:', err)
    }
  }

  const handleOAuthLogin = async () => {
    if (!oauthCode) return
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8888/api/github/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: oauthCode })
      })
      const data = await res.json()
      if (data.token_id) {
        setTokenId(data.token_id)
        localStorage.setItem('github_token_id', data.token_id)
        checkTokenStatus(data.token_id)
      }
    } catch (err) {
      console.error('OAuth failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkTokenStatus = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8888/api/github/token/status?token_id=${id}`)
      const data = await res.json()
      if (data.connected) {
        setUser({ login: data.username, name: data.name || '', avatar_url: '' })
        fetchRepos(id)
      }
    } catch (err) {
      console.error('Failed to check token status:', err)
    }
  }

  const fetchRepos = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8888/api/github/repos?token_id=${id}`)
      const data = await res.json()
      setRepos(data.repos || [])
    } catch (err) {
      console.error('Failed to fetch repos:', err)
    }
  }

  const importRepo = async (repo: GitHubRepo) => {
    setImporting(repo.id)
    try {
      const res = await fetch('http://localhost:8888/api/github/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repo.html_url,
          local_path: `/projects/${repo.name}`,
          branch: repo.default_branch
        })
      })
      const data = await res.json()
      if (data.status === 'success') {
        await fetch('http://localhost:8888/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: repo.name,
            description: repo.description || '',
            source_type: 'github',
            repo_url: repo.html_url,
            local_path: `/projects/${repo.name}`,
            default_branch: repo.default_branch,
            auto_healing_enabled: true,
            auto_pull_enabled: true,
            auto_push_enabled: true
          })
        })
        alert(`Successfully imported ${repo.name}!`)
      } else {
        alert(data.message || 'Import failed')
      }
    } catch (err) {
      console.error('Failed to import repo:', err)
    } finally {
      setImporting(null)
    }
  }

  const logout = async () => {
    if (tokenId) {
      await fetch('http://localhost:8888/api/github/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenId })
      })
    }
    setTokenId('')
    setUser(null)
    setRepos([])
    localStorage.removeItem('github_token_id')
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>GitHub Integration</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Connect your GitHub account to import repositories</p>
      </header>

      {!user ? (
        <div className="glass-card">
          <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Connect to GitHub</h2>
          
          {authUrl ? (
            <div className="space-y-4">
              <a 
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-3 px-4 rounded-lg font-medium"
                style={{ background: '#24292f', color: 'white' }}
              >
                🔗 Login with GitHub
              </a>
              
              <div className="text-center" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Or enter the authorization code:
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste code here"
                  value={oauthCode}
                  onChange={e => setOauthCode(e.target.value)}
                  className="input-field flex-1"
                />
                <button
                  onClick={handleOAuthLogin}
                  disabled={!oauthCode || loading}
                  className="btn-primary"
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="glass-card flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user.avatar_url && (
                <img src={user.avatar_url} alt={user.login} className="w-12 h-12 rounded-full" />
              )}
              <div>
                <h3 className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{user.name || user.login}</h3>
                <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>@{user.login}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg"
              style={{ background: '#ef4444', color: 'white' }}
            >
              Logout
            </button>
          </div>

          <div className="glass-card">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>
              Your Repositories ({repos.length})
            </h2>
            
            {repos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {repos.map(repo => (
                  <div key={repo.id} className="p-4 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>
                          {repo.private && '🔒 '}{repo.name}
                        </h3>
                        <p className="text-sm mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                          {repo.description || 'No description'}
                        </p>
                        <div className="flex gap-3 mt-2 text-sm" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                          <span>🌿 {repo.default_branch}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => importRepo(repo)}
                        disabled={importing === repo.id}
                        className="px-3 py-1 rounded text-sm"
                        style={{ background: '#3b82f6', color: 'white', opacity: importing === repo.id ? 0.5 : 1 }}
                      >
                        {importing === repo.id ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                No repositories found
              </div>
            )}
          </div>
        </>
      )}

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Configuration</h2>
        <p className="mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          To enable GitHub OAuth, set the following environment variables:
        </p>
        <div className="p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6', fontFamily: 'monospace' }}>
          <code style={{ color: isDark ? '#22d3ee' : '#0891b2' }}>
            GITHUB_CLIENT_ID=your_client_id<br/>
            GITHUB_CLIENT_SECRET=your_client_secret
          </code>
        </div>
      </div>
    </div>
  )
}