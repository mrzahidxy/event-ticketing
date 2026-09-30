import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getPublicOrganizerPage,
  type PublicOrganizerPageData,
} from '@/features/public-organizer/api/public-organizer-client'
import { UserOrganizerBookingForm } from '@/features/public-organizer/components/public-organizer-booking-form'
import { HttpError } from '@/lib/errors'
import { formatCurrency, formatDate } from '@/lib/format'

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

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-4">
          <Link href="/organizers" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft className="h-4 w-4" />
            Back to events
          </Link>
        </div>
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(20,184,166,0.08),transparent_45%,rgba(15,23,42,0.03))]" />
          <div className="relative px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
            <div className="max-w-3xl space-y-4">
              {organizer.status === 'SUSPENDED' ? (
                <Badge variant="warning">Suspended</Badge>
              ) : null}
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                {organizer.name}
              </h1>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section id="events" className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Events</h2>

            {publishedEvents.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-white/80">
                <CardContent className="p-8 text-center">
                  <p className="text-lg font-medium text-slate-900">No public events available yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {publishedEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="group flex h-full flex-col overflow-hidden border-slate-200 bg-white/95 transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader className="flex-1 space-y-3 p-5">
                      <CardTitle className="text-xl">{event.name}</CardTitle>
                      {event.description ? (
                        <p className="text-sm leading-6 text-slate-600">{event.description}</p>
                      ) : null}
                      {event.eventDate || event.location ? (
                        <div className="space-y-2 text-sm text-slate-500">
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
                        </div>
                      ) : null}
                      {event.ticketTiers?.length ? (
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <div className="space-y-2">
                            {event.ticketTiers.map((tier) => {
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
                        </div>
                      ) : null}
                    </CardHeader>
                    <CardContent className="border-t border-slate-100 px-5 py-4">
                      <Link
                        href={`/organizers/${organizer.id}?eventId=${event.id}#booking-form`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Book
                      </Link>
                    </CardContent>
                  </Card>
                ))}
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
