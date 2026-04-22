'use client'

import { useEffect, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/admin/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/features/admin/components/ui/sheet'

import type { AdminUserRole } from '../../api/user-client'
import { ROLE_OPTIONS } from './constants'
import type { CreateUserFormValues } from './types'
import { createUserDefaultValues } from './use-users-table'

type UserModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreateUserFormValues) => Promise<void>
  isSubmitting: boolean
  canManage: boolean
}

const roleEnumValues = ROLE_OPTIONS.map((option) => option.value) as [
  AdminUserRole,
  ...AdminUserRole[],
]

const createUserSchema = z.object({
  name: z.string().trim().optional(),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(roleEnumValues),
})

export function UserModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  canManage,
}: UserModalProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: createUserDefaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(createUserDefaultValues)
    }
  }, [form, open])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!canManage) return

    await onSubmit(values)
    form.reset(createUserDefaultValues)
  })

  const roleError = form.formState.errors.role?.message

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Create user</SheetTitle>
          <SheetDescription>
            Provision a new account and assign the appropriate role.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <div className="flex-1 space-y-4 p-4">
            <FormField label="Full name" error={form.formState.errors.name?.message}>
              <Input
                autoComplete="name"
                placeholder="Jane Doe"
                {...form.register('name')}
              />
            </FormField>

            <FormField label="Email" error={form.formState.errors.email?.message}>
              <Input
                type="email"
                autoComplete="email"
                placeholder="user@example.com"
                {...form.register('email')}
              />
            </FormField>

            <FormField label="Password" error={form.formState.errors.password?.message}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                {...form.register('password')}
              />
            </FormField>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Role
              </label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value: AdminUserRole) => field.onChange(value)}
                    disabled={!canManage}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {roleError ? <p className="text-xs text-rose-500">{roleError}</p> : null}
            </div>
          </div>

          <SheetFooter className="bg-slate-50">
            <Button type="submit" className="w-full" disabled={isSubmitting || !canManage}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating user...
                </span>
              ) : (
                'Create user'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

type FormFieldProps = {
  label: string
  children: ReactNode
  error?: string
}

function FormField({ label, children, error }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  )
}
