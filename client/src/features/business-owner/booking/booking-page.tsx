import type { Metadata } from 'next'

import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { BookingTable } from './components/booking-table'

export const metadata: Metadata = {
  title: 'Bookings',
}

export default function BookingPage() {
  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Bookings"
        description="Manage attendee bookings, stay dates, and booking totals"
      />

      <BookingTable />
    </div>
  )
}

