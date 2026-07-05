'use client'

import { apiClient } from '@/lib/api'
import {
  extractList,
  normalizePaymentRecord,
} from '@/lib/api/normalizers'

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
