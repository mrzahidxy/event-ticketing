'use client'

import { useMemo } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/admin/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { getInitials, toTitleCase } from '@/lib/utils'

type UserMenuProps = {
  name?: string | null
  email?: string | null
  role?: string | null
}

const formatRole = (role?: string | null) => {
  if (!role) return 'Organizer'
  return toTitleCase(role)
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  const initials = useMemo(() => getInitials(name ?? '', 2) || 'EN', [name])
  const displayName = name ?? 'Avery Booker'
  const displayEmail = email ?? 'organizer@example.com'
  const displayRole = formatRole(role)

  const handleSignOut = () => {
    void signOut({ callbackUrl: '/login' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-900 hover:bg-slate-50 hover:text-slate-900"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700 shadow-inner">
            {initials}
          </div>
          <div className="hidden text-left text-xs sm:block">
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-600">
              {displayRole}
            </p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p>{displayEmail}</p>
          <p className="uppercase tracking-wide">{displayRole}</p>
        </div>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            handleSignOut()
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
