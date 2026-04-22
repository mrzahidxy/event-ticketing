import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type FormFieldProps = {
  children: ReactNode
  className?: string
  description?: ReactNode
  error?: string
  htmlFor?: string
  label?: ReactNode
  required?: boolean
}

export function FormField({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  required = false,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          {label}
          {required ? <span className="ml-1 text-rose-400">*</span> : null}
        </label>
      ) : null}
      {children}
      {description ? <FormDescription>{description}</FormDescription> : null}
      <FormMessage message={error} />
    </div>
  )
}

export function FormDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-slate-400', className)} {...props} />
}

type FormMessageProps = {
  className?: string
  message?: string
}

export function FormMessage({ className, message }: FormMessageProps) {
  if (!message) {
    return null
  }

  return <p className={cn('text-xs text-rose-400', className)}>{message}</p>
}
