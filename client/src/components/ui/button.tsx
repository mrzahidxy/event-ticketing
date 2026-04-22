import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-teal-500 focus-visible:ring-offset-slate-100',
  {
    variants: {
      variant: {
        default:
          'bg-teal-500 text-white hover:bg-teal-400 active:bg-teal-500/90',
        secondary:
          'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
        outline:
          'border border-slate-300 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-600',
        ghost:
          'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
        destructive:
          'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-500/90',
      },
      size: {
        default: 'h-10 px-4 text-sm',
        sm: 'h-9 rounded-md px-3 text-sm',
        lg: 'h-11 rounded-xl px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)

Button.displayName = 'Button'
