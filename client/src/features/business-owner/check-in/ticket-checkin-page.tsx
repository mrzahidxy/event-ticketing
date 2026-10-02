'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Keyboard, ScanLine, ShieldCheck, TicketCheck } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { HttpError } from '@/lib/errors'
import { DashboardHeader } from '@/features/business-owner/dashboard/components/dashboard-header'
import { checkInTicket } from './api/ticket-checkin-client'

function getErrorMessage(error: unknown) {
  if (!(error instanceof HttpError)) {
    return 'Check-in could not be completed. Please try again.'
  }

  if (error.status === 404) return 'Ticket not found for your organizer.'
  if (error.status === 409) return 'This ticket has already been checked in.'
  if (error.status === 422) return 'This ticket is not valid for entry.'
  if (error.status === 403) return 'You are not allowed to check in tickets for this organizer.'
  if (error.status === 503) return 'Check-in is temporarily unavailable. Please try again shortly.'

  return 'Check-in could not be completed. Please try again.'
}

export default function TicketCheckInPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [qrPayload, setQrPayload] = useState('')
  const mutation = useMutation({
    mutationFn: checkInTicket,
    onSuccess: () => {
      setQrPayload('')
      inputRef.current?.focus()
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = qrPayload.trim()
    if (!token || mutation.isPending) return
    mutation.mutate(token)
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Ticket check-in"
        description="Scan a ticket with a handheld reader or enter its token to verify admission."
        icon={<ScanLine className="h-5 w-5" aria-hidden="true" />}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Check-in desk
          </span>
        }
      />

      <section
        aria-labelledby="check-in-form-title"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_-35px_rgba(15,23,42,0.35)]"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
            <ScanLine className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="check-in-form-title" className="font-semibold text-slate-900">
              Scan ticket
            </h2>
            <p className="text-sm text-slate-500">Ready for the next guest</p>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            Scanner or keyboard
          </span>
        </div>

        <div className="p-5 sm:p-7">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="ticket-qr-token" className="text-sm font-medium text-slate-700">
              Ticket token
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                ref={inputRef}
                id="ticket-qr-token"
                name="qrPayload"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Scan or paste ticket token"
                aria-describedby="token-help"
                value={qrPayload}
                onChange={(event) => {
                  setQrPayload(event.target.value)
                  if (mutation.isSuccess || mutation.isError) mutation.reset()
                }}
                disabled={mutation.isPending}
                className="h-14 rounded-xl px-4 font-mono text-base shadow-none placeholder:font-sans placeholder:text-slate-400 sm:text-lg"
              />
              <Button
                type="submit"
                disabled={!qrPayload.trim() || mutation.isPending}
                size="lg"
                className="h-14 shrink-0 rounded-xl px-6 sm:min-w-40"
              >
                {mutation.isPending ? <Spinner size="sm" /> : <TicketCheck className="h-5 w-5" aria-hidden="true" />}
                {mutation.isPending ? 'Verifying…' : 'Check in'}
              </Button>
            </div>
            <p id="token-help" className="text-xs leading-5 text-slate-500">
              If your reader does not submit automatically, press Enter to verify the ticket.
            </p>
          </form>
        </div>
      </section>

      {mutation.isSuccess ? (
        <Alert variant="success" className="flex gap-3 rounded-2xl border-emerald-200 bg-emerald-50 p-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <AlertTitle className="text-base">Entry approved</AlertTitle>
            <AlertDescription className="text-emerald-800">
              Ticket <span className="font-mono font-semibold">{mutation.data.ticket.id}</span> checked in at{' '}
              {new Date(mutation.data.ticket.checkedInAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {mutation.isError ? (
        <Alert variant="destructive" className="rounded-2xl p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <AlertTitle className="text-base">Entry not approved</AlertTitle>
              <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
            </div>
          </div>
        </Alert>
      ) : null}

      <p className="text-center text-xs text-slate-500">
        Each ticket can be admitted once. A successful check-in is recorded immediately.
      </p>
    </div>
  )
}
