import type { ReactNode } from 'react'
import type { Route } from 'next'
import { redirect } from 'next/navigation'

import { AppShell } from '@/components/layout/app-shell'
import { auth } from '@/lib/auth'
import { normalizeUserRole } from '@/types/user'

type BusinessOwnerLayoutProps = {
  children: ReactNode
  modal: ReactNode
}

export default async function BusinessOwnerLayout({ children, modal }: BusinessOwnerLayoutProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const role = normalizeUserRole(session.user.role)

  if (role !== 'OWNER' && role !== 'STAFF' && role !== 'ADMIN') {
    redirect('/login' as Route)
  }

  return (
    <AppShell>
      {children}
      {modal}
    </AppShell>
  )
}
