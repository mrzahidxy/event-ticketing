import { createResettableStore } from '@/lib/store'
import type { BookingStatus } from '@/types/booking'

type BookingFilterState = {
  search: string
  status: BookingStatus | 'all'
  page: number
  pageSize: number
  eventName: string
  checkInDate: string
  checkOutDate: string
}

type BookingFilterActions = {
  setSearch: (value: string) => void
  setStatus: (value: BookingStatus | 'all') => void
  setPage: (value: number) => void
  setPageSize: (value: number) => void
  setEventName: (value: string) => void
  setCheckInDate: (value: string) => void
  setCheckOutDate: (value: string) => void
}

const defaultState: BookingFilterState = {
  search: '',
  status: 'all',
  page: 1,
  pageSize: 10,
  eventName: '',
  checkInDate: '',
  checkOutDate: '',
}

export const useResourceFilters = createResettableStore<
  BookingFilterState,
  BookingFilterActions
>({
  initialState: defaultState,
  createActions: ({ set }) => ({
    setSearch: (value) =>
      set({
        search: value,
        page: 1,
      }),
    setStatus: (value) =>
      set({
        status: value,
        page: 1,
      }),
    setPage: (value) => set({ page: value }),
    setPageSize: (value) =>
      set({
        pageSize: value,
        page: 1,
      }),
    setEventName: (value) =>
      set({
        eventName: value,
        page: 1,
      }),
    setCheckInDate: (value) =>
      set({
        checkInDate: value,
        page: 1,
      }),
    setCheckOutDate: (value) =>
      set({
        checkOutDate: value,
        page: 1,
      }),
  }),
})
