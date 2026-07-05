import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Sparkles,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { appConfig } from '@/config/app'
import {
  getPublicOrganizerPage,
  type PublicOrganizerPageData,
} from '@/features/public-organizer/api/public-organizer-client'
import { PublicOrganizerBookingForm } from '@/features/public-organizer/components/public-organizer-booking-form'
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

const statusVariants = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
} as const

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
        <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-5 py-12 sm:px-8">
          <Card className="w-full border-slate-200 bg-white/95 backdrop-blur">
            <CardContent className="space-y-4 p-8 text-center sm:p-12">
              <Badge variant="destructive">Unable to load organizer</Badge>
              <CardTitle className="text-3xl">Public organizer page is temporarily unavailable</CardTitle>
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
  const heroSubtitle =
    organizer.status === 'SUSPENDED'
      ? 'This organizer is temporarily suspended, but the published event catalog is still visible.'
      : 'Explore the published event catalog and send a booking request directly from this page.'

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-6 flex items-center justify-end gap-4">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Public organizer landing
          </span>
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,184,166,0.08),transparent_45%,rgba(15,23,42,0.03))]" />
          <div className="relative grid gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1.4fr_0.8fr] lg:px-12 lg:py-14">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariants[organizer.status]}>
                  {organizer.status === 'SUSPENDED' ? 'Suspended' : 'Open'}
                </Badge>
                <Badge variant="outline" className="max-w-full font-mono text-[11px] sm:text-xs">
                  Organizer ID <span className="truncate">{organizer.id}</span>
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                  <Sparkles className="h-4 w-4" />
                  Public event page
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  {organizer.name}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  {heroSubtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="#events" className={buttonVariants({ size: 'lg' })}>
                  <CalendarDays className="h-4 w-4" />
                  View events
                </Link>
                <Link href="#booking-form" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                  <ArrowRight className="h-4 w-4" />
                  Go to booking form
                </Link>
              </div>
            </div>

            <div className="grid gap-4 self-start sm:grid-cols-2 lg:grid-cols-1">
              <Card className="border-slate-200 bg-slate-50/80">
                <CardContent className="space-y-2 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Published events</p>
                  <p className="text-3xl font-semibold text-slate-900">{publishedEvents.length}</p>
                  <p className="text-sm text-slate-500">Live listings visible to the public</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-slate-50/80">
                <CardContent className="space-y-2 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last updated</p>
                  <p className="text-3xl font-semibold text-slate-900">{latestUpdatedLabel}</p>
                  <p className="text-sm text-slate-500">
                    Updated on {formatDate(organizer.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section id="events" className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Event catalog</p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Published events under this organizer
                </h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock3 className="h-4 w-4" />
                Updated {latestUpdatedLabel}
              </div>
            </div>

            {publishedEvents.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-white/80">
                <CardContent className="p-8 text-center">
                  <p className="text-lg font-medium text-slate-900">No public events available yet</p>
                  <p className="mt-2 text-sm text-slate-500">
                    This organizer has not published any events for public viewing.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {publishedEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="group overflow-hidden border-slate-200 bg-white/95 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader className="space-y-4 p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <Badge variant="success">Published</Badge>
                          <CardTitle className="text-xl">{event.name}</CardTitle>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                          {formatCurrency(Number(event.price))}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        {event.description || '—'}
                      </p>
                      {event.ticketTiers?.length ? (
                        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Available tiers
                          </p>
                          <div className="space-y-2">
                            {event.ticketTiers.map((tier) => {
                              const availability = tier.quantityTotal === null
                                ? 'Unlimited'
                                : `${Math.max(tier.quantityTotal - tier.quantitySold, 0)} left`

                              return (
                                <div
                                  key={tier.id}
                                  className="flex items-center justify-between gap-3 text-xs text-slate-600"
                                >
                                  <span className="font-medium text-slate-700">{tier.name}</span>
                                  <span>
                                    {formatCurrency(tier.price, tier.currency.toUpperCase())} · {availability}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </CardHeader>
                    <CardContent className="space-y-4 border-t border-slate-100 px-6 py-4">
                      <div className="text-xs text-slate-500">
                        Created {formatDate(event.createdAt)}
                      </div>
                      <Link
                        href={`/organizers/${organizer.id}?eventId=${event.id}#booking-form`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Book this event
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6 lg:self-start xl:sticky xl:top-8">
            <PublicOrganizerBookingForm
              organizerId={organizerId}
              organizerName={organizer.name}
              events={publishedEvents}
              initialEventId={selectedEventId}
            />
          </aside>
        </div>

        <footer className="mt-14 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          <p>
            Public organizer page powered by {appConfig.name}. Booking requests are submitted
            through the public organizer API.
          </p>
        </footer>
      </div>
    </main>
  )
}
