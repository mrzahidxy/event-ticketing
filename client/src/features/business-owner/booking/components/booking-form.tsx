'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { bookingUpdateFormSchema } from '@/validation/booking-schema'

import { updateBookingRequest } from '../api/booking-client'
import { resourceKeys } from '../api/booking-keys'

type FormValues = z.infer<typeof bookingUpdateFormSchema>

type BookingFormProps = {
  defaultValues?: Partial<FormValues>
  bookingId: string
}

export function BookingForm({
  defaultValues,
  bookingId,
}: BookingFormProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(bookingUpdateFormSchema),
    defaultValues: {
      status: defaultValues?.status ?? 'PENDING',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateBookingRequest(bookingId, values),
    onSuccess: () => {
      toast.success('Booking updated successfully')
      queryClient.invalidateQueries({ queryKey: resourceKeys.all })
      router.refresh()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Request failed')
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    mutation.mutate(values)
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          <option value="CANCELLED">Cancelled</option>
        </Select>
      </FormField>

      <footer className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            disabled={mutation.isPending || !form.formState.isDirty}
          >
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                Saving...
              </span>
            ) : (
              'Save changes'
            )}
          </Button>
      </footer>
    </form>
  )
}
