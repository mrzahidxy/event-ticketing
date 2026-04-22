import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Booking } from '@/types/booking';


export const RESOURCE_STATUS_VARIANTS: Record<
  Booking['status'],
  'warning' | 'outline' | 'success' | 'default'
> = {
  CONFIRMED: 'success',
  PENDING: 'warning',
  CANCELLED: 'default',
  COMPLETED: 'outline',
}

const BASE_COLUMNS: ColumnDef<Booking>[] = [
  {
    accessorKey: 'eventName',
    header: () => 'Event',
    cell: ({ row }) => {
      const resource = row.original
      return (
        <div className="flex flex-col gap-1">
          <Link
            className="font-semibold text-slate-900 hover:text-teal-600"
            href={`/business-owner/bookings/${resource.id}`}
          >
            {resource.eventName}
          </Link>
          <span className="text-xs text-slate-500">Booked by {resource.user.name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: () => 'Status',
    cell: ({ row }) => (
      <Badge variant={RESOURCE_STATUS_VARIANTS[row.original.status]} className="capitalize">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'totalPrice',
    header: () => 'Booking Total',
    cell: ({ row }) => (
      <span className="font-medium text-slate-900">
        {formatCurrency(Number(row.original.totalPrice))}
      </span>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: () => 'Last Updated',
    cell: ({ row }) => (
      <span className="text-sm text-slate-500">
        {formatDate(new Date(row.original.updatedAt))}
      </span>
    ),
  },
]

type CreateColumnsOptions = {
  onDelete: (id: number) => void
  onEdit: (id: number) => void
  isDeleting: boolean
}

export function createBookingColumns({
  onDelete,
  onEdit,
  isDeleting,
}: CreateColumnsOptions): ColumnDef<Booking>[] {
  return [
    ...BASE_COLUMNS,
    {
      id: 'actions',
      header: () => 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn('hover:border-teal-300 hover:text-teal-600')}
            onClick={() => onEdit(row.original.id)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 hover:border-rose-200 hover:text-rose-600"
            onClick={() => onDelete(row.original.id)}
            disabled={isDeleting}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]
}
