'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'

interface Project {
  id: string
  name: string
  auto_healing_enabled: boolean
  auto_pull_enabled: boolean
  auto_push_enabled: boolean
}

interface HealingTask {
  task_id: string
  project_id: string
  project_name: string
  classification: { issue_type?: string; severity?: string }
  source: string
  timestamp: number
  status: string
}

export default function SelfHealingPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [history, setHistory] = useState<HealingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [testLogs, setTestLogs] = useState('')
  const [triggering, setTriggering] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [projectsRes, historyRes] = await Promise.all([
        fetch('http://localhost:8888/api/projects'),
        fetch('http://localhost:8888/api/heal/history')
      ])
      const projectsData = await projectsRes.json()
      const historyData = await historyRes.json()
      setProjects(projectsData.projects || [])
      setHistory(historyData.history || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const triggerHealing = async () => {
    if (!selectedProject || !testLogs) return
    
    setTriggering(true)
    try {
      await fetch(`http://localhost:8888/api/heal/manual/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: testLogs })
      })
      setTestLogs('')
      fetchData()
    } catch (err) {
      console.error('Failed to trigger healing:', err)
    } finally {
      setTriggering(false)
    }
  }

  const toggleAutoHealing = async (projectId: string, enabled: boolean) => {
    try {
      await fetch(`http://localhost:8888/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_healing_enabled: enabled })
      })
      fetchData()
    } catch (err) {
      console.error('Failed to toggle auto healing:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-2xl" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  const enabledProjects = projects.filter(p => p.auto_healing_enabled)
  const disabledProjects = projects.filter(p => !p.auto_healing_enabled)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Auto Self Healing</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Monitor and manage project healing</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>
            Projects with Auto Healing Enabled
          </h2>
          
          {enabledProjects.length > 0 ? (
            <div className="space-y-3">
              {enabledProjects.map(project => (
                <div key={project.id} className="glass-card flex items-center justify-between">
                  <div>
                    <h3 className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{project.name}</h3>
                    <div className="flex gap-3 text-sm mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                      <span>⬇️ {project.auto_pull_enabled ? 'Auto' : 'Manual'} Pull</span>
                      <span>⬆️ {project.auto_push_enabled ? 'Auto' : 'Manual'} Push</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAutoHealing(project.id, false)}
                    className="px-3 py-1 rounded text-sm"
                    style={{ background: '#ef4444', color: 'white' }}
                  >
                    Disable
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              No projects with auto healing enabled
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>
            Inactive Projects
          </h2>
          
          {disabledProjects.length > 0 ? (
            <div className="space-y-3">
              {disabledProjects.map(project => (
                <div key={project.id} className="glass-card flex items-center justify-between">
                  <div>
                    <h3 className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{project.name}</h3>
                  </div>
                  <button
                    onClick={() => toggleAutoHealing(project.id, true)}
                    className="px-3 py-1 rounded text-sm"
                    style={{ background: '#22c55e', color: 'white' }}
                  >
                    Enable
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              All projects have auto healing enabled
            </div>
          )}
        </div>
      </div>

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>
          Manual Healing Trigger
        </h2>
        <div className="space-y-4">
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="input-field"
          >
            <option value="">Select a project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <textarea
            placeholder="Paste error logs here..."
            value={testLogs}
            onChange={e => setTestLogs(e.target.value)}
            className="input-field h-32 resize-none"
          />
          <button
            onClick={triggerHealing}
            disabled={!selectedProject || !testLogs || triggering}
            className="btn-primary"
            style={{ opacity: (!selectedProject || !testLogs || triggering) ? 0.5 : 1 }}
          >
            {triggering ? 'Triggering...' : '🔧 Trigger Healing'}
          </button>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>
          Healing History
        </h2>
        
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.slice().reverse().map(task => (
              <div key={task.task_id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div>
                  <h4 className="font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>
                    {task.project_name || task.project_id}
                  </h4>
                  <div className="flex gap-3 text-sm mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                    <span>Type: {task.classification?.issue_type || 'unknown'}</span>
                    <span>Source: {task.source}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${
                    task.status === 'queued' ? 'bg-yellow-500/20 text-yellow-400' :
                    task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {task.status}
                  </span>
                  <p className="text-xs mt-1" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                    {new Date(task.timestamp * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            No healing history yet
          </div>
        )}
      </div>

      <div className="glass-card">
        <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>
          🔗 External Webhook
        </h2>
        <p className="mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          Use this endpoint to receive error logs from external sources (VPS, monitoring systems, etc.)
        </p>
        <div className="p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6', fontFamily: 'monospace' }}>
          <code style={{ color: isDark ? '#22d3ee' : '#0891b2' }}>POST http://localhost:8888/api/heal/receive</code>
        </div>
        <div className="mt-4 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          <p className="font-medium mb-2">Request body (JSON):</p>
          <pre className="p-3 rounded" style={{ background: isDark ? '#111827' : '#e5e7eb', overflow: 'auto' }}>
{`{
  "project_id": "optional-project-id",
  "project_name": "optional-project-name", 
  "logs": "error logs content...",
  "source": "vps/production/external",
  "metadata": { "optional": "data" }
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}