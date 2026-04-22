'use client'

import { Search } from 'lucide-react'
import type { TenantStatusFilter } from '@/features/admin/tenants/hooks/use-tenant-directory'

import { Input } from '@/components/ui/input'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/admin/components/ui/select'

type TenantToolbarProps = {
  searchQuery: string
  statusFilter: TenantStatusFilter
  onSearchChange: (value: string) => void
  onStatusChange: (value: TenantStatusFilter) => void
}

export function TenantToolbar({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: TenantToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by organizer, email, or slug..."
          className="pl-9"
        />
      </div>

      <Select
        value={statusFilter}
        onValueChange={(value: TenantStatusFilter) => onStatusChange(value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
