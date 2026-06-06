'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { authRoutes } from '@/auth/routes'
import { register as registerUser } from '@/features/auth/api/auth-client'
import { registerSchema } from '@/validation/auth-schema'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const router = useRouter()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      toast.success('Account created. Sign in to continue.')
      router.push(authRoutes.signInPath)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create account',
      )
    },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync({
      email: values.email,
      name: values.name,
      password: values.password,
    })
  })

  const isSubmitting = form.formState.isSubmitting || mutation.isPending

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 [&_.text-slate-400]:!text-white/85 [&_.text-rose-400]:!text-rose-300 [&_label]:!text-sm [&_label]:!font-medium [&_label]:!normal-case [&_label]:!tracking-normal [&_label]:!text-white/85"
    >
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-white">
          Create your account
        </h1>
        <p className="text-sm text-white/85">
          Register with your email and password to book events and manage your account.
        </p>
      </div>

      <FormField label="Full name" error={form.formState.errors.name?.message} htmlFor="register-name">
        <Input id="register-name" autoComplete="name" {...form.register('name')} />
      </FormField>

      <FormField label="Email" error={form.formState.errors.email?.message} htmlFor="register-email">
        <Input id="register-email" autoComplete="email" {...form.register('email')} />
      </FormField>

      <FormField
        label="Password"
        error={form.formState.errors.password?.message}
        htmlFor="register-password"
      >
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
      </FormField>

      <FormField
        label="Confirm password"
        error={form.formState.errors.confirmPassword?.message}
        htmlFor="register-confirm-password"
      >
        <Input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          {...form.register('confirmPassword')}
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            Creating account...
          </span>
        ) : (
          'Create account'
        )}
      </Button>
    </form>
  )
}
