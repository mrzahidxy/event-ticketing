'use client'

import { apiClient } from '@/lib/api'

export type TicketCheckInResult = {
  ticket: {
    id: string
    status: 'CHECKED_IN'
    checkedInAt: string
  }
  checkIn: {
    id: number
    ticketId: string
    checkedInByUserId: number
    checkedInAt: string
    scanSource: 'QR'
  }
}

type ApiEnvelope<T> = {
  data: T
  message?: string
}

export async function checkInTicket(qrPayload: string): Promise<TicketCheckInResult> {
  const response = await apiClient.post<
    TicketCheckInResult | ApiEnvelope<TicketCheckInResult>
  >(
    '/api/tickets/check-in',
    { qrPayload },
    { auth: true },
  )

  return 'data' in response ? response.data : response
}
