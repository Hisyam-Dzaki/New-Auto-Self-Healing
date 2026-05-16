'use client'
import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('agentforge-theme') as Theme
    if (saved) setTheme(saved)
  }, [])

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('agentforge-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    handleSetTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return { 
    theme, 
    setTheme: handleSetTheme, 
    isDark: theme === 'dark',
    toggleTheme,
    mounted 
  }
}