const baseKey = ['payments'] as const

export const paymentKeys = {
  all: baseKey,
  history: () => [...baseKey, 'history'] as const,
}
