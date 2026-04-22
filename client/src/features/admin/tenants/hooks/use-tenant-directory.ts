'use client'

import { useMemo, useState } from 'react'
import type { Tenant } from '@/features/admin/tenants/tenant-detail-drawer'

export type TenantStatusFilter = 'all' | 'active' | 'suspended'
export type TenantAction = 'suspend' | 'reactivate' | 'delete'

type ConfirmDialogState = {
  isOpen: boolean
  tenant: Tenant | null
  action: TenantAction
}

const defaultConfirmState: ConfirmDialogState = {
  isOpen: false,
  tenant: null,
  action: 'suspend',
}

export function useTenantDirectory(tenants: Tenant[]) {
  const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(defaultConfirmState)

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && tenant.status === 'Active') ||
        (statusFilter === 'suspended' && tenant.status === 'Suspended')

      const normalizedQuery = searchQuery.toLowerCase()

      const matchesSearch =
        tenant.name.toLowerCase().includes(normalizedQuery) ||
        tenant.ownerEmail.toLowerCase().includes(normalizedQuery) ||
        tenant.slug.toLowerCase().includes(normalizedQuery)

      return matchesStatus && matchesSearch
    })
  }, [tenants, searchQuery, statusFilter])

  const requestAction = (tenantId: string, action: TenantAction) => {
    const tenant = tenants.find((entry) => entry.id === tenantId) ?? null
    setConfirmDialog({ isOpen: true, tenant, action })
  }

  const resetConfirmDialog = () => setConfirmDialog(defaultConfirmState)

  return {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    confirmDialog,
    filteredTenants,
    requestAction,
    resetConfirmDialog,
  }
}
