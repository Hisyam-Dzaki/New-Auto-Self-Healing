'use client'
import { useState } from 'react'
import { useTheme } from '../hooks/useTheme'

interface TemplateAgent {
  role: string
  model: string
  budget: number
  instructions: string
}

interface CompanyTemplate {
  id: string
  name: string
  description: string
  icon: string
  agent_count: number
  monthly_budget: number
  agents: TemplateAgent[]
  departments: string[]
}

const templates: CompanyTemplate[] = [
  {
    id: 'saas-startup',
    name: 'SaaS Startup',
    description: 'Build and scale a software-as-a-service product',
    icon: '🚀',
    agent_count: 5,
    monthly_budget: 500,
    departments: ['engineering', 'sales', 'marketing', 'product'],
    agents: [
      { role: 'CTO', model: 'Anthropic Claude', budget: 150, instructions: 'Lead technical architecture and development' },
      { role: 'Senior Engineer', model: 'Claude Code', budget: 100, instructions: 'Full-stack development and code review' },
      { role: 'Sales Lead', model: 'OpenAI GPT', budget: 80, instructions: 'Lead generation and client acquisition' },
      { role: 'Marketing Manager', model: 'OpenAI GPT', budget: 70, instructions: 'Brand strategy and content marketing' },
      { role: 'Product Manager', model: 'OpenAI GPT', budget: 100, instructions: 'Product roadmap and stakeholder management' }
    ]
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Run an online retail business',
    icon: '🛒',
    agent_count: 4,
    monthly_budget: 300,
    departments: ['operations', 'sales', 'support', 'marketing'],
    agents: [
      { role: 'Store Manager', model: 'OpenAI GPT', budget: 100, instructions: 'Oversee operations and inventory' },
      { role: 'Sales Associate', model: 'OpenAI GPT', budget: 60, instructions: 'Customer acquisition and retention' },
      { role: 'Customer Support', model: 'OpenAI GPT', budget: 50, instructions: 'Handle customer inquiries and issues' },
      { role: 'Marketing Specialist', model: 'OpenAI GPT', budget: 90, instructions: 'Digital marketing and promotions' }
    ]
  },
  {
    id: 'dev-agency',
    name: 'Development Agency',
    description: 'Build software for clients',
    icon: '💼',
    agent_count: 6,
    monthly_budget: 800,
    departments: ['engineering', 'product', 'sales', 'support'],
    agents: [
      { role: 'Agency Lead', model: 'Anthropic Claude', budget: 150, instructions: 'Client relations and project management' },
      { role: 'Lead Developer', model: 'Claude Code', budget: 150, instructions: 'Technical oversight and architecture' },
      { role: 'Senior Engineer', model: 'Claude Code', budget: 100, instructions: 'Client project development' },
      { role: 'Junior Engineer', model: 'Claude Code', budget: 80, instructions: 'Feature implementation and testing' },
      { role: 'Project Manager', model: 'OpenAI GPT', budget: 100, instructions: 'Timeline management and client communication' },
      { role: 'QA Engineer', model: 'OpenAI GPT', budget: 120, instructions: 'Quality assurance and testing' }
    ]
  },
  {
    id: 'content-company',
    name: 'Content Company',
    description: 'Create and distribute content at scale',
    icon: '📝',
    agent_count: 4,
    monthly_budget: 250,
    departments: ['marketing', 'operations', 'support'],
    agents: [
      { role: 'Content Director', model: 'OpenAI GPT', budget: 80, instructions: 'Content strategy and editorial calendar' },
      { role: 'Writer', model: 'OpenAI GPT', budget: 50, instructions: 'Article and blog post creation' },
      { role: 'Social Media Manager', model: 'OpenAI GPT', budget: 60, instructions: 'Social media presence and engagement' },
      { role: 'Community Manager', model: 'OpenAI GPT', budget: 60, instructions: 'Community building and support' }
    ]
  },
  {
    id: 'consulting',
    name: 'Consulting Firm',
    description: 'Provide professional advisory services',
    icon: '🎯',
    agent_count: 4,
    monthly_budget: 400,
    departments: ['sales', 'operations', 'hr'],
    agents: [
      { role: 'Managing Partner', model: 'Anthropic Claude', budget: 150, instructions: 'Strategic direction and client relationships' },
      { role: 'Senior Consultant', model: 'OpenAI GPT', budget: 100, instructions: 'Client engagements and deliverable' },
      { role: 'Business Analyst', model: 'OpenAI GPT', budget: 80, instructions: 'Research and analysis' },
      { role: 'Operations Manager', model: 'OpenAI GPT', budget: 70, instructions: 'Internal operations and HR' }
    ]
  },
  {
    id: 'custom',
    name: 'Custom Template',
    description: 'Create your own company template',
    icon: '➕',
    agent_count: 0,
    monthly_budget: 0,
    departments: [],
    agents: []
  }
]

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<CompanyTemplate | null>(null)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const applyTemplate = async () => {
    if (!selectedTemplate || !companyName) return
    
    try {
      for (const agent of selectedTemplate.agents) {
        await fetch('http://localhost:8888/api/company/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${agent.role} - ${companyName}`,
            role: agent.role,
            department: selectedTemplate.departments[0] || 'operations',
            skills: [agent.instructions]
          })
        })
      }
      alert(`Template applied! Created ${selectedTemplate.agents.length} agents for ${companyName}`)
      setShowApplyModal(false)
      setCompanyName('')
    } catch (err) {
      console.error('Failed to apply template:', err)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold" style={{ color: isDark ? '#fff' : '#111827' }}>Company Templates</h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Pre-built agent configurations for different business types</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <div 
            key={template.id} 
            className="glass-card cursor-pointer hover:ring-2 hover:ring-blue-500"
            onClick={() => setSelectedTemplate(template)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">{template.icon}</div>
              {template.id !== 'custom' && (
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280' }}
                >
                  {template.agent_count} agents
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>{template.name}</h3>
            <p className="text-sm mt-1 mb-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{template.description}</p>
            {template.id !== 'custom' && (
              <div className="flex items-center gap-2 text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                <span>💰 ${template.monthly_budget}/mo</span>
                <span>•</span>
                <span>{template.departments.length} depts</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTemplate && selectedTemplate.id !== 'custom' && (
        <div className="glass-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: isDark ? '#fff' : '#111827' }}>
                {selectedTemplate.icon} {selectedTemplate.name}
              </h2>
              <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{selectedTemplate.description}</p>
            </div>
            <button
              onClick={() => setShowApplyModal(true)}
              className="px-4 py-2 rounded-lg font-medium"
              style={{ background: '#3b82f6', color: 'white' }}
            >
              Apply Template
            </button>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2" style={{ color: isDark ? '#fff' : '#111827' }}>Departments</h3>
            <div className="flex flex-wrap gap-2">
              {selectedTemplate.departments.map(dept => (
                <span 
                  key={dept}
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ background: isDark ? '#374151' : '#f3f4f6', color: isDark ? '#d1d5db' : '#4b5563' }}
                >
                  {dept}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2" style={{ color: isDark ? '#fff' : '#111827' }}>Agents</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}>
                    <th className="text-left py-2 px-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Role</th>
                    <th className="text-left py-2 px-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Model</th>
                    <th className="text-left py-2 px-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Budget</th>
                    <th className="text-left py-2 px-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTemplate.agents.map((agent, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${isDark ? '#1f2937' : '#f3f4f6'}` }}>
                      <td className="py-2 px-3 font-medium" style={{ color: isDark ? '#fff' : '#111827' }}>{agent.role}</td>
                      <td className="py-2 px-3" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>{agent.model}</td>
                      <td className="py-2 px-3" style={{ color: '#22c55e' }}>${agent.budget}/mo</td>
                      <td className="py-2 px-3" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{agent.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showApplyModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card w-full max-w-md">
            <h2 className="text-xl font-bold mb-4" style={{ color: isDark ? '#fff' : '#111827' }}>
              Apply {selectedTemplate.name} Template
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="input-field"
                />
              </div>
              <div className="p-3 rounded-lg" style={{ background: isDark ? '#1f2937' : '#f3f4f6' }}>
                <div className="flex justify-between mb-2">
                  <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Total Agents</span>
                  <span style={{ color: isDark ? '#fff' : '#111827' }}>{selectedTemplate.agents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Monthly Budget</span>
                  <span style={{ color: '#22c55e' }}>${selectedTemplate.monthly_budget}/mo</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={applyTemplate} className="btn-primary flex-1">
                  Apply Template
                </button>
                <button 
                  onClick={() => setShowApplyModal(false)} 
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