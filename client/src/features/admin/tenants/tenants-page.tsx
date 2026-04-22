'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Database, MoreVertical } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { DataTable } from '@/components/data-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatDate } from '@/lib/format'
import { slugify } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/admin/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/admin/components/ui/card'
import { ConfirmationDialog } from '@/features/admin/components/confirmation-dialog'
import {
  deleteAdminOrganizer,
  listAdminOrganizers,
  updateAdminOrganizerStatus,
} from '@/features/admin/api/admin-client'
import { listUsers } from '@/features/admin/users/api/user-client'
import { createOrganizer } from '@/features/business-owner/team/api/organizer-client'
import { TenantToolbar } from './components/tenant-toolbar'
import { useTenantDirectory } from './hooks/use-tenant-directory'
import type { Tenant } from './tenant-detail-drawer'

export function TenantsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    ownerEmail: '',
  })
  const {
    data: organizers = [],
    isLoading,
    error: organizersError,
  } = useQuery({
    queryKey: ['admin-organizers'],
    queryFn: listAdminOrganizers,
  })

  const statusMutation = useMutation({
    mutationFn: ({
      organizerId,
      status,
    }: {
      organizerId: string
      status: 'active' | 'suspended'
    }) => updateAdminOrganizerStatus(organizerId, status),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'suspended'
          ? 'Organizer suspended successfully'
          : 'Organizer reactivated successfully',
      )
      queryClient.invalidateQueries({ queryKey: ['admin-organizers'] })
    },
    onError: (mutationError: unknown) => {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Failed to update organizer')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminOrganizer,
    onSuccess: () => {
      toast.success('Organizer deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-organizers'] })
    },
    onError: (mutationError: unknown) => {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Failed to delete organizer')
    },
  })

  const createMutation = useMutation({
    mutationFn: async ({ name, ownerEmail }: { name: string; ownerEmail: string }) => {
      const users = await listUsers({
        limit: 20,
        page: 1,
        role: 'OWNER',
        search: ownerEmail,
      })

      const ownerUser = users.users.find(
        (user) => user.email.toLowerCase() === ownerEmail.toLowerCase(),
      )

      if (!ownerUser) {
        throw new Error('No OWNER user found with that email')
      }

      if (ownerUser.role !== 'OWNER') {
        throw new Error('Selected email does not belong to an OWNER user')
      }

      const ownerId = Number(ownerUser.id)

      if (!Number.isInteger(ownerId) || ownerId <= 0) {
        throw new Error('Resolved owner user id is invalid')
      }

      return createOrganizer({ name, ownerId })
    },
    onSuccess: () => {
      toast.success('Organizer created successfully')
      setCreateForm({ name: '', ownerEmail: '' })
      setIsCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-organizers'] })
    },
    onError: (mutationError: unknown) => {
      toast.error(
        mutationError instanceof Error ? mutationError.message : 'Failed to create organizer',
      )
    },
  })

  const tenants = useMemo<Tenant[]>(() => {
    return organizers.map((organizer) => ({
      id: organizer.organizerId,
      name: organizer.organizer,
      slug: slugify(organizer.organizer),
      ownerEmail: organizer.ownerEmail || '—',
      landingPageHref: `/organizers/${organizer.organizerId}`,
      createdDate: organizer.createdAt ? formatDate(organizer.createdAt) : '—',
      lastActive: organizer.updatedAt ? formatDate(organizer.updatedAt) : '—',
      status: organizer.status === 'Suspended' ? 'Suspended' : 'Active',
    }))
  }, [organizers])

  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    confirmDialog,
    filteredTenants,
    requestAction,
    resetConfirmDialog,
  } = useTenantDirectory(tenants)

  const hasError = Boolean(organizersError)
  const isMutating = statusMutation.isPending || deleteMutation.isPending

  const columns: ColumnDef<Tenant>[] = [
    {
      accessorKey: 'name',
      header: 'Organizer',
      cell: ({ row }) => (
        <div className="flex flex-col">
          {row.original.landingPageHref ? (
            <Link
              href={row.original.landingPageHref as Route}
              className="font-semibold text-slate-900 hover:text-teal-600"
            >
              {row.original.name}
            </Link>
          ) : (
            <span className="font-semibold text-slate-900">{row.original.name}</span>
          )}
          <span className="text-sm text-slate-500">/{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: 'ownerEmail',
      header: 'Owner Email',
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">{row.original.ownerEmail}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'Active' ? 'success' : 'outline'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdDate',
      header: 'Created',
    },
    {
      accessorKey: 'lastActive',
      header: 'Last Active',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.original.status === 'Active' ? (
                <DropdownMenuItem
                  disabled={isMutating}
                  onClick={() => requestAction(row.original.id, 'suspend')}
                >
                  Suspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={isMutating}
                  onClick={() => requestAction(row.original.id, 'reactivate')}
                >
                  Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={isMutating}
                onClick={() => requestAction(row.original.id, 'delete')}
                className="text-rose-600 focus:text-rose-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>Organizers</h1>
            <p className="text-muted-foreground">Manage organizer accounts and operational access</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Database className="mr-2 h-4 w-4" />
            Create Organizer
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organizer Directory</CardTitle>
          </CardHeader>
          <CardContent>
            {hasError ? (
              <Alert className="mb-6" variant="destructive">
                <AlertTitle>Unable to load organizers</AlertTitle>
                <AlertDescription>
                  The organizer directory depends on `/api/admin/organizers` in the backend. Check
                  your admin session and API availability, then reload the page.
                </AlertDescription>
              </Alert>
            ) : null}

            <DataTable
              columns={columns}
              data={filteredTenants}
              isLoading={isLoading}
              emptyMessage={
                isLoading
                  ? 'Loading organizers...'
                  : 'No organizers were returned by the admin organizer directory API.'
              }
              toolbar={
                <TenantToolbar
                  searchQuery={searchQuery}
                  statusFilter={statusFilter}
                  onSearchChange={setSearchQuery}
                  onStatusChange={setStatusFilter}
                />
              }
            />

          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={confirmDialog.isOpen}
        onClose={resetConfirmDialog}
        onConfirm={async () => {
          if (!confirmDialog.tenant) {
            resetConfirmDialog()
            return
          }

          try {
            if (confirmDialog.action === 'delete') {
              await deleteMutation.mutateAsync(confirmDialog.tenant.id)
            } else {
              await statusMutation.mutateAsync({
                organizerId: confirmDialog.tenant.id,
                status: confirmDialog.action === 'suspend' ? 'suspended' : 'active',
              })
            }

            resetConfirmDialog()
          } catch {
            // handled in mutation callbacks
          }
        }}
        title={
          confirmDialog.action === 'delete'
            ? 'Delete organizer'
            : confirmDialog.action === 'suspend'
            ? 'Suspend organizer'
            : 'Reactivate organizer'
        }
        description={
          confirmDialog.action === 'delete'
            ? `Are you sure you want to delete "${confirmDialog.tenant?.name}"? This action cannot be undone.`
            : confirmDialog.action === 'suspend'
            ? `Suspend "${confirmDialog.tenant?.name}"? They will temporarily lose access to organizer operations.`
            : `Reactivate "${confirmDialog.tenant?.name}"? They will regain access to organizer operations.`
        }
        actionLabel={confirmDialog.action === 'delete' ? 'Delete' : 'Confirm'}
        variant={confirmDialog.action === 'delete' ? 'destructive' : 'default'}
      />

      <Modal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create organizer"
        description="Creates a new organizer using the backend `/organizers` endpoint."
      >
        <div className="space-y-4">
          <FormField label="Organizer name" htmlFor="create-organizer-name">
            <Input
              id="create-organizer-name"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </FormField>
          <FormField
            label="Owner email"
            htmlFor="create-organizer-owner-email"
            description="Searches OWNER users by email and assigns matched owner."
          >
            <Input
              id="create-organizer-owner-email"
              type="email"
              placeholder="owner@example.com"
              value={createForm.ownerEmail}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, ownerEmail: event.target.value }))
              }
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const trimmedName = createForm.name.trim()
                const ownerEmail = createForm.ownerEmail.trim()

                if (!trimmedName) {
                  toast.error('Organizer name is required')
                  return
                }

                if (!ownerEmail) {
                  toast.error('Owner email is required')
                  return
                }

                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailPattern.test(ownerEmail)) {
                  toast.error('Enter a valid owner email address')
                  return
                }

                createMutation.mutate({ name: trimmedName, ownerEmail })
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create organizer'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
