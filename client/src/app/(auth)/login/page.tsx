import { LoginForm } from '@/features/auth';
import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDefaultRedirectForRole } from '@/auth/routes';


export default async function LoginPage() {
  const session = await auth()

  if (session?.user) {
    redirect(getDefaultRedirectForRole(session.user.role) as Route)
  }

  return (
    <div className="space-y-6">
      <LoginForm />
      <p className="text-center text-xs text-white/60">
        Need an account?{' '}
        <Link className="text-white hover:text-white/80" href="/register">
          Register now
        </Link>
      </p>
    </div>
  )
}
