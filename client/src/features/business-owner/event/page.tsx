'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { TicketTierManager } from './components/ticket-tier-manager'
import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { SectionCard } from '../dashboard/components/section-card'
import { organizerKeys } from '../team/api/organizer-keys'
import {
  createOrganizerEvent,
  deleteOrganizerEvent,
  listOrganizerEvents,
  updateOrganizerEvent,
} from '../team/api/organizer-client'
import { resolveOrganizerScopeId } from '../analytics/utils'
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
import { formatCurrency } from '@/lib/format'

const organizerEventFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').max(120),
    description: z.string().trim().max(2000).optional(),
    price: z.coerce.number().positive('Price must be greater than 0'),
    isPublished: z.enum(['true', 'false']).default('false'),
  })

type OrganizerEventFormValues = z.infer<typeof organizerEventFormSchema>

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export default function EventPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const organizerId = resolveOrganizerScopeId(session?.user ?? null)
  const role = session?.user.role ?? 'USER'
  const canManageOrganizer = role === 'ADMIN' || role === 'OWNER'

  const [isEventModalOpen, setEventModalOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<string | null>(null)
  const [tierManagerEventId, setTierManagerEventId] = useState<string | null>(null)

  const eventForm = useForm<OrganizerEventFormValues>({
    resolver: zodResolver(organizerEventFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 1,
      isPublished: 'false',
    },
  })

  const eventsQuery = useQuery({
    queryKey: organizerId ? organizerKeys.events(organizerId) : ['organizers', 'events', 'unassigned'],
    queryFn: () => listOrganizerEvents(organizerId as string),
    enabled: Boolean(organizerId),
  })

  const createEventMutation = useMutation({
    mutationFn: (values: OrganizerEventFormValues) =>
      createOrganizerEvent(organizerId as string, {
        description: values.description?.trim() || undefined,
        isPublished: values.isPublished === 'true',
        name: values.name.trim(),
        price: Number(values.price),
      }),
    onSuccess: () => {
      toast.success('Event created')
      eventForm.reset({
        name: '',
        description: '',
        price: 1,
        isPublished: 'false',
      })
      setEventModalOpen(false)
      queryClient.invalidateQueries({ queryKey: organizerKeys.events(organizerId as string) })
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, 'Unable to create event'))
    },
  })

  const updateEventMutation = useMutation({
    mutationFn: (payload: { eventId: string; values: OrganizerEventFormValues }) =>
      updateOrganizerEvent(organizerId as string, payload.eventId, {
        description: payload.values.description?.trim() || null,
        isPublished: payload.values.isPublished === 'true',
        name: payload.values.name.trim(),
        price: Number(payload.values.price),
      }),
    onSuccess: () => {
      toast.success('Event updated')
      setEditingEventId(null)
      setEventModalOpen(false)
      queryClient.invalidateQueries({ queryKey: organizerKeys.events(organizerId as string) })
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, 'Unable to update event'))
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => deleteOrganizerEvent(organizerId as string, eventId),
    onSuccess: () => {
      toast.success('Event removed')
      setPendingDeleteEventId(null)
      queryClient.invalidateQueries({ queryKey: organizerKeys.events(organizerId as string) })
    },
    onError: (mutationError) => {
      setPendingDeleteEventId(null)
      toast.error(getErrorMessage(mutationError, 'Unable to delete event'))
    },
  })

  const events = eventsQuery.data ?? []
  const tierManagerEvent = events.find((event) => event.id === tierManagerEventId) ?? null
  const isSavingEvent = createEventMutation.isPending || updateEventMutation.isPending

  const openCreateEventModal = () => {
    setEditingEventId(null)
    eventForm.reset({
      name: '',
      description: '',
      price: 1,
      isPublished: 'false',
    })
    setEventModalOpen(true)
  }

  const openEditEventModal = (eventId: string) => {
    const event = events.find((entry) => entry.id === eventId)

    if (!event) {
      toast.error('Event not found')
      return
    }

    setEditingEventId(eventId)
    eventForm.reset({
      name: event.name ?? '',
      description: event.description ?? '',
      price: event.price ?? 1,
      isPublished: event.isPublished ? 'true' : 'false',
    })
    setEventModalOpen(true)
  }

  const handleDeleteEvent = (eventId: string) => {
    setPendingDeleteEventId(eventId)
    deleteEventMutation.mutate(eventId)
  }

  const handleEventSubmit = eventForm.handleSubmit((values) => {
    if (!organizerId) {
      toast.error('Your account is not linked to an organizer')
      return
    }

    if (editingEventId) {
      updateEventMutation.mutate({ eventId: editingEventId, values })
      return
    }

    createEventMutation.mutate(values)
  })

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Organizer Events"
        description="Create, edit, and delete organizer events from the backend API"
      />

      {!organizerId ? (
        <SectionCard title="Organizer Access">
          <p className="text-sm text-slate-600">
            This account does not currently resolve to an organizer scope. Event CRUD stays
            blocked until the backend returns an owned or assigned organizer.
          </p>
        </SectionCard>
      ) : (
        <SectionCard
          title="Events"
          subtitle="Manage name, description, price, and publish status"
          actions={
            canManageOrganizer ? (
              <Button onClick={openCreateEventModal}>Create event</Button>
            ) : null
          }
        >
          <div className="space-y-4">
            {eventsQuery.error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {getErrorMessage(eventsQuery.error, 'Unable to load organizer events')}
              </div>
            ) : null}

            {eventsQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <Spinner size="sm" />
                Loading organizer events...
              </div>
            ) : events.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Name
                      </TableHead>
                      <TableHead className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Published
                      </TableHead>
                      <TableHead className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Price
                      </TableHead>
                      <TableHead className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </TableHead>
                      <TableHead className="w-[180px] px-4 py-3 text-right text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="px-4 py-4 text-sm font-medium text-slate-900">
                          {event.name}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-slate-600">
                          <Badge variant={event.isPublished ? 'success' : 'outline'}>
                            {event.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-slate-600">
                          {formatCurrency(event.price ?? 0)}
                        </TableCell>
                        <TableCell className="max-w-[240px] px-4 py-4 text-sm text-slate-600">
                          <span className="block truncate">{event.description || '—'}</span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm text-slate-600">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTierManagerEventId(event.id)}
                            >
                              Manage tiers
                            </Button>
                            {canManageOrganizer ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditEventModal(event.id)}
                                  disabled={isSavingEvent || deleteEventMutation.isPending}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteEvent(event.id)}
                                  disabled={deleteEventMutation.isPending}
                                >
                                  {deleteEventMutation.isPending && pendingDeleteEventId === event.id
                                    ? 'Deleting...'
                                    : 'Delete'}
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">Read-only</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
                No organizer events were returned by the backend.
              </div>
            )}
          </div>
        </SectionCard>
      )}

      <Modal
        open={Boolean(tierManagerEvent)}
        onOpenChange={(open) => {
          if (!open) {
            setTierManagerEventId(null)
          }
        }}
        title="Manage ticket tiers"
        description="View, create, and update ticket tiers for this event."
        className="max-w-5xl"
      >
        {organizerId && tierManagerEvent ? (
          <TicketTierManager
            organizerId={organizerId}
            eventId={tierManagerEvent.id}
            eventName={tierManagerEvent.name}
            canManage={canManageOrganizer}
          />
        ) : null}
      </Modal>

      <Modal
        open={isEventModalOpen}
        onOpenChange={setEventModalOpen}
        title={editingEventId ? 'Edit event' : 'Create event'}
        description="Manage organizer event details."
      >
        <form onSubmit={handleEventSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Name"
              htmlFor="organizer-event-name"
              error={eventForm.formState.errors.name?.message}
            >
              <Input
                id="organizer-event-name"
                {...eventForm.register('name')}
                disabled={isSavingEvent}
              />
            </FormField>
            <FormField
              label="Price"
              htmlFor="organizer-event-price"
              error={eventForm.formState.errors.price?.message}
            >
              <Input
                id="organizer-event-price"
                type="number"
                min="0.01"
                step="0.01"
                {...eventForm.register('price')}
                disabled={isSavingEvent}
              />
            </FormField>
            <FormField
              label="Publish status"
              htmlFor="organizer-event-published"
              error={eventForm.formState.errors.isPublished?.message}
            >
              <Select
                id="organizer-event-published"
                {...eventForm.register('isPublished')}
                disabled={isSavingEvent}
              >
                <option value="false">Draft</option>
                <option value="true">Published</option>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Description"
            htmlFor="organizer-event-description"
            error={eventForm.formState.errors.description?.message}
          >
            <Textarea
              id="organizer-event-description"
              rows={4}
              {...eventForm.register('description')}
              disabled={isSavingEvent}
            />
          </FormField>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                eventForm.reset()
                setEventModalOpen(false)
              }}
              disabled={isSavingEvent}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSavingEvent}>
              {isSavingEvent ? 'Saving...' : editingEventId ? 'Save changes' : 'Create event'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
