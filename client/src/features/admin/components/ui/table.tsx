"use client";

import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/lib/utils'

type TableProps = ComponentPropsWithoutRef<'table'>

export function Table({ className, ...props }: TableProps) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

export function TableHeader({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
  )
}

export function TableBody({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

export function TableFooter({ className, ...props }: ComponentPropsWithoutRef<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

export function TableRow({ className, ...props }: ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'whitespace-nowrap p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

export function TableCaption({ className, ...props }: ComponentPropsWithoutRef<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}
