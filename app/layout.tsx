'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setTheme] = useState('dark')

  return (
    <html lang="en" data-theme={theme}>
      <body className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <nav className={`fixed top-0 left-0 h-full w-20 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex flex-col items-center py-6 z-50`}>
          <div className="text-2xl font-bold text-blue-500 mb-8">AF</div>
          
          <NavLink href="/" icon="📊" label="Dashboard" theme={theme} />
          <NavLink href="/office" icon="🏢" label="Office" theme={theme} />
          <NavLink href="/agents" icon="🤖" label="Agents" theme={theme} />
          <NavLink href="/tasks" icon="📋" label="Tasks" theme={theme} />
          <NavLink href="/hr" icon="👥" label="HR" theme={theme} />
          <NavLink href="/analytics" icon="📈" label="Analytics" theme={theme} />
          <NavLink href="/settings" icon="⚙️" label="Settings" theme={theme} />
          
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="mt-auto p-2 rounded-lg hover:bg-gray-700"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
        
        <main className="ml-20 p-6">
          {children}
        </main>
      </body>
    </html>
  )
}

function NavLink({ href, icon, label, theme }: { href: string; icon: string; label: string; theme: string }) {
  return (
    <Link href={href} className="flex flex-col items-center py-3 px-2 hover:bg-gray-700 rounded-lg mb-1 transition-colors">
      <span className="text-xl">{icon}</span>
      <span className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
    </Link>
  )
}