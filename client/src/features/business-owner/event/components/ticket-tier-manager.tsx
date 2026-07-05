'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { organizerKeys } from '../../team/api/organizer-keys'
import {
  createEventTicketTier,
  listEventTicketTiers,
  updateEventTicketTier,
  type CreateTicketTierRequest,
} from '../../team/api/organizer-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/lib/format'
import type { TicketTier } from '@/types/domain'

const optionalPositiveInt = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) {
      return undefined
    }

    return value
  },
  z.coerce.number().int('Quantity must be a whole number').positive('Quantity must be positive').optional(),
)

const optionalDateTime = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional(),
)

const ticketTierFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    description: z.string().trim().max(1000).optional(),
    price: z.coerce.number().min(0, 'Price must be greater than or equal to 0'),
    currency: z.string().trim().min(1, 'Currency is required').default('usd'),
    quantityTotal: optionalPositiveInt,
    salesStartAt: optionalDateTime,
    salesEndAt: optionalDateTime,
    isActive: z.enum(['true', 'false']).default('true'),
  })
  .refine(
    (value) => {
      if (!value.salesStartAt || !value.salesEndAt) {
        return true
      }

      return new Date(value.salesStartAt) < new Date(value.salesEndAt)
    },
    {
      message: 'Sales end must be after sales start',
      path: ['salesEndAt'],
    },
  )

type TicketTierFormValues = z.infer<typeof ticketTierFormSchema>

