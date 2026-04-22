'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/modal'
import BookingDetailPage from '@/features/business-owner/booking/page'
import { useRouter } from 'next/navigation'

export default function BookingDetailModalPage() {
  const router = useRouter()

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.push('/business-owner/bookings')
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <DialogTitle className="sr-only">Edit booking</DialogTitle>
        <div className="p-6">
          <BookingDetailPage />
        </div>
      </DialogContent>
    </Dialog>
  )
}
