'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { CalendarDays, Clock3, Mail, Phone, Sparkles, UserCircle2 } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createPublicOrganizerBooking } from '@/features/public-organizer/api/public-organizer-client'
import {
  authenticatedPublicOrganizerBookingSchema,
  publicOrganizerBookingSchema,
  guestPublicOrganizerBookingSchema,
} from '@/validation/booking-schema'
import type { Event } from '@/types/domain'

type GuestFormValues = z.infer<typeof publicOrganizerBookingSchema>

type PublicOrganizerBookingFormProps = {
  className?: string
  events: Event[]
  initialEventId?: string
  organizerId: string
  organizerName: string
}

export function PublicOrganizerBookingForm({
  className,
  events,
  initialEventId,
  organizerId,
  organizerName,
}: PublicOrganizerBookingFormProps) {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.email)
  const validationSchema = isAuthenticated
    ? authenticatedPublicOrganizerBookingSchema
    : guestPublicOrganizerBookingSchema

  const form = useForm<GuestFormValues>({
    resolver: zodResolver(publicOrganizerBookingSchema),
    defaultValues: {
      bookingDate: '',
      bookingTime: '',
      email: session?.user?.email ?? '',
      eventId: initialEventId ?? events[0]?.id ?? '',
      fullName: session?.user?.name ?? '',
      guestCount: 1,
      notes: '',
      quantity: 1,
      ticketTierId: events.find((event) => event.id === (initialEventId ?? events[0]?.id))?.ticketTiers[0]?.id ?? 0,
      phone: '',
    },
  })

  const selectedEventId = form.watch('eventId')
  const selectedTicketTierId = form.watch('ticketTierId')
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null
  const selectedTier =
    selectedEvent?.ticketTiers.find((tier) => tier.id === Number(selectedTicketTierId)) ??
    selectedEvent?.ticketTiers[0] ??
    null
  const selectedTierAvailable = selectedTier?.quantityTotal === null
    ? null
    : selectedTier
      ? Math.max(selectedTier.quantityTotal - selectedTier.quantitySold, 0)
      : null

  useEffect(() => {
    const eventId = initialEventId || form.getValues('eventId') || events[0]?.id
    const event = events.find((item) => item.id === eventId) ?? events[0]

    if (event?.id) {
      form.setValue('eventId', event.id, { shouldDirty: false, shouldValidate: true })
      form.setValue('ticketTierId', event.ticketTiers[0]?.id ?? 0, {
        shouldDirty: false,
        shouldValidate: true,
      })
    }
  }, [events, form, initialEventId])

  useEffect(() => {
    if (!selectedEvent) {
      return
    }

    const tierBelongsToEvent = selectedEvent.ticketTiers.some(
      (tier) => tier.id === Number(form.getValues('ticketTierId')),
    )

    if (!tierBelongsToEvent) {
      form.setValue('ticketTierId', selectedEvent.ticketTiers[0]?.id ?? 0, {
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
    mutationFn: async (values: GuestFormValues) => {
      return createPublicOrganizerBooking(organizerId, values)
    },
    onSuccess: () => {
      toast.success('Booking request submitted')
      form.reset({
        bookingDate: '',
        bookingTime: '',
        email: session?.user?.email ?? '',
        eventId: initialEventId ?? events[0]?.id ?? '',
        fullName: session?.user?.name ?? '',
        guestCount: 1,
        notes: '',
        phone: '',
        quantity: 1,
        ticketTierId: events.find((event) => event.id === (initialEventId ?? events[0]?.id))?.ticketTiers[0]?.id ?? 0,
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Booking request failed')
    },
  })

  const canSubmit = events.length > 0 && Boolean(selectedTier) && !mutation.isPending && status !== 'loading'

  const handleSubmit = form.handleSubmit((values) => {
    form.clearErrors()

    const parsed = validationSchema.safeParse(values)

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0]
        if (typeof fieldName === 'string') {
          form.setError(fieldName as keyof GuestFormValues, {
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
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="success">Booking</Badge>
            <CardTitle className="text-2xl">Reserve with {organizerName}</CardTitle>
          </div>
          <Sparkles className="h-5 w-5 text-teal-500" />
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Choose an event, add your booking details, and we will send the request to the organizer.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {status === 'authenticated' ? (
          <Alert variant="default" className="border-teal-200 bg-teal-50 text-teal-900">
            <AlertTitle className="flex items-center gap-2 text-sm">
              <UserCircle2 className="h-4 w-4" />
              Signed in booking
            </AlertTitle>
            <AlertDescription>
              We will reuse your account name and email when submitting this booking.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default" className="border-slate-200 bg-slate-50 text-slate-700">
            <AlertTitle className="flex items-center gap-2 text-sm">
              <UserCircle2 className="h-4 w-4" />
              Guest booking
            </AlertTitle>
            <AlertDescription>
              Enter your contact details so the organizer can confirm the reservation.
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <FormField
            label="Event"
            error={form.formState.errors.eventId?.message}
            htmlFor="public-booking-event"
            required
            description={
              events.length > 0
                ? 'Select one of the published events from this organizer.'
                : 'There are no published events available to book.'
            }
          >
            <Select
              id="public-booking-event"
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

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Booking Date"
              error={form.formState.errors.bookingDate?.message}
              htmlFor="public-booking-date"
              required
            >
              <Input
                id="public-booking-date"
                type="date"
                disabled={mutation.isPending}
                {...form.register('bookingDate')}
              />
            </FormField>

            <FormField
              label="Booking Time"
              error={form.formState.errors.bookingTime?.message}
              htmlFor="public-booking-time"
              required
            >
              <Input
                id="public-booking-time"
                type="time"
                disabled={mutation.isPending}
                {...form.register('bookingTime')}
              />
            </FormField>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Ticket Tier"
              error={form.formState.errors.ticketTierId?.message}
              htmlFor="public-booking-ticket-tier"
              required
              description={
                selectedEvent?.ticketTiers.length
                  ? 'Choose an available ticket tier for this event.'
                  : 'No ticket tiers are currently available for this event.'
              }
            >
              <Select
                id="public-booking-ticket-tier"
                disabled={!selectedEvent?.ticketTiers.length || mutation.isPending}
                {...form.register('ticketTierId', { valueAsNumber: true })}
              >
                <option value={0}>Select a ticket tier</option>
                {selectedEvent?.ticketTiers.map((tier) => {
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
              htmlFor="public-booking-quantity"
              required
              description={
                selectedTierAvailable === null
                  ? 'Unlimited availability.'
                  : `${selectedTierAvailable} ticket${selectedTierAvailable === 1 ? '' : 's'} available.`
              }
            >
              <Input
                id="public-booking-quantity"
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <CalendarDays className="h-4 w-4" />
                    Selected event
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{selectedEvent.name}</p>
                  <p className="text-sm leading-6 text-slate-600">
                    {selectedEvent.description || 'More details will be shared by the organizer.'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline">Published</Badge>
                  {selectedTier ? (
                    <span className="text-right text-sm font-semibold text-slate-900">
                      {selectedTier.name}: {selectedTier.price.toLocaleString('en-US', {
                        style: 'currency',
                        currency: selectedTier.currency.toUpperCase(),
                      })}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">No tiers available</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <footer className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-4 w-4" />
              Submitted as a booking request
            </div>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Submit booking
                </span>
              )}
            </Button>
          </footer>
        </form>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Phone className="h-4 w-4" />
          The organizer receives the selected event, booking date, time, and guest details.
        </div>
      </CardContent>
    </Card>
  )
}
