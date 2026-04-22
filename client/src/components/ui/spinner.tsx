import { Loader2 } from 'lucide-react'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

export function Spinner({
  className,
  size = 'md',
  ...props
}: SpinnerProps) {
  return (
    <span className={cn('inline-flex items-center justify-center', className)} {...props}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
    </span>
  )
}
