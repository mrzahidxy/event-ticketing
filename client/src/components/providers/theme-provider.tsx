'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  applyThemeMode,
  DEFAULT_THEME_MODE,
  resolveThemeMode,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '@/lib/theme'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: ThemeMode
  storageKey?: string
}

function readCookieTheme(storageKey: string) {
  if (typeof document === 'undefined') {
    return null
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${storageKey}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME_MODE,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedTheme = window.localStorage.getItem(storageKey)
    const cookieTheme = readCookieTheme(storageKey)
    setThemeState(resolveThemeMode(storedTheme ?? cookieTheme, defaultTheme))
  }, [defaultTheme, storageKey])

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    applyThemeMode(theme)
    window.localStorage.setItem(storageKey, theme)
    document.cookie = `${storageKey}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`
  }, [storageKey, theme])

  const setTheme = useCallback((value: ThemeMode) => {
    setThemeState(value)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((previous) => (previous === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
