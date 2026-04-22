import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Script from 'next/script'
import { Inter } from 'next/font/google'

import { AppProvider } from '@/components/providers/app-provider'
import { appConfig } from '@/config/app'
import {
  DEFAULT_THEME_MODE,
  getThemeClassName,
  getThemeInitializerScript,
  resolveThemeMode,
  THEME_STORAGE_KEY,
} from '@/lib/theme'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s | ${appConfig.name}`,
  },
  description: appConfig.description,
  metadataBase: new URL(appConfig.url),
  openGraph: {
    title: appConfig.name,
    description: appConfig.description,
    type: 'website',
    url: appConfig.url,
  },
  icons: {
    icon: '/favicon.ico',
  },
}

type RootLayoutProps = {
  children: ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies()
  const storedTheme = cookieStore.get(THEME_STORAGE_KEY)?.value ?? null
  const initialTheme = resolveThemeMode(storedTheme, DEFAULT_THEME_MODE)
  const htmlClassName = getThemeClassName(initialTheme)

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={htmlClassName}
      data-theme={initialTheme}
    >
      <head>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {getThemeInitializerScript()}
        </Script>
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-background text-foreground`}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
