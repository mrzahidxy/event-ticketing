import { useMemo, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useResourceFilters } from '@/hooks/use-booking-filters'
import {
  deleteBooking,
  fetchBookings,
} from '../../api/booking-client'
import { resourceKeys } from '../../api/booking-keys'
import type { PaginatedResult, Booking, ResourceFilters } from '@/types/booking'

type UseBookingTableOptions = {
  initialData?: PaginatedResult<Booking>
}

type BookingListKey = ReturnType<typeof resourceKeys.list>

type DeleteContext = {
  previous?: PaginatedResult<Booking>
  listKey: BookingListKey
}

export function useBookingTable({ initialData }: UseBookingTableOptions) {
  const queryClient = useQueryClient()
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updatedAt', desc: true },
  ])
  const {
    page,
    pageSize,
    search,
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
  } = useResourceFilters()

  const currentSort = sorting[0]
  const sortBy = (currentSort?.id ?? 'updatedAt') as ResourceFilters['sortBy']
  const sortDirection: Required<ResourceFilters>['sortDirection'] =
    currentSort?.desc === false ? 'asc' : 'desc'

  const filters = useMemo<ResourceFilters>(
    () => ({
      page,
      pageSize,
      search,
      status: status === 'all' ? undefined : status,
      sortBy,
      sortDirection,
      eventName: eventName || undefined,
      checkInDate: checkInDate || undefined,
      checkOutDate: checkOutDate || undefined,
    }),
    [page, pageSize, search, status, sortBy, sortDirection, eventName, checkInDate, checkOutDate]
  )

  const { data, isFetching } = useQuery<PaginatedResult<Booking>>({
    queryKey: resourceKeys.list(filters),
    queryFn: () => fetchBookings(filters),
    initialData,
    placeholderData: (previous) => previous ?? initialData,
  })

  const fallbackData = useMemo<PaginatedResult<Booking>>(
    () => ({
      data: [],
      meta: {
        page,
        limit: pageSize,
        totalItems: 0,
        totalPages: 0,
      },
    }),
    [page, pageSize]
  )

  const resolvedData = data ?? fallbackData

  const deleteMutation = useMutation<unknown, Error, number, DeleteContext>({
    mutationFn: deleteBooking,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: resourceKeys.all })

      const listKey = resourceKeys.list(filters)
      const previous =
        queryClient.getQueryData<PaginatedResult<Booking>>(listKey)

      queryClient.setQueryData<PaginatedResult<Booking>>(
        listKey,
        (current) =>
          current
            ? {
              ...current,
              data: current.data.filter((item) => item.id !== id),
            }
            : current
      )

      return { previous, listKey }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous && context.listKey) {
        queryClient.setQueryData(context.listKey, context.previous)
      }
      toast.error('Unable to delete booking')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all })
      toast.success('Booking deleted')
    },
  })

  return {
    sorting,
    setSorting,
    data: resolvedData,
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
    isDeleting: deleteMutation.isPending,
    deleteBooking: (id: number) => deleteMutation.mutate(id),
  }
}
