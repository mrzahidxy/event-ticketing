import Link from 'next/link'
import type { Route } from 'next'
import { redirect } from 'next/navigation'

import { RegisterForm } from '@/features/auth'
import { auth } from '@/lib/auth'
import { getDefaultRedirectForRole } from '@/auth/routes'

export default async function RegisterPage() {
  const session = await auth()
  if (session?.user) {
    redirect(getDefaultRedirectForRole(session.user.role) as Route)
  }

  return (
    <div className="space-y-6">
      <RegisterForm />
      <p className="text-center text-xs text-white/75">
        Already have an account?{' '}
        <Link className="text-sky-300 hover:text-sky-200" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}
