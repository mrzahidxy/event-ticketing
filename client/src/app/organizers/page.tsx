import { getPublicOrganizersPage } from '@/features/public-organizer/api/public-organizer-client'
import { ArrowRight, CalendarDays, MapPin, Ticket } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Events',
  description: 'Explore published events and choose tickets from event organizers.',
}

export default async function PublicOrganizersIndexPage() {
  const organizers = await getPublicOrganizersPage()
  const eventCards = organizers.flatMap(({ organizer, publishedEvents }) =>
    publishedEvents.map((event) => ({ organizer, event })),
  )

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-6 flex justify-end">
          <Link
            href="/user/bookings"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            My Account
          </Link>
        </div>
        <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="bg-[linear-gradient(135deg,rgba(20,184,166,0.08),transparent_55%)] px-6 py-8 sm:px-9 sm:py-10">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Public events
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Browse events and book with their organizers.
            </p>
          </div>
        </section>

        <section>
          {eventCards.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/80">
              <CardContent className="p-8 text-center sm:p-12">
                <Ticket aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-4 text-lg font-medium text-slate-900">
                  The lineup is taking shape
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  There are no published events to browse right now. Check back soon for
                  new events.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:gap-5">
              {eventCards.map(({ organizer, event }) => {
                const firstTier = event.ticketTiers?.[0]
                const available =
                  firstTier?.quantityTotal === null
                    ? 'Unlimited'
                    : firstTier
                      ? `${Math.max(firstTier.quantityTotal - firstTier.quantitySold, 0)} left`
                      : 'Unavailable'

                return (
                  <Card
                    key={`${organizer.id}-${event.id}`}
                    className="group flex h-full flex-col overflow-hidden border-slate-200 bg-white/95 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader className="flex-1 space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-xl">{event.name}</CardTitle>
                        {firstTier ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                            {formatCurrency(
                              firstTier.price,
                              firstTier.currency.toUpperCase(),
                            )}
                          </span>
                        ) : null}
                      </div>
                      {event.description ? (
                        <p className="text-sm leading-6 text-slate-600">
                          {event.description}
                        </p>
                      ) : null}
                    </CardHeader>
                    <CardContent className="space-y-3 border-t border-slate-100 px-5 py-4">
                      <div className="space-y-2 text-sm text-slate-500">
                        <p>By {organizer.name}</p>
                        {event.eventDate ? (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>{formatDate(event.eventDate)}</span>
                          </div>
                        ) : null}
                        {event.location ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4" />
                          <span>{available}</span>
                        </div>
                      </div>
                      <Link
                        href={`/organizers/${organizer.id}?eventId=${event.id}#booking-form`}
                        className={buttonVariants({ size: 'sm' })}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Book event
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
