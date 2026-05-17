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

interface Agent {
  id: string
  name: string
  role: string
  department: string
  status: string
}

const API_BASE = 'http://localhost:8888/api'

const DEFAULT_TEMPLATES: Template[] = [
  { id: '1', name: 'Junior Developer', description: 'Entry-level developer for routine tasks', department: 'engineering', roles: ['developer'], skills: ['coding', 'testing'], hourly_rate: 25, behavior: 'working' },
  { id: '2', name: 'Senior Developer', description: 'Experienced developer for complex tasks', department: 'engineering', roles: ['developer', 'reviewer'], skills: ['coding', 'review', 'architecture'], hourly_rate: 75, behavior: 'working' },
  { id: '3', name: 'Sales Representative', description: 'Handle customer interactions and sales', department: 'sales', roles: ['sales'], skills: ['communication', 'negotiation'], hourly_rate: 35, behavior: 'communicating' },
  { id: '4', name: 'Product Manager', description: 'Manage product development and roadmap', department: 'product', roles: ['manager'], skills: ['planning', 'communication'], hourly_rate: 80, behavior: 'planning' },
  { id: '5', name: 'QA Engineer', description: 'Quality assurance and testing', department: 'engineering', roles: ['qa'], skills: ['testing', 'documentation'], hourly_rate: 45, behavior: 'working' },
  { id: '6', name: 'DevOps Engineer', description: 'Infrastructure and deployment management', department: 'operations', roles: ['devops'], skills: ['deployment', 'monitoring'], hourly_rate: 70, behavior: 'working' },
  { id: '7', name: 'Marketing Specialist', description: 'Plan and execute marketing campaigns', department: 'marketing', roles: ['marketing'], skills: ['content', 'seo', 'analytics'], hourly_rate: 50, behavior: 'working' },
  { id: '8', name: 'Financial Analyst', description: 'Analyze financial data and reports', department: 'finance', roles: ['analyst'], skills: ['accounting', 'excel', 'reporting'], hourly_rate: 65, behavior: 'working' },
  { id: '9', name: 'Customer Support', description: 'Handle customer inquiries and issues', department: 'customer_service', roles: ['support'], skills: ['communication', 'problem-solving'], hourly_rate: 30, behavior: 'communicating' },
  { id: '10', name: 'HR Manager', description: 'Manage recruitment and employee relations', department: 'hr', roles: ['hr'], skills: ['recruitment', 'interviewing', 'policy'], hourly_rate: 60, behavior: 'communicating' },
  { id: '11', name: 'Legal Counsel', description: 'Handle legal matters and compliance', department: 'legal', roles: ['legal'], skills: ['contracts', 'compliance', 'research'], hourly_rate: 90, behavior: 'thinking' },
  { id: '12', name: 'Data Scientist', description: 'Analyze data and build models', department: 'engineering', roles: ['data-scientist'], skills: ['python', 'ml', 'statistics'], hourly_rate: 85, behavior: 'thinking' },
  { id: '13', name: 'UI/UX Designer', description: 'Design user interfaces and experiences', department: 'product', roles: ['designer'], skills: ['figma', 'prototyping', 'user-research'], hourly_rate: 55, behavior: 'working' },
  { id: '14', name: 'Content Writer', description: 'Create content for marketing', department: 'marketing', roles: ['writer'], skills: ['writing', 'editing', 'seo'], hourly_rate: 35, behavior: 'working' },
  { id: '15', name: 'Project Coordinator', description: 'Coordinate projects and timelines', department: 'operations', roles: ['coordinator'], skills: ['planning', 'organizing', 'communication'], hourly_rate: 45, behavior: 'working' },
  { id: '16', name: 'Security Engineer', description: 'Ensure system security', department: 'engineering', roles: ['security'], skills: ['penetration-testing', 'security-audit', 'compliance'], hourly_rate: 80, behavior: 'working' },
  { id: '17', name: 'Technical Writer', description: 'Create technical documentation', department: 'engineering', roles: ['writer'], skills: ['documentation', 'api-docs', 'markdown'], hourly_rate: 40, behavior: 'working' },
  { id: '18', name: 'Business Analyst', description: 'Analyze business requirements', department: 'product', roles: ['analyst'], skills: ['requirements', 'sql', 'reporting'], hourly_rate: 70, behavior: 'thinking' }
]

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUseModal, setShowUseModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', department: '', roles: '', skills: '', hourly_rate: 50, behavior: 'working' })

  useEffect(() => {
    const saved = localStorage.getItem('agentforge-theme')
    if (saved) setTheme(saved)
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const [templatesRes, agentsRes] = await Promise.all([
        fetch(`${API_BASE}/company/templates`),
        fetch(`${API_BASE}/company/agents`)
      ])
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        if (data.templates?.length > 0) setTemplates(data.templates)
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.agents || [])
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

  const openUseTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setSelectedAgents([])
    setShowUseModal(true)
  }

  const applyTemplate = async () => {
    if (!selectedTemplate) return
    
    if (selectedAgents.length > 0) {
      for (const agentId of selectedAgents) {
        try {
          await fetch(`${API_BASE}/company/agents/${agentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: selectedTemplate.roles[0] || 'worker',
              behavior: selectedTemplate.behavior,
              skills: selectedTemplate.skills
            })
          })
        } catch (err) {
          console.error('Failed to update agent:', err)
        }
      }
      alert(`Template applied to ${selectedAgents.length} agent(s)!`)
    } else {
      try {
        const res = await fetch(`${API_BASE}/company/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${selectedTemplate.name} Agent`,
            role: selectedTemplate.roles[0] || 'worker',
            department: selectedTemplate.department,
            skills: selectedTemplate.skills
          })
        })
        if (res.ok) {
          alert('New agent created from template!')
        }
      } catch (err) {
        console.error('Failed to create agent from template:', err)
      }
    }
    setShowUseModal(false)
    fetchTemplates()
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
              onClick={() => openUseTemplate(template)}
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

      {showUseModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-2" style={{ color: isDark ? '#fff' : '#111827' }}>Use Template</h2>
            <p className="text-sm mb-4" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              {selectedTemplate.name} - {selectedTemplate.department}
            </p>
            
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                Select existing agents to apply this template (leave empty to create new agent):
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {agents.map(agent => (
                  <label key={agent.id} className="flex items-center gap-2 p-2 rounded cursor-pointer" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedAgents([...selectedAgents, agent.id])
                        } else {
                          setSelectedAgents(selectedAgents.filter(id => id !== agent.id))
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span style={{ color: isDark ? '#fff' : '#111827' }}>{agent.name}</span>
                    <span className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>({agent.department})</span>
                  </label>
                ))}
                {agents.length === 0 && (
                  <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>No agents available</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={applyTemplate} className="flex-1 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600">
                {selectedAgents.length > 0 ? `Apply to ${selectedAgents.length} Agent(s)` : 'Create New Agent'}
              </button>
              <button onClick={() => setShowUseModal(false)} className="flex-1 py-2 rounded-lg" style={{ background: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#111827' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}