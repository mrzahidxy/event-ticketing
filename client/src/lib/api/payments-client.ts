'use client'

import { apiClient } from '@/lib/api'
import {
  extractList,
  normalizePaymentRecord,
  toObject,
  unwrapData,
} from '@/lib/api/normalizers'
import type { PaymentRecord } from '@/types/domain'

export type CreateCheckoutSessionRequest = {
  bookingId: number
  successUrl: string
  cancelUrl: string
}

export type CheckoutSessionResponse = {
  payment?: PaymentRecord
  sessionId: string
  url: string
}

type RawCheckoutSessionResponse = CheckoutSessionResponse & {
  message?: string
}

async function createCheckoutSession(
  input: CreateCheckoutSessionRequest,
) {
  const response = await apiClient.post<RawCheckoutSessionResponse>(
    '/api/payments/checkout-session',
    input,
    {
      auth: true,
    },
  )
  const record = toObject(unwrapData(response) ?? response)

  return {
    sessionId:
      typeof record?.sessionId === 'string'
        ? record.sessionId
        : typeof record?.id === 'string'
          ? record.id
          : '',
    url: typeof record?.url === 'string' ? record.url : '',
    payment: record?.payment ? normalizePaymentRecord(record.payment) : undefined,
  } satisfies CheckoutSessionResponse
}

export async function getPaymentHistory() {
  const response = await apiClient.get<unknown>(
    '/api/payments/history',
    {
      auth: true,
      cache: 'no-store',
    },
  )

  return extractList(response, ['payments', 'history'], normalizePaymentRecord)
}
