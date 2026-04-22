import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const alertVariants = cva('relative w-full rounded-xl border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-slate-200 bg-white text-slate-700',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      warning: 'border-amber-200 bg-amber-50 text-amber-700',
      destructive: 'border-rose-200 bg-rose-50 text-rose-700',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

type AlertProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div className={cn(alertVariants({ variant }), className)} role="alert" {...props} />
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('mb-1 font-semibold leading-none', className)} {...props} />
}

export function AlertDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-6', className)} {...props} />
}
