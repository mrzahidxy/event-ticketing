'use client'

import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  MenuSquare,
  ScanLine,
  Users,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { normalizeUserRole } from '@/types/user'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const baseNavigation: NavItem[] = [
  {
    href: '/business-owner/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/business-owner/bookings',
    label: 'Bookings',
    icon: MenuSquare,
  },
  {
    href: '/business-owner/event',
    label: 'Events',
    icon: CalendarDays,
  },
  {
    href: '/business-owner/analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    href: '/business-owner/team',
    label: 'Team',
    icon: Users,
  },
]

const checkInNavigation: NavItem = {
  href: '/business-owner/check-in',
  label: 'Ticket check-in',
  icon: ScanLine,
}

const staffNavigation: NavItem[] = [baseNavigation[0], checkInNavigation]

export function NavLinks({ role }: { role: string }) {
  const pathname = usePathname()
  const normalizedRole = normalizeUserRole(role)
  const navigation =
    normalizedRole === 'STAFF'
      ? staffNavigation
      : normalizedRole === 'OWNER'
        ? [...baseNavigation, checkInNavigation]
        : baseNavigation

  return (
    <nav className="flex flex-col gap-1 text-slate-600">
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={cn(
              'group inline-flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
              isActive
                ? 'bg-slate-100 font-semibold text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 transition',
                isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-700',
              )}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
