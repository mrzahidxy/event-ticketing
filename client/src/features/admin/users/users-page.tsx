'use client'

import { Button } from '@/components/ui/button'

import { UsersTable } from './components'
import { useUsersTable } from './components/users-table/use-users-table'

export function UsersPage() {
  const table = useUsersTable()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Users &amp; Roles</h1>
          <p className="text-muted-foreground">
            Manage platform-wide users, organizer access, and role assignments
          </p>
        </div>
        <Button onClick={table.openCreateModal} disabled={!table.isAdmin}>
          Create User
        </Button>
      </div>

      <UsersTable table={table} />
    </div>
  )
}
