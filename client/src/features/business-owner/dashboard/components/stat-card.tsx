import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type StatCardProps = {
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  trend?: {
    value: string
    isPositive?: boolean
  }
  className?: string
}

export function StatCard({
  label,
  value,
  helper,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <article
      className={cn(
        'flex flex-1 min-w-[220px] flex-col gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-soft',
        className
      )}
    >
      <div className="flex items-center gap-3 text-sm text-slate-500">
        {icon ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-600">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
          {trend?.value ? (
            <span
              className={cn(
                'font-semibold',
                trend.isPositive ? 'text-emerald-600' : 'text-rose-500'
              )}
            >
              {trend.value}
            </span>
          ) : null}
          {helper ? <span>{helper}</span> : null}
        </div>
      </div>
    </article>
  )
}
