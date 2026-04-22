'use client';

import type { ReactNode } from 'react';
import { Avatar, AvatarFallback } from '@/features/admin/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/admin/components/ui/dropdown-menu';
import { Building2, LayoutDashboard, LogOut, Search, Users } from 'lucide-react';
import type { Route } from 'next';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getInitials } from '@/lib/utils';


const navItems = [
  {
    href: '/admin/overview',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/organizers',
    label: 'Organizers',
    icon: Building2,
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
  },
] as const

type AdminShellProps = {
  children: ReactNode
  user: {
    name: string
    email: string
  }
}

export function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname()

  const initials = getInitials(user.name, 2) || 'SA'

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
        <div className="flex h-16 items-center gap-4 px-6">
          <nav className="ml-8 hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/20 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <div className="relative hidden w-64 md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search organizers or users..." className="pl-9" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuItem
                  onClick={() =>
                    signOut({
                      callbackUrl: '/login',
                    })
                  }
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  )
}
