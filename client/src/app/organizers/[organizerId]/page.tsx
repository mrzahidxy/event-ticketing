import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Sparkles,
  Ticket,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getPublicOrganizerPage,
  type PublicOrganizerPageData,
} from '@/features/public-organizer/api/public-organizer-client'
import { UserOrganizerBookingForm } from '@/features/public-organizer/components/public-organizer-booking-form'
import { HttpError } from '@/lib/errors'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/format'

type OrganizerPageProps = {
  params: Promise<{
    organizerId: string
  }>
  searchParams?: Promise<{
    eventId?: string
  }>
}

export const metadata: Metadata = {
  title: 'Public Organizer',
  description: 'Browse published events for a public organizer landing page.',
}

export default async function OrganizerPage({ params, searchParams }: OrganizerPageProps) {
  const resolvedSearchParams: Promise<{
    eventId?: string
  }> = searchParams ?? Promise.resolve({})

  const [{ organizerId }, query] = await Promise.all([
    params,
    resolvedSearchParams,
  ])

  let pageData: PublicOrganizerPageData

  try {
    pageData = await getPublicOrganizerPage(organizerId)
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound()
    }

    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_30%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-5 py-8 sm:px-8">
          <Card className="w-full border-slate-200 bg-white/95 backdrop-blur">
            <CardContent className="space-y-3 p-6 text-center sm:p-8">
              <CardTitle className="text-2xl">Organizer page unavailable</CardTitle>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-600">
                We could not load the public organizer details right now. Please try again in a
                moment.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const { organizer, publishedEvents } = pageData!
  const selectedEventId =
    typeof query?.eventId === 'string' && publishedEvents.some((event) => event.id === query.eventId)
      ? query.eventId
      : publishedEvents[0]?.id

  const latestUpdatedLabel = formatRelativeDate(organizer.updatedAt)

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:py-6">
        <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 pb-4">
          <Link
            href="/user/bookings"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ArrowLeft className="h-4 w-4" />
            My bookings
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Sparkles aria-hidden="true" className="h-5 w-5 shrink-0 text-teal-600" />
            <div className="min-w-0">
              <h1 className="break-words text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:text-xl">
                {organizer.name}
              </h1>
              <p className="text-xs text-slate-500">
                {publishedEvents.length} {publishedEvents.length === 1 ? 'event' : 'events'}
              </p>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
          <section id="events" className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">Events</h2>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                Updated {latestUpdatedLabel}
              </span>
            </div>

            {publishedEvents.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-white/80">
                <CardContent className="p-8 text-center">
                  <p className="text-lg font-medium text-slate-900">No published events yet</p>
                  <p className="mt-2 text-sm text-slate-500">
                    This organizer has not published any events to book.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {publishedEvents.map((event) => {
                  const tiers = event.ticketTiers ?? []
                  const availableTiers = tiers.filter(
                    (tier) => tier.quantityTotal === null || tier.quantitySold < tier.quantityTotal,
                  )
                  const startingPrice = availableTiers.length
                    ? Math.min(...availableTiers.map((tier) => tier.price))
                    : null
                  const isSelected = selectedEventId === event.id

                  return (
                    <Card
                      key={event.id}
                      className={`overflow-hidden bg-white transition-colors ${
                        isSelected
                          ? 'border-teal-400 ring-1 ring-teal-400/30'
                          : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      <CardHeader className="space-y-2 p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <CardTitle className="text-lg sm:text-xl">{event.name}</CardTitle>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                            {startingPrice === null ? 'Sold out' : `From ${formatCurrency(startingPrice)}`}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                          {event.description || 'Event details coming soon.'}
                        </p>
                      </CardHeader>
                      {tiers.length > 0 ? (
                        <CardContent className="space-y-2 px-4 pb-3 sm:px-5">
                          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                            <Ticket aria-hidden="true" className="h-4 w-4" />
                            Ticket tiers
                          </p>
                          <div className="space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5">
                            {tiers.map((tier) => {
                              const availability = tier.quantityTotal === null
                                ? 'Unlimited'
                                : `${Math.max(tier.quantityTotal - tier.quantitySold, 0)} left`

                              return (
                                <div
                                  key={tier.id}
                                  className="flex items-center justify-between gap-3 text-sm"
                                >
                                  <span className="min-w-0 truncate font-medium text-slate-700">{tier.name}</span>
                                  <span className="shrink-0 text-right text-slate-600">
                                    {formatCurrency(tier.price, tier.currency.toUpperCase())}
                                    <span className="text-slate-400"> · {availability}</span>
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      ) : null}
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
                        {event.eventDate ? (
                          <span className="flex items-center gap-2 text-xs text-slate-500">
                            <CalendarDays aria-hidden="true" className="h-4 w-4" />
                            {formatDate(event.eventDate)}{event.eventTime ? ` · ${event.eventTime}` : ''}
                          </span>
                        ) : <span />}
                        <Link
                          href={`/organizers/${organizer.id}?eventId=${event.id}#booking-form`}
                          className={buttonVariants({ size: 'sm' })}
                        >
                          <Ticket className="h-4 w-4" />
                          Choose tickets
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <UserOrganizerBookingForm
              organizerId={organizerId}
              events={publishedEvents}
              initialEventId={selectedEventId}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
