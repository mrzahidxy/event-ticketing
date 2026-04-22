import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type QuickActionProps = {
  icon?: ReactNode
  label: string
  description?: string
  onClick?: () => void
  href?: string
}

export function QuickActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4',
        className
      )}
    >
      {children}
    </div>
  )
}

export function QuickAction({
  icon,
  label,
  description,
  onClick,
  href,
}: QuickActionProps) {
  const content = (
    <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
      {icon ? <span className="text-teal-600">{icon}</span> : null}
      <span>{label}</span>
      {description ? (
        <span className="text-xs font-normal text-slate-500">{description}</span>
      ) : null}
    </span>
  )

  if (href) {
    return (
      <a href={href} onClick={onClick}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick}>
      {content}
    </button>
  )
}
