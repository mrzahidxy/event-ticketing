'use client'

import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role'
> & {
  label?: string
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, disabled, ...props }, ref) => (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-3',
        disabled ? 'opacity-60' : ''
      )}
    >
      {label ? (
        <span className="text-sm font-medium text-slate-600">{label}</span>
      ) : (
        <span className="sr-only">Toggle option</span>
      )}
      <span className="relative inline-flex h-6 w-11 items-center">
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          disabled={disabled}
          {...props}
        />
        <span className="pointer-events-none inline-flex h-full w-full rounded-full border border-slate-300 bg-slate-200 transition peer-checked:border-teal-200 peer-checked:bg-teal-500" />
        <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" />
      </span>
    </label>
  )
)

Switch.displayName = 'Switch'
