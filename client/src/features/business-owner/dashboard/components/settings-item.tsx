import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SettingsItemProps = {
  label: string
  description?: string
  status?: ReactNode
  children?: ReactNode
  className?: string
}

export function SettingsList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white',
        className
      )}
    >
      {children}
    </div>
  )
}

export function SettingsItem({
  label,
  description,
  status,
  children,
  className,
}: SettingsItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {description ? (
          <p className="text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {status ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {status}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  )
}
