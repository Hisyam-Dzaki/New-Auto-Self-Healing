import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Office from './pages/Office'
import Agents from './pages/Agents'
import Tasks from './pages/Tasks'
import HR from './pages/HR'
import Projects from './pages/Projects'
import Budget from './pages/Budget'
import Templates from './pages/Templates'
import SelfHealing from './pages/SelfHealing'
import GitHub from './pages/GitHub'
import Chat from './pages/Chat'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

type Theme = 'dark' | 'light'

const navItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/office', icon: '🏢', label: 'Office' },
  { path: '/agents', icon: '🤖', label: 'Agents' },
  { path: '/tasks', icon: '📋', label: 'Tasks' },
  { path: '/hr', icon: '👥', label: 'HR' },
  { path: '/projects', icon: '📁', label: 'Projects' },
  { path: '/budget', icon: '💰', label: 'Budget' },
  { path: '/templates', icon: '📦', label: 'Templates' },
  { path: '/self-healing', icon: '🩹', label: 'Healing' },
  { path: '/github', icon: '🐙', label: 'GitHub' },
  { path: '/chat', icon: '💬', label: 'Chat' },
  { path: '/analytics', icon: '📈', label: 'Analytics' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [isClient, setIsClient] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setIsClient(true)
    const saved = localStorage.getItem('agentforge-theme') as Theme
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    if (isClient) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme, isClient])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('agentforge-theme', newTheme)
  }

  const currentTheme = isClient ? theme : 'dark'
  const isDark = currentTheme === 'dark'

  return (
    <div className="min-h-screen" style={{ background: isDark ? '#111827' : '#f9fafb' }}>
      <nav 
        className="fixed top-0 left-0 h-full w-20 flex flex-col items-center py-6 z-50"
        style={{ background: isDark ? '#1f2937' : '#ffffff', borderRight: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
      >
        <div className="text-2xl font-bold text-blue-500 mb-8">AF</div>
        
        {navItems.map(item => (
          <Link 
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center py-3 px-2 rounded-lg mb-1 transition-colors ${
              location.pathname === item.path 
                ? 'bg-blue-500/20 text-blue-500' 
                : 'hover:bg-gray-500/20'
            }`}
            style={{ color: location.pathname === item.path ? '#3b82f6' : (isDark ? '#d1d5db' : '#4b5563') }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{item.label}</span>
          </Link>
        ))}
        
        <button 
          onClick={toggleTheme}
          className="mt-auto p-2 rounded-lg"
          style={{ background: isDark ? '#374151' : '#f3f4f6' }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </nav>
      
      <main className="ml-20 p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/office" element={<Office />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/hr" element={<HR />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/self-healing" element={<SelfHealing />} />
          <Route path="/github" element={<GitHub />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}