type TicketTierManagerProps = {
  organizerId: string
  eventId: string
  eventName: string
  canManage: boolean
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toApiDateTime(value?: string) {
  if (!value?.trim()) {
    return undefined
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function availabilityLabel(tier: TicketTier) {
  if (tier.quantityTotal === null) {
    return 'Unlimited'
  }

  return `${tier.quantitySold} / ${tier.quantityTotal}`
}

function salesWindowLabel(tier: TicketTier) {
  if (!tier.salesStartAt && !tier.salesEndAt) {
    return 'Always available'
  }

  const start = tier.salesStartAt ? formatDate(tier.salesStartAt) : 'Now'
  const end = tier.salesEndAt ? formatDate(tier.salesEndAt) : 'No end'
  return `${start} → ${end}`
}

function buildPayload(values: TicketTierFormValues): CreateTicketTierRequest {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    price: Number(values.price),
    currency: values.currency.trim().toLowerCase() || 'usd',
    quantityTotal: values.quantityTotal,
    salesStartAt: toApiDateTime(values.salesStartAt),
    salesEndAt: toApiDateTime(values.salesEndAt),
    isActive: values.isActive === 'true',
  }
}

export function TicketTierManager({
  organizerId,
  eventId,
  eventName,
  canManage,
}: TicketTierManagerProps) {
  const queryClient = useQueryClient()
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null)

  const form = useForm<TicketTierFormValues>({
    resolver: zodResolver(ticketTierFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      currency: 'usd',
      quantityTotal: undefined,
      salesStartAt: '',
      salesEndAt: '',
      isActive: 'true',
    },
  })

  const tiersQuery = useQuery({
    queryKey: organizerKeys.ticketTiers(organizerId, eventId),
    queryFn: () => listEventTicketTiers(organizerId, eventId),
  })

  const invalidateTierData = () => {
    queryClient.invalidateQueries({ queryKey: organizerKeys.ticketTiers(organizerId, eventId) })
    queryClient.invalidateQueries({ queryKey: organizerKeys.events(organizerId) })
  }

  const createMutation = useMutation({
    mutationFn: (values: TicketTierFormValues) =>
      createEventTicketTier(organizerId, eventId, buildPayload(values)),
    onSuccess: () => {
      toast.success('Ticket tier created')
      setFormOpen(false)
      form.reset()
      invalidateTierData()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to create ticket tier'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: TicketTierFormValues) => {
      if (!editingTier) {
        throw new Error('Ticket tier not selected')
      }

      return updateEventTicketTier(organizerId, eventId, editingTier.id, buildPayload(values))
    },
    onSuccess: () => {
      toast.success('Ticket tier updated')
      setFormOpen(false)
      setEditingTier(null)
      form.reset()
      invalidateTierData()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Unable to update ticket tier'))
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending
  const tiers = tiersQuery.data ?? []

  const openCreateModal = () => {
    setEditingTier(null)
    form.reset({
      name: '',
      description: '',
      price: 0,
      currency: 'usd',
      quantityTotal: undefined,
      salesStartAt: '',
      salesEndAt: '',
      isActive: 'true',
    })
    setFormOpen(true)
  }

  const openEditModal = (tier: TicketTier) => {
    setEditingTier(tier)
    form.reset({
      name: tier.name,
      description: tier.description ?? '',
      price: tier.price,
      currency: tier.currency || 'usd',
      quantityTotal: tier.quantityTotal ?? undefined,
      salesStartAt: toDateTimeLocal(tier.salesStartAt),
      salesEndAt: toDateTimeLocal(tier.salesEndAt),
      isActive: tier.isActive ? 'true' : 'false',
    })
    setFormOpen(true)
  }

  const handleSubmit = form.handleSubmit((values) => {
    if (editingTier) {
      updateMutation.mutate(values)
      return
    }

    createMutation.mutate(values)
  })

  useEffect(() => {
    if (!isFormOpen) {
      setEditingTier(null)
    }
  }, [isFormOpen])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{eventName}</p>
          <p className="text-xs text-slate-500">
            Staff can view tiers. Owners and admins can create or edit tiers.
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreateModal}>Create tier</Button>
        ) : (
          <Badge variant="outline">Read-only</Badge>
        )}
      </div>

      {tiersQuery.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getErrorMessage(tiersQuery.error, 'Unable to load ticket tiers')}
        </div>
      ) : null}

      {tiersQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Spinner size="sm" />
          Loading ticket tiers...
        </div>
      ) : tiers.length ? (
        <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Sold / Total</TableHead>
                <TableHead>Sales window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{tier.name}</p>
                      {tier.description ? (
                        <p className="max-w-[220px] truncate text-xs text-slate-500">
                          {tier.description}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(tier.price, tier.currency.toUpperCase())}
                  </TableCell>
                  <TableCell>{availabilityLabel(tier)}</TableCell>
                  <TableCell className="text-xs text-slate-600">{salesWindowLabel(tier)}</TableCell>
                  <TableCell>
                    <Badge variant={tier.isActive ? 'success' : 'outline'}>
                      {tier.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(tier)}
                        disabled={isSaving}
                      >
                        Edit
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-500">View only</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No ticket tiers have been created for this event.
        </div>
      )}

      <Modal
        open={isFormOpen}
        onOpenChange={setFormOpen}
        title={editingTier ? 'Edit ticket tier' : 'Create ticket tier'}
        description="Manage public pricing, capacity, and sales window for this event."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name" htmlFor="tier-name" error={form.formState.errors.name?.message}>
              <Input id="tier-name" {...form.register('name')} disabled={isSaving} />
            </FormField>
            <FormField label="Price" htmlFor="tier-price" error={form.formState.errors.price?.message}>
              <Input
                id="tier-price"
                type="number"
                min="0"
                step="0.01"
                {...form.register('price')}
                disabled={isSaving}
              />
            </FormField>
            <FormField
              label="Currency"
              htmlFor="tier-currency"
              error={form.formState.errors.currency?.message}
            >
              <Select id="tier-currency" {...form.register('currency')} disabled={isSaving}>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
                <option value="cad">CAD</option>
                <option value="aud">AUD</option>
              </Select>
            </FormField>
            <FormField
              label="Quantity total"
              htmlFor="tier-quantity-total"
              error={form.formState.errors.quantityTotal?.message}
              description="Leave blank for unlimited inventory."
            >
              <Input
                id="tier-quantity-total"
                type="number"
                min="1"
                step="1"
                {...form.register('quantityTotal')}
                disabled={isSaving}
              />
            </FormField>
            <FormField
              label="Sales start"
              htmlFor="tier-sales-start"
              error={form.formState.errors.salesStartAt?.message}
            >
              <Input
                id="tier-sales-start"
                type="datetime-local"
                {...form.register('salesStartAt')}
                disabled={isSaving}
              />
            </FormField>
            <FormField
              label="Sales end"
              htmlFor="tier-sales-end"
              error={form.formState.errors.salesEndAt?.message}
            >
              <Input
                id="tier-sales-end"
                type="datetime-local"
                {...form.register('salesEndAt')}
                disabled={isSaving}
              />
            </FormField>
            <FormField
              label="Status"
              htmlFor="tier-active"
              error={form.formState.errors.isActive?.message}
            >
              <Select id="tier-active" {...form.register('isActive')} disabled={isSaving}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Description"
            htmlFor="tier-description"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="tier-description"
              rows={3}
              {...form.register('description')}
              disabled={isSaving}
            />
          </FormField>

          {editingTier ? (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Quantity sold is managed by bookings and cannot be edited here. Current sold:{' '}
              {editingTier.quantitySold}.
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingTier ? 'Save changes' : 'Create tier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
