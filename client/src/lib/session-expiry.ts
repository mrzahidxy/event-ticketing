let logoutInFlight: Promise<void> | null = null

export async function logoutForExpiredSession() {
  if (typeof window === 'undefined') {
    return
  }

  if (logoutInFlight) {
    return logoutInFlight
  }

  logoutInFlight = (async () => {
    const [{ useAuthStore }, { signOut }] = await Promise.all([
      import('@/stores/auth-store'),
      import('next-auth/react'),
    ])

    useAuthStore.getState().clearSession()

    await signOut({
      callbackUrl: '/login',
      redirect: true,
    })
  })().finally(() => {
    logoutInFlight = null
  })

  return logoutInFlight
}
