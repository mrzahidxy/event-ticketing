'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { MoreVertical } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/features/admin/components/ui/dropdown-menu'

import type { AdminUserRole } from '../../api/user-client'
import type { DialogAction, DirectoryUser } from './types'
import { ROLE_OPTIONS } from './constants'

type CreateUsersColumnsOptions = {
  onRequestAction: (user: DirectoryUser, action: DialogAction) => void
  onRoleChange: (user: DirectoryUser, role: AdminUserRole) => void
  isAdmin: boolean
  currentUserId: string | null
  isMutatingAction: boolean
  isRoleUpdating: boolean
}

export function createUsersColumns({
  onRequestAction,
  onRoleChange,
  isAdmin,
  currentUserId,
  isMutatingAction,
  isRoleUpdating,
}: CreateUsersColumnsOptions): ColumnDef<DirectoryUser>[] {
  return [
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'organizer',
      header: 'Organizer',
    },
    {
      accessorKey: 'roleLabel',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.roleLabel}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdDate',
      header: 'Created',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original
        const isSelf = user.id === currentUserId
        const disableManagement = !isAdmin || isSelf

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={disableManagement}>
                    Change role
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {ROLE_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => onRoleChange(user, option.value)}
                        disabled={
                          disableManagement ||
                          option.value === user.roleValue ||
                          isRoleUpdating
                        }
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onClick={() => onRequestAction(user, 'delete')}
                  className="text-rose-600 focus:text-rose-600"
                  disabled={disableManagement || isMutatingAction}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}
