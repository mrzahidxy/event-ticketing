import Link from 'next/link'
import { signOut } from '@/auth/options'

import { Button } from '@/components/ui/button'

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-semibold text-slate-900">Access is not configured</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account is signed in, but it does not have an application role yet. Ask an admin to
          assign a role and business, then sign in again.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <Button type="submit">Sign out</Button>
          </form>
          <Link href="/login">
            <Button variant="outline" type="button">
              Back to login
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
