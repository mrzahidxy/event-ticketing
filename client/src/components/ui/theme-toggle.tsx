'use client'

import { useCallback } from 'react'
import type { ChangeEvent } from 'react'

import { useTheme } from '@/components/providers/theme-provider'
import { Switch } from '@/components/ui/switch'

type ThemeToggleProps = {
  label?: string
}

export function ThemeToggle({ label = 'Dark mode' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTheme(event.target.checked ? 'dark' : 'light')
    },
    [setTheme]
  )

  return <Switch label={label} checked={isDark} onChange={handleChange} />
}
