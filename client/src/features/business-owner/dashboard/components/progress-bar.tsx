import { cn } from '@/lib/utils'

type ProgressBarProps = {
  label?: string
  helper?: string
  value: number
  max?: number
  className?: string
}

export function ProgressBar({
  label,
  helper,
  value,
  max = 100,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
        {label ? <span>{label}</span> : <span>Usage</span>}
        {helper ? <span>{helper}</span> : null}
      </div>
      <div className="h-3 w-full rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-teal-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
