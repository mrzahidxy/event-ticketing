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
      status: defaultValues?.status ?? 'PENDING',
      checkIn:
        mode === 'create' ? toDateInputValue(defaultValues?.checkIn) : undefined,
      checkOut:
        mode === 'create' ? toDateInputValue(defaultValues?.checkOut) : undefined,
    },
  })

  useEffect(() => {
    form.reset({
      eventId: defaultValues?.eventId ?? '',
      status: defaultValues?.status ?? 'PENDING',
      checkIn:
        mode === 'create' ? toDateInputValue(defaultValues?.checkIn) : undefined,
      checkOut:
        mode === 'create' ? toDateInputValue(defaultValues?.checkOut) : undefined,
    })
  }, [
    defaultValues?.eventId,
    defaultValues?.status,
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

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (mode === 'create') {
        const payload = bookingCreateFormSchema.parse(values)

        return createBookingRequest({
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          eventId: payload.eventId as string,
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
            (mode === 'create' && (!organizerId || !(eventsQuery.data ?? []).length))
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
