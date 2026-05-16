import { useState, useEffect } from 'react'

interface Template {
  id: string
  name: string
  description: string
  department: string
  roles: string[]
  skills: string[]
  hourly_rate: number
  behavior: string
}

const API_BASE = 'http://localhost:8888/api'

const DEFAULT_TEMPLATES: Template[] = [
  { id: '1', name: 'Junior Developer', description: 'Entry-level developer for routine tasks', department: 'Engineering', roles: ['developer'], skills: ['coding', 'testing'], hourly_rate: 25, behavior: 'working' },
  { id: '2', name: 'Senior Developer', description: 'Experienced developer for complex tasks', department: 'Engineering', roles: ['developer', 'reviewer'], skills: ['coding', 'review', 'architecture'], hourly_rate: 75, behavior: 'working' },
  { id: '3', name: 'Sales Representative', description: 'Handle customer interactions and sales', department: 'Sales', roles: ['sales'], skills: ['communication', 'negotiation'], hourly_rate: 35, behavior: 'communicating' },
  { id: '4', name: 'Product Manager', description: 'Manage product development and roadmap', department: 'Product', roles: ['manager'], skills: ['planning', 'communication'], hourly_rate: 80, behavior: 'planning' },
  { id: '5', name: 'QA Engineer', description: 'Quality assurance and testing', department: 'Engineering', roles: ['qa'], skills: ['testing', 'documentation'], hourly_rate: 45, behavior: 'working' },
  { id: '6', name: 'DevOps Engineer', description: 'Infrastructure and deployment management', department: 'Operations', roles: ['devops'], skills: ['deployment', 'monitoring'], hourly_rate: 70, behavior: 'working' }
]

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES)
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', department: '', roles: '', skills: '', hourly_rate: 50, behavior: 'working' })

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/company/templates`)
      if (res.ok) {
        const data = await res.json()
        if (data.templates?.length > 0) setTemplates(data.templates)
      }
    } catch (err) {
      console.log('Using default templates')
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    const template: Template = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description,
      department: newTemplate.department,
      roles: newTemplate.roles.split(',').map(r => r.trim()),
      skills: newTemplate.skills.split(',').map(s => s.trim()),
      hourly_rate: newTemplate.hourly_rate,
      behavior: newTemplate.behavior
    }
    setTemplates([...templates, template])
    setShowCreateModal(false)
    setNewTemplate({ name: '', description: '', department: '', roles: '', skills: '', hourly_rate: 50, behavior: 'working' })
  }

  const useTemplate = async (template: Template) => {
    try {
      await fetch(`${API_BASE}/company/agents/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} Agent`,
          role: template.roles[0] || 'worker',
          department: template.department,
          hourly_rate: template.hourly_rate,
          behavior: template.behavior
        })
      })
      alert('Agent created from template!')
    } catch (err) {
      console.error('Failed to create agent from template:', err)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Templates</h1>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Pre-built agent configurations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + Create Template
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <div key={template.id} className="glass-card">
            <h3 className="font-semibold text-lg mb-2" style={{ color: isDark ? '#fff' : '#111827' }}>{template.name}</h3>
            <p className="text-sm mb-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{template.description}</p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center justify-between">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Department</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }}>{template.department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Hourly Rate</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }}>${template.hourly_rate}/hr</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Behavior</span>
                <span style={{ color: isDark ? '#fff' : '#111827' }}>{template.behavior}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-4">
              {template.roles.map(role => (
                <span key={role} className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">{role}</span>
              ))}
              {template.skills.map(skill => (
                <span key={skill} className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">{skill}</span>
              ))}
            </div>
            <button
              onClick={() => useTemplate(template)}
              className="w-full py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Use Template
            </button>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>Create Template</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Template Name"
                value={newTemplate.name}
                onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <textarea
                placeholder="Description"
                value={newTemplate.description}
                onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border h-20"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="text"
                placeholder="Department"
                value={newTemplate.department}
                onChange={e => setNewTemplate({ ...newTemplate, department: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="text"
                placeholder="Roles (comma separated)"
                value={newTemplate.roles}
                onChange={e => setNewTemplate({ ...newTemplate, roles: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="text"
                placeholder="Skills (comma separated)"
                value={newTemplate.skills}
                onChange={e => setNewTemplate({ ...newTemplate, skills: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <input
                type="number"
                placeholder="Hourly Rate"
                value={newTemplate.hourly_rate}
                onChange={e => setNewTemplate({ ...newTemplate, hourly_rate: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              />
              <select
                value={newTemplate.behavior}
                onChange={e => setNewTemplate({ ...newTemplate, behavior: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ background: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#d1d5db', color: isDark ? '#fff' : '#111827' }}
              >
                <option value="working">Working</option>
                <option value="idle">Idle</option>
                <option value="thinking">Thinking</option>
                <option value="communicating">Communicating</option>
              </select>
              <div className="flex gap-2">
                <button onClick={createTemplate} className="flex-1 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">Create</button>
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 rounded-lg" style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}