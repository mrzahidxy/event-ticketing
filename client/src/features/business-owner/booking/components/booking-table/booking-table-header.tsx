import type { ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { BookingStatus } from '@/types/booking'

type BookingTableHeaderProps = {
  status: BookingStatus | 'all'
  eventName: string
  checkInDate: string
  checkOutDate: string
  onStatusChange: (value: BookingStatus | 'all') => void
  onEventNameChange: (value: string) => void
  onCheckInDateChange: (value: string) => void
  onCheckOutDateChange: (value: string) => void
  onReset: () => void
}

export function BookingTableHeader({
  status,
  eventName,
  checkInDate,
  checkOutDate,
  onStatusChange,
  onEventNameChange,
  onCheckInDateChange,
  onCheckOutDateChange,
  onReset,
}: BookingTableHeaderProps) {
  return (
    <header className="grid grid-cols-12 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="col-span-12 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_minmax(200px,1fr)_170px_170px_auto]">
        <div className="min-w-0 space-y-1">
          <label className="text-sm font-medium text-slate-600">Event name</label>
          <Input
            placeholder="Search by event name..."
            value={eventName}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onEventNameChange(event.target.value)
            }
            className="w-full"
          />
        </div>

        <div className="min-w-0 space-y-1">
          <label className="text-sm font-medium text-slate-600">Status</label>
          <Select
            value={status}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onStatusChange(event.target.value as BookingStatus | 'all')
            }
            className="w-full"
          >
            <option value="all">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">Check-in</label>
          <Input
            type="date"
            value={checkInDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onCheckInDateChange(event.target.value)
            }
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">Check-out</label>
          <Input
            type="date"
            value={checkOutDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onCheckOutDateChange(event.target.value)
            }
            className="w-full"
          />
        </div>

        <Button variant="outline" onClick={onReset} className="h-10 xl:self-end">
          Reset
        </Button>
      </div>
    </header>
  )
}
