'use client'

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/admin/components/ui/select'

import type { StatusFilterOption } from './types'

type UsersTableHeaderProps = {
  searchQuery: string
  statusFilter: StatusFilterOption
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: StatusFilterOption) => void
}

export function UsersTableHeader({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
}: UsersTableHeaderProps) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by email or organizer..."
          className="pl-10"
        />
      </div>
      <Select
        value={statusFilter}
        onValueChange={(value: StatusFilterOption) => onStatusFilterChange(value)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All</SelectItem>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
