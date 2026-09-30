import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { normalizeUserRole } from '@/types/user'
import TicketCheckInPage from '@/features/business-owner/check-in/ticket-checkin-page'

export default async function BusinessOwnerCheckInRoute() {
  const session = await auth()
  const role = normalizeUserRole(session?.user?.role)

  if (role !== 'STAFF' && role !== 'OWNER') {
    redirect('/access-denied')
  }

  return <TicketCheckInPage />
}
