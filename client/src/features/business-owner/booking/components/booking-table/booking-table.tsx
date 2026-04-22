'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { DataTable } from '@/components/data-table'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/modal'
import type { PaginatedResult, Booking } from '@/types/booking'

import { BookingTableHeader } from './booking-table-header'
import { createBookingColumns } from './columns'
import { useBookingTable } from './use-booking-table'
import BookingDetailPage from '../../page'

type BookingTableProps = {
  initialData?: PaginatedResult<Booking>
}

export function BookingTable({ initialData }: BookingTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editingBookingId = searchParams.get('edit')

  const {
    sorting,
    setSorting,
    data,
    isFetching,
    page,
    pageSize,
    status,
    eventName,
    checkInDate,
    checkOutDate,
    setPage,
    setPageSize,
    setStatus,
    setEventName,
    setCheckInDate,
    setCheckOutDate,
    reset,
    isDeleting,
    deleteBooking,
  } = useBookingTable({
    initialData,
  })

  const columns = useMemo(
    () =>
      createBookingColumns({
        onEdit: (id) => router.push(`/business-owner/bookings?edit=${id}`, { scroll: false }),
        onDelete: deleteBooking,
        isDeleting,
      }),
    [deleteBooking, isDeleting, router]
  )

  const handleEditModalOpenChange = (open: boolean) => {
    if (!open) {
      router.push('/business-owner/bookings', { scroll: false })
    }
  }

  return (
    <section className="space-y-6">
      <BookingTableHeader
        status={status}
        eventName={eventName}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        onStatusChange={setStatus}
        onEventNameChange={setEventName}
        onCheckInDateChange={setCheckInDate}
        onCheckOutDateChange={setCheckOutDate}
        onReset={reset}
      />

      <DataTable
        columns={columns}
        data={data.data}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isFetching}
        manualPagination
        pageCount={data.meta.totalPages}
        pagination={{
          pageIndex: Math.max(0, page - 1),
          pageSize,
          onPageChange: (pageIndex) => setPage(pageIndex + 1),
          onPageSizeChange: (size) => setPageSize(size),
          pageSizeOptions: [5, 10, 20, 50],
        }}
        emptyMessage="No bookings match your filters yet."
      />

      <Dialog open={Boolean(editingBookingId)} onOpenChange={handleEditModalOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
          <DialogTitle className="sr-only">Edit booking</DialogTitle>
          {editingBookingId ? (
            <div className="p-6">
              <BookingDetailPage bookingId={editingBookingId} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
