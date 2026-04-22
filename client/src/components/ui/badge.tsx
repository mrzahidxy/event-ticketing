import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'outline' | 'success' | 'warning' | 'destructive'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

export function Badge({
  children,
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide'

  const variants: Record<BadgeVariant, string> = {
    default: 'border-slate-200 bg-slate-100 text-slate-700',
    outline: 'border-slate-300 text-slate-600',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-600',
    warning: 'border-amber-200 bg-amber-50 text-amber-600',
    destructive: 'border-rose-200 bg-rose-50 text-rose-600',
  }

  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
    </span>
  )
}

