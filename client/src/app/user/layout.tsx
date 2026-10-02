import type { ReactNode } from 'react'
import { Building2 } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
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
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Account
            </p>
            <h1 className="text-base font-semibold text-slate-900">My Bookings</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <nav
              aria-label="User navigation"
              className="flex items-center gap-3 sm:gap-5"
            >
              <Link
                href="/organizers"
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-teal-700"
              >
                <Building2 aria-hidden="true" className="h-4 w-4" />
                <span>Explore Events</span>
              </Link>
            </nav>
            <UserMenu name={name} email={email} role={role} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
