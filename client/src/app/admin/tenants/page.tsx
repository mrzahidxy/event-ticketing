import type { Route } from 'next'
import { redirect } from 'next/navigation'

export default function AdminTenantsPage() {
  redirect('/admin/organizers' as Route)
}
