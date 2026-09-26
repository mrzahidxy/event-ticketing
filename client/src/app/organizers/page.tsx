import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Sparkles, Ticket } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getPublicOrganizersPage } from '@/features/public-organizer/api/public-organizer-client'
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
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex min-h-12 flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
          <Link href="/user/bookings" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            My bookings
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Events</h1>
        </header>

        <p className="mb-6 text-sm text-slate-600">
          Browse published events and choose tickets.
        </p>

        <section aria-labelledby="catalog-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h2 id="catalog-heading" className="text-lg font-semibold tracking-tight text-slate-900">
              Published events
            </h2>
            <span className="text-sm text-slate-500">{eventCards.length} events · {organizers.length} organizers</span>
          </div>

          {eventCards.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/80">
              <CardContent className="p-8 text-center sm:p-12">
                <Ticket aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-4 text-lg font-medium text-slate-900">The lineup is taking shape</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  There are no published events to browse right now. Check back soon for new events.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:gap-5">
              {eventCards.map(({ organizer, event }) => {
                const tiers = event.ticketTiers ?? []
                const availableTiers = tiers.filter(
                  (tier) => tier.isActive && (tier.quantityTotal === null || tier.quantitySold < tier.quantityTotal),
                )
                const startingTier = availableTiers.reduce<(typeof tiers)[number] | null>(
                  (lowest, tier) => (!lowest || tier.price < lowest.price ? tier : lowest),
                  null,
                )
                const availableCount = availableTiers.some((tier) => tier.quantityTotal === null)
                  ? 'Unlimited tickets'
                  : `${availableTiers.reduce(
                      (total, tier) => total + Math.max((tier.quantityTotal ?? 0) - tier.quantitySold, 0),
                      0,
                    )} tickets left`

                return (
                  <Card
                    key={`${organizer.id}-${event.id}`}
                    className="group overflow-hidden border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg"
                  >
                    <CardContent className="p-0">
                      <div className="p-4 sm:p-5">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                              {event.name}
                            </h3>
                          </div>
                          <div className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-right">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              {startingTier === null ? 'Tickets' : 'From'}
                            </p>
                            <p className="text-base font-semibold text-slate-900">
                              {startingTier === null
                                ? 'Sold out'
                                : formatCurrency(startingTier.price, startingTier.currency.toUpperCase())}
                            </p>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                          {event.description || 'Event details coming soon.'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <Sparkles aria-hidden="true" className="h-4 w-4 text-teal-600" />
                            {organizer.name}
                          </span>
                          {event.eventDate ? (
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays aria-hidden="true" className="h-4 w-4" />
                              {formatDate(event.eventDate)}
                              {event.eventTime ? ` · ${event.eventTime}` : ''}
                            </span>
                          ) : null}
                          {event.location ? (
                            <span className="inline-flex items-center gap-2">
                              <MapPin aria-hidden="true" className="h-4 w-4" />
                              {event.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          <Ticket aria-hidden="true" className="h-4 w-4" />
                          {availableTiers.length} {availableTiers.length === 1 ? 'ticket option' : 'ticket options'}
                          {availableTiers.length ? ` · ${availableCount}` : ''}
                        </span>
                        <Link
                          href={`/organizers/${organizer.id}?eventId=${event.id}#booking-form`}
                          aria-label={`Choose tickets for ${event.name}`}
                          className={`${buttonVariants({ size: 'sm' })} ${startingTier === null ? 'pointer-events-none opacity-50' : ''}`}
                          aria-disabled={startingTier === null}
                          tabIndex={startingTier === null ? -1 : undefined}
                        >
                          Choose tickets
                          <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      </div>
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
