import BookingDetailPage from '@/features/business-owner/booking/page'
import type { Metadata } from 'next'

type BookingPageProps = {
  params: Promise<{ bookingId: string }>
}

export async function generateMetadata({
  params,
}: BookingPageProps): Promise<Metadata> {
  const { bookingId } = await params

  return {
    title: `Booking ${bookingId} - Bookings`,
  }
}

export default async function BookingDetailRoutePage({ params }: BookingPageProps) {
  const { bookingId } = await params
  return <BookingDetailPage bookingId={bookingId} />
}
