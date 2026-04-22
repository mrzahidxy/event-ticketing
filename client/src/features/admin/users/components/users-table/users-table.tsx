'use client'

import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { ConfirmationDialog } from '@/features/admin/components/confirmation-dialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/features/admin/components/ui/card'

import { createUsersColumns } from './columns'
import { UserModal } from './user-modal'
import { UsersTableHeader } from './users-table-header'
import type { UsersTableContext } from './use-users-table'

type UsersTableProps = {
  table: UsersTableContext
}

export function UsersTable({ table }: UsersTableProps) {
  const columns = useMemo(
    () =>
      createUsersColumns({
        onRequestAction: table.requestAction,
        onRoleChange: table.handleRoleChange,
        isAdmin: table.isAdmin,
        currentUserId: table.currentUserId,
        isMutatingAction: table.isMutatingAction,
        isRoleUpdating: table.isRoleUpdating,
      }),
    [
      table.currentUserId,
      table.handleRoleChange,
      table.isAdmin,
      table.isMutatingAction,
      table.isRoleUpdating,
      table.requestAction,
    ]
  )

  const toolbar = (
    <UsersTableHeader
      searchQuery={table.searchQuery}
      statusFilter={table.statusFilter}
      onSearchChange={table.setSearchQuery}
      onStatusFilterChange={table.setStatusFilter}
    />
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {table.isInitialLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={table.rows}
              toolbar={toolbar}
              isLoading={table.isFetching}
              emptyMessage="No users found. Adjust filters or create a new user."
            />
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={table.dialog.isOpen}
        onClose={table.resetDialog}
        onConfirm={table.handleConfirmAction}
        title={
          table.dialog.action === 'delete'
            ? 'Delete user'
            : table.dialog.action === 'suspend'
            ? 'Suspend user'
            : 'Activate user'
        }
        description={
          table.dialog.action === 'delete'
            ? `Are you sure you want to delete "${table.dialog.user?.email}"? This action cannot be undone.`
            : table.dialog.action === 'suspend'
            ? `Suspend "${table.dialog.user?.email}"? They will temporarily lose access to their account.`
            : `Activate "${table.dialog.user?.email}"? They will regain access to their account.`
        }
        actionLabel={
          table.isMutatingAction
            ? 'Processing...'
            : table.dialog.action === 'delete'
            ? 'Delete'
            : 'Confirm'
        }
        variant={table.dialog.action === 'delete' ? 'destructive' : 'default'}
      />

      <UserModal
        open={table.isCreateOpen}
        onOpenChange={table.handleCreateOpenChange}
        onSubmit={table.handleCreateUser}
        isSubmitting={table.isCreating}
        canManage={table.isAdmin}
      />
    </>
  )
}
