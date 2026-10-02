'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, ScanLine } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { HttpError } from '@/lib/errors'
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
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ticket check-in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter a ticket token, or use a handheld QR reader to fill it in.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-5">
          <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="ticket-qr-token" className="text-sm font-medium text-slate-700">
              Ticket or QR token
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                ref={inputRef}
                id="ticket-qr-token"
                name="qrPayload"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Scan with a handheld reader or paste the token"
                value={qrPayload}
                onChange={(event) => {
                  setQrPayload(event.target.value)
                  if (mutation.isSuccess || mutation.isError) mutation.reset()
                }}
                disabled={mutation.isPending}
                className="font-mono"
              />
              <Button type="submit" disabled={!qrPayload.trim() || mutation.isPending}>
                {mutation.isPending ? <Spinner size="sm" /> : <ScanLine className="h-4 w-4" />}
                {mutation.isPending ? 'Checking…' : 'Check in'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {mutation.isSuccess ? (
        <Alert variant="success">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <AlertTitle>Entry approved</AlertTitle>
              <AlertDescription>
                Ticket <span className="font-mono font-medium">{mutation.data.ticket.id}</span> was checked in at{' '}
                {new Date(mutation.data.ticket.checkedInAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ) : null}

      {mutation.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Check-in rejected</AlertTitle>
          <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
