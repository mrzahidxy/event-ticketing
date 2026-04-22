import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ActivityTone = 'default' | 'success' | 'warning'

export type Activity = {
  id: string
  title: string
  description?: string
  meta?: string
  icon?: ReactNode
  tone?: ActivityTone
}

type ActivityListProps = {
  items: Activity[]
  footer?: ReactNode
  className?: string
}

const toneStyles: Record<ActivityTone, string> = {
  default: 'bg-slate-100 text-teal-600 border-slate-200',
  success: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  warning: 'bg-amber-50 text-amber-600 border-amber-200',
}

export function ActivityList({ items, footer, className }: ActivityListProps) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border border-slate-200 bg-white p-6',
        className
      )}
    >
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            {item.icon ? (
              <span
                className={cn(
                  'mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border text-sm',
                  toneStyles[item.tone ?? 'default']
                )}
              >
                {item.icon}
              </span>
            ) : null}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {item.title}
              </p>
              {item.description ? (
                <p className="text-xs text-slate-500">{item.description}</p>
              ) : null}
            </div>
            {item.meta ? (
              <span className="text-xs text-slate-400">{item.meta}</span>
            ) : null}
          </li>
        ))}
      </ul>
      {footer ? <div className="pt-2">{footer}</div> : null}
    </div>
  )
}
