'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { organizerKeys } from '@/features/business-owner/team/api/organizer-keys'
import { listOrganizerEvents } from '@/features/business-owner/team/api/organizer-client'
import { resolveOrganizerScopeId } from '@/features/business-owner/analytics/utils'
import {
  bookingCreateFormSchema,
  bookingFormSchema,
  bookingUpdateFormSchema,
} from '@/validation/booking-schema'
import { createBookingRequest, updateBookingRequest } from '../api/booking-client'
import { resourceKeys } from '../api/booking-keys'

type FormValues = z.infer<typeof bookingFormSchema>

type BookingFormProps = {
  defaultValues?: Partial<FormValues>
  bookingId?: string
  mode: 'create' | 'edit'
  className?: string
  onSubmit?: (values: FormValues) => void
}

export function BookingForm({
  defaultValues,
  bookingId,
  mode,
  className,
  onSubmit: externalOnSubmit,
}: BookingFormProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: session } = useSession()
  const organizerId = resolveOrganizerScopeId(session?.user ?? null)

  const toDateInputValue = (value?: string) => {
    if (!value) return ''
    const trimmed = value.trim()
    if (!trimmed) return ''
    const [datePart] = trimmed.split('T')
    return datePart
  }

  const schema =
    mode === 'create' ? bookingCreateFormSchema : bookingUpdateFormSchema

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventId: defaultValues?.eventId ?? '',
      quantity: defaultValues?.quantity ?? 1,
      status: defaultValues?.status ?? 'PENDING',
      ticketTierId: defaultValues?.ticketTierId ?? 0,
      checkIn:
        mode === 'create' ? toDateInputValue(defaultValues?.checkIn) : undefined,
      checkOut:
        mode === 'create' ? toDateInputValue(defaultValues?.checkOut) : undefined,
    },
  })

  useEffect(() => {
    form.reset({
      eventId: defaultValues?.eventId ?? '',
      quantity: defaultValues?.quantity ?? 1,
      status: defaultValues?.status ?? 'PENDING',
      ticketTierId: defaultValues?.ticketTierId ?? 0,
      checkIn:
        mode === 'create' ? toDateInputValue(defaultValues?.checkIn) : undefined,
      checkOut:
        mode === 'create' ? toDateInputValue(defaultValues?.checkOut) : undefined,
    })
  }, [
    defaultValues?.eventId,
    defaultValues?.quantity,
    defaultValues?.status,
    defaultValues?.ticketTierId,
    defaultValues?.checkIn,
    defaultValues?.checkOut,
    form,
    mode,
  ])

  const eventsQuery = useQuery({
    queryKey: organizerId ? organizerKeys.events(organizerId) : ['organizers', 'events', 'missing-organizer'],
    queryFn: () => listOrganizerEvents(organizerId as string),
    enabled: mode === 'create' && Boolean(organizerId),
  })
  const selectedEventId = form.watch('eventId')
  const selectedTicketTierId = form.watch('ticketTierId')
  const selectedEvent =
    (eventsQuery.data ?? []).find((event) => event.id === selectedEventId) ?? null
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

  useEffect(() => {
    if (mode !== 'create') {
      return
    }

    const currentEventId = form.getValues('eventId')
    const fallbackEvent = (eventsQuery.data ?? [])[0]
    const event =
      (eventsQuery.data ?? []).find((item) => item.id === currentEventId) ?? fallbackEvent

    if (!event?.id) {
      return
    }

    if (!currentEventId || currentEventId !== event.id) {
      form.setValue('eventId', event.id, { shouldDirty: false, shouldValidate: true })
    }

    const currentTierId = Number(form.getValues('ticketTierId'))
    const tierBelongsToEvent = (event.ticketTiers ?? []).some((tier) => tier.id === currentTierId)

    if (!tierBelongsToEvent) {
      form.setValue('ticketTierId', event.ticketTiers?.[0]?.id ?? 0, {
        shouldDirty: false,
        shouldValidate: true,
      })
    }
  }, [eventsQuery.data, form, mode])

  useEffect(() => {
    if (mode !== 'create' || !selectedEvent) {
      return
    }

    const tierBelongsToEvent = selectedEventTiers.some(
      (tier) => tier.id === Number(form.getValues('ticketTierId')),
    )

    if (!tierBelongsToEvent) {
      form.setValue('ticketTierId', selectedEventTiers[0]?.id ?? 0, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [form, mode, selectedEvent, selectedEventTiers])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'create') {
        const payload = bookingCreateFormSchema.parse(values)

        return createBookingRequest({
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          eventId: payload.eventId as string,
          quantity: payload.quantity,
          ticketTierId: payload.ticketTierId,
        })
      }

      if (!bookingId) {
        throw new Error('Missing booking id')
      }

      const payload = bookingUpdateFormSchema.parse(values)
      const updatePayload: {
        status?: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED'
      } = {}

      if (payload.status) {
        updatePayload.status = payload.status
      }

      return updateBookingRequest(bookingId, updatePayload)
    },
    onSuccess: () => {
      toast.success(
        mode === 'create'
          ? 'Booking created successfully'
          : 'Booking updated successfully',
      )
      queryClient.invalidateQueries({ queryKey: resourceKeys.all })
      router.refresh()
      if (mode === 'create') {
        form.reset()
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Request failed')
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    if (externalOnSubmit) {
      externalOnSubmit(values)
    } else {
      mutation.mutate(values)
    }
  })

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5 p-6', className)}>
      {mode === 'create' ? (
        <FormField
          label="Event"
          error={form.formState.errors.eventId?.message}
          htmlFor="booking-event"
          description={
            organizerId
              ? 'Select one of your organizer events.'
              : 'Your account is not linked to an organizer yet.'
          }
        >
          <Select
            id="booking-event"
            disabled={!organizerId || eventsQuery.isLoading || mutation.isPending}
            {...form.register('eventId')}
          >
            <option value="">
              {eventsQuery.isLoading
                ? 'Loading events...'
                : organizerId
                  ? 'Select an event'
                  : 'Organizer unavailable'}
            </option>
            {(eventsQuery.data ?? []).map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}

      <div className={cn('grid gap-5', mode === 'edit' ? 'md:grid-cols-1' : 'md:grid-cols-2')}>
        {mode === 'edit' ? (
          <FormField
            label="Status"
            error={form.formState.errors.status?.message}
            htmlFor="booking-status"
          >
            <Select id="booking-status" {...form.register('status')}>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED" disabled>
                Confirmed (Webhook only)
              </option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </FormField>
        ) : null}

        {mode === 'create' ? (
          <FormField
            label="Check-in Date"
            error={form.formState.errors.checkIn?.message}
            htmlFor="booking-check-in"
          >
            <Input id="booking-check-in" type="date" {...form.register('checkIn')} />
          </FormField>
        ) : null}

        {mode === 'create' ? (
          <FormField
            label="Check-out Date"
            error={form.formState.errors.checkOut?.message}
            htmlFor="booking-check-out"
          >
            <Input id="booking-check-out" type="date" {...form.register('checkOut')} />
          </FormField>
        ) : null}
      </div>

      {mode === 'create' ? (
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Ticket Tier"
            error={form.formState.errors.ticketTierId?.message}
            htmlFor="booking-ticket-tier"
            description={
              selectedEventTiers.length
                ? 'Choose an active ticket tier for this event.'
                : 'No ticket tiers are currently available for this event.'
            }
          >
            <Select
              id="booking-ticket-tier"
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
                    {tier.name} - {tier.price.toLocaleString('en-US', {
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
            htmlFor="booking-quantity"
            description={
              selectedTierAvailable === null
                ? 'Unlimited availability.'
                : selectedTierAvailable !== null
                  ? `${selectedTierAvailable} ticket${selectedTierAvailable === 1 ? '' : 's'} available.`
                  : 'Select a ticket tier first.'
            }
          >
            <Input
              id="booking-quantity"
              type="number"
              min={1}
              max={selectedTierAvailable ?? undefined}
              disabled={mutation.isPending || !selectedTier}
              {...form.register('quantity', { valueAsNumber: true })}
            />
          </FormField>
        </div>
      ) : null}

      <footer className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => form.reset()}
          disabled={mutation.isPending}
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            (mode === 'create' &&
              (!organizerId ||
                !(eventsQuery.data ?? []).length ||
                !selectedTier ||
                selectedTierAvailable === 0))
          }
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              Saving...
            </span>
          ) : mode === 'create' ? (
            'Create booking'
          ) : (
            'Save changes'
          )}
        </Button>
      </footer>
    </form>
  )
}
