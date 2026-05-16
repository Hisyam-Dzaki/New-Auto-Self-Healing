'use client'
import { useTheme } from '../lib/theme'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function ThemeCard({ title, children, className = '' }: CardProps) {
  const { theme } = useTheme()
  
  const styles = {
    dark: 'bg-gray-800 border-gray-700',
    light: 'bg-white border-gray-200',
    ocean: 'bg-[#1e3a5f] border-blue-800',
    forest: 'bg-[#1e3d1e] border-green-800',
  }
  
  const titleStyles = {
    dark: 'text-white',
    light: 'text-gray-900',
    ocean: 'text-white',
    forest: 'text-white',
  }

  return (
    <div className={`rounded-xl p-5 border ${styles[theme]} ${className}`}>
      {title && <h2 className={`text-lg font-semibold mb-4 ${titleStyles[theme]}`}>{title}</h2>}
      {children}
    </div>
  )
}

export function useThemeStyles() {
  const { theme } = useTheme()
  
  return {
    bg: theme === 'dark' ? 'bg-gray-900' : theme === 'light' ? 'bg-gray-100' : theme === 'ocean' ? 'bg-[#0f172a]' : 'bg-[#0f1f0f]',
    bgSecondary: theme === 'dark' ? 'bg-gray-800' : theme === 'light' ? 'bg-white' : theme === 'ocean' ? 'bg-[#1e3a5f]' : 'bg-[#1e3d1e]',
    bgTertiary: theme === 'dark' ? 'bg-gray-700' : theme === 'light' ? 'bg-gray-200' : theme === 'ocean' ? 'bg-[#2563eb]' : 'bg-[#22c55e]',
    border: theme === 'dark' ? 'border-gray-700' : theme === 'light' ? 'border-gray-200' : theme === 'ocean' ? 'border-blue-800' : 'border-green-800',
    text: theme === 'dark' || theme === 'ocean' || theme === 'forest' ? 'text-white' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-gray-300' : theme === 'light' ? 'text-gray-700' : theme === 'ocean' ? 'text-blue-200' : 'text-green-200',
    textMuted: theme === 'dark' ? 'text-gray-400' : theme === 'light' ? 'text-gray-500' : theme === 'ocean' ? 'text-blue-400' : 'text-green-400',
    input: theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-900' : theme === 'ocean' ? 'bg-[#1e3a5f] border-blue-700 text-white' : 'bg-[#1e3d1e] border-green-700 text-white',
    button: theme === 'ocean' ? 'bg-blue-600 hover:bg-blue-500' : theme === 'forest' ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600',
  }
}

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  const { theme } = useTheme()
  const textMuted = theme === 'dark' ? 'text-gray-400' : theme === 'light' ? 'text-gray-500' : theme === 'ocean' ? 'text-blue-400' : 'text-green-400'
  
  return (
    <div className="flex items-center justify-center h-64">
      <div className={`text-2xl ${textMuted}`}>{message}</div>
    </div>
  )
}