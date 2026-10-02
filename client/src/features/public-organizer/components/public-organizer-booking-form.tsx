'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import type { Route } from 'next'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { ArrowRight, Mail, Phone, UserCircle2 } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createUserOrganizerBooking } from '@/features/public-organizer/api/public-organizer-client'
import {
  organizerBookingSubmissionSchema,
  userOrganizerBookingFormSchema,
} from '@/validation/booking-schema'
import type { Event } from '@/types/domain'

type UserOrganizerBookingFormValues = z.infer<typeof userOrganizerBookingFormSchema>

type UserOrganizerBookingFormProps = {
  className?: string
  events: Event[]
  initialEventId?: string
  organizerId: string
}

export function UserOrganizerBookingForm({
  className,
  events,
  initialEventId,
  organizerId,
}: UserOrganizerBookingFormProps) {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.email)
  const form = useForm<UserOrganizerBookingFormValues>({
    resolver: zodResolver(userOrganizerBookingFormSchema),
    defaultValues: {
      bookingDate: '',
      bookingTime: '',
      email: session?.user?.email ?? '',
      eventId: initialEventId ?? events[0]?.id ?? '',
      fullName: session?.user?.name ?? '',
      notes: '',
      quantity: 1,
      ticketTierId: events.find((event) => event.id === (initialEventId ?? events[0]?.id))?.ticketTiers?.[0]?.id ?? 0,
      phone: '',
    },
  })

  const selectedEventId = form.watch('eventId')
  const selectedTicketTierId = form.watch('ticketTierId')
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null
  const selectedEventTiers = selectedEvent?.ticketTiers ?? []
  const selectedTier =
    selectedEventTiers.find((tier) => tier.id === Number(selectedTicketTierId)) ??
    selectedEventTiers[0] ??
    null
  const selectedTierAvailable = selectedTier?.quantityTotal === null
    ? null
      : selectedTier
        ? Math.max(selectedTier.quantityTotal - selectedTier.quantitySold, 0)
        : null
  const loginHref = selectedEventId
    ? `/login?callbackUrl=${encodeURIComponent(`/organizers/${organizerId}?eventId=${selectedEventId}#booking-form`)}`
    : '/login'

  useEffect(() => {
    const eventId = initialEventId || form.getValues('eventId') || events[0]?.id
    const event = events.find((item) => item.id === eventId) ?? events[0]

    if (event?.id) {
      form.setValue('eventId', event.id, { shouldDirty: false, shouldValidate: true })
      form.setValue('ticketTierId', event.ticketTiers?.[0]?.id ?? 0, {
        shouldDirty: false,
        shouldValidate: true,
      })
    }
  }, [events, form, initialEventId])

  useEffect(() => {
    if (!selectedEvent) {
      return
    }

    const ticketTiers = selectedEvent.ticketTiers ?? []
    const tierBelongsToEvent = ticketTiers.some(
      (tier) => tier.id === Number(form.getValues('ticketTierId')),
    )

    if (!tierBelongsToEvent) {
      form.setValue('ticketTierId', ticketTiers[0]?.id ?? 0, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [form, selectedEvent])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    form.setValue('fullName', session?.user?.name ?? session?.user?.email ?? '', {
      shouldDirty: false,
      shouldValidate: false,
    })
    form.setValue('email', session?.user?.email ?? '', {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [form, isAuthenticated, session?.user?.email, session?.user?.name])

  const mutation = useMutation({
    mutationFn: async (values: UserOrganizerBookingFormValues) => {
      return createUserOrganizerBooking(organizerId, values)
    },
    onSuccess: (checkoutSession) => {
      if (!checkoutSession.url) {
        toast.error('Checkout could not be opened. Please try again.')
        return
      }

      window.location.assign(checkoutSession.url)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Booking request failed')
    },
  })

  const canSubmit =
    isAuthenticated && events.length > 0 && Boolean(selectedTier) && !mutation.isPending

  const handleSubmit = form.handleSubmit((values) => {
    form.clearErrors()

    const parsed = organizerBookingSubmissionSchema.safeParse(values)

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0]
        if (typeof fieldName === 'string') {
          form.setError(fieldName as keyof UserOrganizerBookingFormValues, {
            message: issue.message,
            type: 'manual',
          })
        } else {
          toast.error(issue.message)
        }
      })

      return
    }

    mutation.mutate(parsed.data)
  })

  return (
    <Card id="booking-form" className={cn('border-slate-200 bg-white/95', className)}>
      <CardHeader>
        <CardTitle className="text-2xl">Book an event</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
        {status === 'authenticated' ? (
          <Alert variant="default" className="border-teal-200 bg-teal-50 text-teal-900">
            <AlertTitle className="flex items-center gap-2 text-sm">
              <UserCircle2 className="h-4 w-4" />
              Booking as {session?.user?.name ?? session?.user?.email ?? 'your account'}
            </AlertTitle>
            <AlertDescription>
              Your account details will be used for this booking.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default" className="border-slate-200 bg-slate-50 text-slate-700">
            <AlertTitle className="flex items-center gap-2 text-sm">
              <UserCircle2 className="h-4 w-4" />
              Sign in to book
            </AlertTitle>
            <AlertDescription>
              Sign in to your account before submitting a booking request.
              {' '}<Link href={loginHref as Route} className="font-semibold text-teal-700 underline underline-offset-2">Sign in</Link>
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <FormField
            label="Event"
            error={form.formState.errors.eventId?.message}
            htmlFor="user-booking-event"
            required
            description={events.length === 0 ? 'No published events are available.' : undefined}
          >
            <Select
              id="user-booking-event"
              disabled={!events.length || mutation.isPending}
              {...form.register('eventId')}
            >
              <option value="">{events.length ? 'Select an event' : 'No events available'}</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Booking Date"
              error={form.formState.errors.bookingDate?.message}
              htmlFor="user-booking-date"
              required
            >
              <Input
                id="user-booking-date"
                type="date"
                disabled={mutation.isPending}
                {...form.register('bookingDate')}
              />
            </FormField>

            <FormField
              label="Booking Time"
              error={form.formState.errors.bookingTime?.message}
              htmlFor="user-booking-time"
              required
            >
              <Input
                id="user-booking-time"
                type="time"
                disabled={mutation.isPending}
                {...form.register('bookingTime')}
              />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Ticket Tier"
              error={form.formState.errors.ticketTierId?.message}
              htmlFor="user-booking-ticket-tier"
              required
              description={selectedEventTiers.length === 0 ? 'No ticket tiers are available.' : undefined}
            >
              <Select
                id="user-booking-ticket-tier"
                disabled={!selectedEventTiers.length || mutation.isPending}
                {...form.register('ticketTierId', { valueAsNumber: true })}
              >
                <option value={0}>Select a ticket tier</option>
                {selectedEventTiers.map((tier) => {
                  const available = tier.quantityTotal === null
                    ? 'Unlimited'
                    : Math.max(tier.quantityTotal - tier.quantitySold, 0)

                  return (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} — {tier.price.toLocaleString('en-US', {
                        style: 'currency',
                        currency: tier.currency.toUpperCase(),
                      })} {tier.quantityTotal === null ? '(Unlimited)' : `(${available} left)`}
                    </option>
                  )
                })}
              </Select>
            </FormField>

            <FormField
              label="Quantity"
              error={form.formState.errors.quantity?.message}
              htmlFor="user-booking-quantity"
              required
              description={
                selectedTierAvailable === null
                  ? 'Unlimited availability.'
                  : `${selectedTierAvailable} ticket${selectedTierAvailable === 1 ? '' : 's'} available.`
              }
            >
              <Input
                id="user-booking-quantity"
                type="number"
                min={1}
                max={selectedTierAvailable ?? undefined}
                disabled={mutation.isPending || !selectedTier}
                {...form.register('quantity', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <FormField
              label="Full Name"
              error={form.formState.errors.fullName?.message}
              htmlFor="public-booking-name"
              required={!isAuthenticated}
              description={isAuthenticated ? 'Filled from your account' : undefined}
            >
              <Input
                id="public-booking-name"
                autoComplete="name"
                disabled={isAuthenticated || mutation.isPending}
                placeholder="Your full name"
                {...form.register('fullName')}
              />
            </FormField>

            <FormField
              label="Email"
              error={form.formState.errors.email?.message}
              htmlFor="public-booking-email"
              required={!isAuthenticated}
              description={isAuthenticated ? 'Filled from your account' : undefined}
            >
              <Input
                id="public-booking-email"
                autoComplete="email"
                disabled={isAuthenticated || mutation.isPending}
                placeholder="you@example.com"
                type="email"
                {...form.register('email')}
              />
            </FormField>

            <FormField
              label="Phone"
              error={form.formState.errors.phone?.message}
              htmlFor="public-booking-phone"
              required={!isAuthenticated}
              description={isAuthenticated ? 'Recommended for confirmation updates' : undefined}
            >
              <Input
                id="public-booking-phone"
                autoComplete="tel"
                disabled={mutation.isPending}
                placeholder="+1 (555) 123-4567"
                type="tel"
                {...form.register('phone')}
              />
            </FormField>
          </div>

          <FormField
            label="Notes"
            error={form.formState.errors.notes?.message}
            htmlFor="public-booking-notes"
            description="Add dietary needs, accessibility requests, or other details."
          >
            <Textarea
              id="public-booking-notes"
              placeholder="Optional booking notes"
              disabled={mutation.isPending}
              {...form.register('notes')}
            />
          </FormField>

          {selectedEvent ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{selectedEvent.name}</p>
              {selectedTier ? (
                <p className="mt-1 text-sm text-slate-600">
                  {selectedTier.name}: {selectedTier.price.toLocaleString('en-US', {
                    style: 'currency',
                    currency: selectedTier.currency.toUpperCase(),
                  })}
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No ticket tiers available</p>
              )}
            </div>
          ) : null}

          <footer className="border-t border-slate-100 pt-3">
            {isAuthenticated ? (
              <Button type="submit" disabled={!canSubmit} className="w-full">
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Submit booking
                </span>
              )}
              </Button>
            ) : (
              <Link href={loginHref as Route} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
                <UserCircle2 className="h-4 w-4" />
                Sign in to book
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </footer>
        </form>
      </CardContent>
    </Card>
  )
}
