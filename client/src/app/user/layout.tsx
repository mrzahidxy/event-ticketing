import type { ReactNode } from 'react'
import type { Route } from 'next'
import { redirect } from 'next/navigation'

import { ThemeToggle } from '@/components/ui/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import { auth } from '@/lib/auth'
import { normalizeUserRole } from '@/types/user'

type UserLayoutProps = {
  children: ReactNode
}

export default async function UserLayout({ children }: UserLayoutProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const role = normalizeUserRole(session.user.role)
  if (role !== 'USER') {
    if (role === 'ADMIN') {
      redirect('/admin/overview' as Route)
    }

    if (role === 'OWNER' || role === 'STAFF') {
      redirect('/business-owner/dashboard' as Route)
    }

    redirect('/access-denied' as Route)
  }

  const name = session.user.name ?? 'Signed-in user'
  const email = session.user.email ?? 'No email on file'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Account
            </p>
            <h1 className="text-base font-semibold text-slate-900">My Bookings</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle label="" />
            <UserMenu name={name} email={email} role={role} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
