'use client'

import { useMemo, useState } from 'react'
import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type PaginationControls = {
  pageIndex: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  toolbar?: React.ReactNode
  emptyMessage?: React.ReactNode
  isLoading?: boolean
  enableColumnVisibility?: boolean
  manualPagination?: boolean
  pageCount?: number
  pagination?: PaginationControls
  sorting?: SortingState
  onSortingChange?: (state: SortingState) => void
  initialVisibility?: VisibilityState
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  emptyMessage = 'No results found.',
  isLoading = false,
  enableColumnVisibility = false,
  manualPagination = false,
  pageCount,
  pagination,
  sorting,
  onSortingChange,
  initialVisibility,
  className,
}: DataTableProps<TData, TValue>) {
  const isControlledSorting = typeof sorting !== 'undefined'
  const [internalSorting, setInternalSorting] = useState<SortingState>(sorting ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialVisibility ?? {}
  )
  const [rowSelection, setRowSelection] = useState({})
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: pagination?.pageIndex ?? 0,
    pageSize: pagination?.pageSize ?? pagination?.pageSizeOptions?.[0] ?? 10,
  })

  const resolvedSorting = isControlledSorting ? sorting! : internalSorting
  const resolvedPagination: PaginationState = manualPagination
    ? {
        pageIndex: pagination?.pageIndex ?? 0,
        pageSize: pagination?.pageSize ?? internalPagination.pageSize,
      }
    : internalPagination

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextState = functionalUpdate(updater, resolvedSorting)
    onSortingChange?.(nextState)
    if (!isControlledSorting) {
      setInternalSorting(nextState)
    }
  }

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const nextState = functionalUpdate(updater, resolvedPagination)
    if (manualPagination) {
      pagination?.onPageChange(nextState.pageIndex)
      if (nextState.pageSize !== resolvedPagination.pageSize) {
        pagination?.onPageSizeChange?.(nextState.pageSize)
      }
    } else {
      setInternalPagination(nextState)
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: resolvedSorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: resolvedPagination,
    },
    enableRowSelection: true,
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination,
    pageCount,
    getRowId: (originalRow, index) => {
      // upstream keys might repeat; fallback to index to keep rows stable
      const row = originalRow as { id?: string | number }
      return typeof row?.id === 'string' || typeof row?.id === 'number'
        ? String(row.id)
        : String(index)
    },
  })

  const showEmptyState = !table.getRowModel().rows.length && !isLoading
  const pageSizeOptions = pagination?.pageSizeOptions ?? [10, 20, 30, 40, 50]

  const currentPage = manualPagination
    ? (pagination?.pageIndex ?? 0) + 1
    : table.getState().pagination.pageIndex + 1
  const totalPages = manualPagination
    ? pageCount ?? 0
    : table.getPageCount()

  const selectedRowCount = useMemo(
    () => table.getFilteredSelectedRowModel().rows.length,
    [table]
  )

  const selectionMessage =
    selectedRowCount === 0
      ? 'No rows selected'
      : `${selectedRowCount} row${selectedRowCount === 1 ? '' : 's'} selected`

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {toolbar}
          <span className="text-sm text-slate-500">{selectionMessage}</span>
        </div>

        {enableColumnVisibility ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Columns
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                      'whitespace-nowrap px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ChevronUp className="h-3 w-3 text-slate-400" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      ) : null}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showEmptyState ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-slate-400"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-4 text-sm text-slate-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur">
            <span className="text-sm font-medium text-slate-500">Loading...</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
        <div>
          Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Rows</span>
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={resolvedPagination.pageSize}
              onChange={(event) =>
                manualPagination
                  ? pagination?.onPageSizeChange?.(Number(event.target.value))
                  : table.setPageSize(Number(event.target.value))
              }
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                manualPagination
                  ? pagination?.onPageChange(Math.max(0, resolvedPagination.pageIndex - 1))
                  : table.previousPage()
              }
              disabled={
                manualPagination
                  ? resolvedPagination.pageIndex <= 0 || (pageCount ?? 0) === 0
                  : !table.getCanPreviousPage()
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                manualPagination
                  ? pagination?.onPageChange(resolvedPagination.pageIndex + 1)
                  : table.nextPage()
              }
              disabled={
                manualPagination
                  ? (pageCount ?? 0) === 0 ||
                    resolvedPagination.pageIndex + 1 >= (pageCount ?? 0)
                  : !table.getCanNextPage()
              }
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
