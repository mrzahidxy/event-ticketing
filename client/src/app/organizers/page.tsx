import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, Sparkles, Ticket } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { appConfig } from '@/config/app'
import { getPublicOrganizersPage } from '@/features/public-organizer/api/public-organizer-client'
import { formatCurrency, formatDate } from '@/lib/format'

export const metadata: Metadata = {
  title: 'All Public Events',
  description: 'Browse all published events from public organizers.',
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
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="relative px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
            <div className="max-w-3xl space-y-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                <Sparkles className="h-4 w-4" />
                Public event marketplace
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                Browse all public events
              </h1>
              <p className="text-base leading-7 text-slate-600 sm:text-lg">
                Discover published events from every active organizer and reserve tickets from the
                organizer public page.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="success">{eventCards.length} published events</Badge>
                <Badge variant="outline">{organizers.length} active organizers</Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Events</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Published event catalog
              </h2>
            </div>
          </div>

          {eventCards.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/80">
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium text-slate-900">No public events available yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Active organizers have not published any events for public booking.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {eventCards.map(({ organizer, event }) => {
                const ticketTiers = event.ticketTiers ?? []
                const firstTier = ticketTiers[0]
                const available = firstTier?.quantityTotal === null
                  ? 'Unlimited'
                  : firstTier
                    ? `${Math.max(firstTier.quantityTotal - firstTier.quantitySold, 0)} left`
                    : 'No tiers'

                return (
                  <Card
                    key={`${organizer.id}-${event.id}`}
                    className="group overflow-hidden border-slate-200 bg-white/95 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader className="space-y-4 p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <Badge variant="success">Published</Badge>
                          <CardTitle className="text-xl">{event.name}</CardTitle>
                        </div>
                        {firstTier ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                            {formatCurrency(firstTier.price, firstTier.currency.toUpperCase())}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        {event.description || 'More details will be shared by the organizer.'}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4 border-t border-slate-100 px-6 py-4">
                      <div className="space-y-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{organizer.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          <span>Created {formatDate(event.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4" />
                          <span>{ticketTiers.length} bookable tier(s), {available}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/organizers/${organizer.id}`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Organizer page
                        </Link>
                        <Link
                          href={`/organizers/${organizer.id}?eventId=${event.id}#booking-form`}
                          className={buttonVariants({ size: 'sm' })}
                        >
                          <ArrowRight className="h-4 w-4" />
                          Book event
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <footer className="mt-14 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          <p>Public event catalog powered by {appConfig.name}.</p>
        </footer>
      </div>
    </main>
  )
}
