'use client'
import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import './globals.css'

type Theme = 'dark' | 'light'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [isClient, setIsClient] = useState(false)

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

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('agentforge-theme', newTheme)
  }

  // Always render dark by default to match server
  const currentTheme = isClient ? theme : 'dark'
  const isDark = currentTheme === 'dark'
  
  const navItems = [
    { href: '/', icon: '📊', label: 'Dashboard' },
    { href: '/office', icon: '🏢', label: 'Office' },
    { href: '/agents', icon: '🤖', label: 'Agents' },
    { href: '/tasks', icon: '📋', label: 'Tasks' },
    { href: '/hr', icon: '👥', label: 'HR' },
    { href: '/projects', icon: '📁', label: 'Projects' },
    { href: '/budget', icon: '💰', label: 'Budget' },
    { href: '/templates', icon: '📦', label: 'Templates' },
    { href: '/self-healing', icon: '🩹', label: 'Healing' },
    { href: '/github', icon: '🐙', label: 'GitHub' },
    { href: '/chat', icon: '💬', label: 'Chat' },
    { href: '/analytics', icon: '📈', label: 'Analytics' },
    { href: '/settings', icon: '⚙️', label: 'Settings' },
  ]

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="min-h-screen" style={{ background: isDark ? '#111827' : '#f9fafb' }}>
      <nav 
        className="fixed top-0 left-0 h-full w-20 flex flex-col items-center py-6 z-50"
        style={{ background: isDark ? '#1f2937' : '#ffffff', borderRight: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}
      >
        <div className="text-2xl font-bold text-blue-500 mb-8">AF</div>
        
        {navItems.map(item => (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center py-3 px-2 rounded-lg mb-1 transition-colors"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs mt-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{item.label}</span>
          </Link>
        ))}
        
        <button 
          onClick={() => handleSetTheme(isDark ? 'light' : 'dark')}
          className="mt-auto p-2 rounded-lg"
          style={{ background: isDark ? '#374151' : '#f3f4f6' }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </nav>
      
      <main className="ml-20 p-6">
        {children}
      </main>
      </div>
      </body>
    </html>
  )
}