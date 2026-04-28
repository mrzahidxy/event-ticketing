import type { ReactNode } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

import { UserMenu } from '@/components/layout/user-menu'
import { NavLinks } from '@/components/navigation/nav-links'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { appConfig } from '@/config/app'
import { auth } from '@/lib/auth'

type AppShellProps = {
  children: ReactNode
}

export async function AppShell({ children }: AppShellProps) {
  const session = await auth()
  const name = session?.user?.name ?? 'Signed-in user'
  const email = session?.user?.email ?? 'No email on file'
  const role = session?.user?.role ?? 'owner'

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-72 flex-col border-r border-border bg-card px-6 py-8 shadow-soft lg:flex">
        <div className="mb-6 flex items-center gap-3 border-b border-border pb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <span className="text-lg font-semibold">NB</span>
          </div>
            <div>
            <Link
              href="/business-owner/dashboard"
              className="text-lg font-semibold text-foreground"
            >
              {appConfig.name}
            </Link>
            <p className="text-xs text-muted-foreground">Organizer Console</p>
          </div>
        </div>

        <nav className="flex-1 pt-4">
          <NavLinks />
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-primary text-primary-foreground">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-foreground/80">
              <Bell className="h-4 w-4 text-primary-foreground/80" />
              <span>{appConfig.name} / web</span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <ThemeToggle label="" />
              <UserMenu name={name} email={email} role={role} />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
