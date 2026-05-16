import { useState, useEffect } from 'react'

interface Project {
  id: string
  name: string
  description: string
  status: string
  repository_url: string
  auto_healing: boolean
  created_at: string
  department: string
}

const API_BASE = 'http://localhost:8888/api'

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', repository_url: '', auto_healing: false })
  const [importMode, setImportMode] = useState<'local' | 'github'>('local')

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchProjects()
    const interval = setInterval(fetchProjects, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`)
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProject, import_mode: importMode })
      })
      if (res.ok) {
        fetchProjects()
        setShowCreateModal(false)
        setNewProject({ name: '', description: '', repository_url: '', auto_healing: false })
      }
    } catch (err) {
      console.error('Failed to create project:', err)
    }
  }

  const toggleAutoHealing = async (projectId: string, enabled: boolean) => {
    try {
      await fetch(`${API_BASE}/projects/${projectId}/healing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      fetchProjects()
    } catch (err) {
      console.error('Failed to toggle auto healing:', err)
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      await fetch(`${API_BASE}/projects/${projectId}`, { method: 'DELETE' })
      fetchProjects()
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const isDark = theme === 'dark'

  const statusColors: Record<string, string> = {
    active: '#22c55e',
    paused: '#f59e0b',
    error: '#ef4444',
    completed: '#3b82f6'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Projects</h1>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Manage your projects with auto-healing</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + New Project
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <div key={project.id} className="glass-card">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg" style={{ color: isDark ? '#fff' : '#111827' }}>{project.name}</h3>
              <span className="px-2 py-1 rounded text-xs" style={{ background: `${statusColors[project.status]}20`, color: statusColors[project.status] }}>
                {project.status}
              </span>
            </div>
            <p className="text-sm mb-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{project.description}</p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Repository:</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }} className="truncate">{project.repository_url || 'Local'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Department:</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }}>{project.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Created:</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }}>{project.created_at}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.auto_healing}
                  onChange={e => toggleAutoHealing(project.id, e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Auto Healing</span>
              </label>
              <button
                onClick={() => deleteProject(project.id)}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No projects yet</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Create Project</h2>
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setImportMode('local')}
                  className={`flex-1 py-2 rounded-lg transition-colors ${importMode === 'local' ? 'bg-blue-500 text-white' : ''}`}
                  style={{ background: importMode === 'local' ? '#3b82f6' : isDark ? '#1f2937' : '#f3f4f6', color: importMode === 'local' ? '#fff' : isDark ? '#d1d5db' : '#4b5563' }}
                >
                  Local
                </button>
                <button
                  onClick={() => setImportMode('github')}
                  className={`flex-1 py-2 rounded-lg transition-colors`}
                  style={{ background: importMode === 'github' ? '#3b82f6' : isDark ? '#1f2937' : '#f3f4f6', color: importMode === 'github' ? '#fff' : isDark ? '#d1d5db' : '#4b5563' }}
                >
                  GitHub
                </button>
              </div>
              <input
                type="text"
                placeholder="Project Name"
                value={newProject.name}
                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <textarea
                placeholder="Description"
                value={newProject.description}
                onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border h-20"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              {importMode === 'github' && (
                <input
                  type="text"
                  placeholder="GitHub Repository URL"
                  value={newProject.repository_url}
                  onChange={e => setNewProject({ ...newProject, repository_url: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
                />
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newProject.auto_healing}
                  onChange={e => setNewProject({ ...newProject, auto_healing: e.target.checked })}
                />
                <span style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>Enable Auto Healing</span>
              </label>
              <div className="flex gap-2">
                <button onClick={createProject} className="flex-1 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">Create</button>
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 rounded-lg" style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}