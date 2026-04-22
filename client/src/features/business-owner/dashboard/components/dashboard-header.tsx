import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DashboardHeaderProps = {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function DashboardHeader({
  title,
  description,
  icon,
  actions,
  className,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-6 rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-soft sm:px-10',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <span className="rounded-2xl border border-teal-100 bg-teal-50 p-3 text-teal-600">
            {icon}
          </span>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  )
}
