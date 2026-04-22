'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { ExternalLink, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { SectionCard } from '../dashboard/components/section-card'
import { organizerKeys } from './api/organizer-keys'
import {
  addOrganizerStaff,
  getOrganizer,
  listOrganizerStaffCandidates,
  listOrganizerStaff,
  removeOrganizerStaff,
  updateOrganizer,
} from './api/organizer-client'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatRelativeDate } from '@/lib/format'
import { resolveOrganizerScopeId } from '@/features/business-owner/analytics/utils'

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export default function TeamPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const organizerId = resolveOrganizerScopeId(session?.user ?? null)
  const role = session?.user.role ?? 'USER'
  const canManageOrganizer = role === 'ADMIN' || role === 'OWNER'
  const canManageStaff = canManageOrganizer

  const [organizerName, setOrganizerName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const candidateSearch = candidateEmail.trim()

  const organizerQuery = useQuery({
    queryKey: organizerId ? organizerKeys.detail(organizerId) : ['organizers', 'detail', 'unassigned'],
    queryFn: () => getOrganizer(organizerId as string),
    enabled: Boolean(organizerId),
  })

  const staffQuery = useQuery({
    queryKey: organizerId ? organizerKeys.staff(organizerId) : ['organizers', 'staff', 'unassigned'],
    queryFn: () => listOrganizerStaff(organizerId as string),
    enabled: Boolean(organizerId) && canManageStaff,
  })

  const staffCandidatesQuery = useQuery({
    queryKey: organizerId
      ? organizerKeys.staffCandidates(organizerId, candidateSearch)
      : ['organizers', 'staff-candidates', 'unassigned', candidateSearch],
    queryFn: () => listOrganizerStaffCandidates(organizerId as string, candidateSearch),
    enabled: Boolean(organizerId) && canManageStaff && candidateSearch.length >= 2,
  })

  const organizer = organizerQuery.data ?? null
  const staff = staffQuery.data ?? []
  const staffCandidates = staffCandidatesQuery.data ?? []
  const candidateEmailLower = candidateSearch.toLowerCase()
  const matchedCandidate = staffCandidates.find(
    (candidate) => candidate.email.toLowerCase() === candidateEmailLower
  )

  useEffect(() => {
    if (organizer?.name) {
      setOrganizerName(organizer.name)
    }
  }, [organizer?.name])

  const organizerMutation = useMutation({
    mutationFn: (name: string) => updateOrganizer(organizerId as string, { name }),
    onSuccess: (updatedOrganizer) => {
      toast.success('Organizer updated')
      setOrganizerName(updatedOrganizer.name)
      queryClient.invalidateQueries({ queryKey: organizerKeys.detail(organizerId as string) })
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, 'Unable to update organizer'))
    },
  })

  const addStaffMutation = useMutation({
    mutationFn: (userId: number) => addOrganizerStaff(organizerId as string, { userId }),
    onSuccess: () => {
      toast.success('Staff member added')
      setCandidateEmail('')
      queryClient.invalidateQueries({ queryKey: organizerKeys.staff(organizerId as string) })
      queryClient.invalidateQueries({
        queryKey: organizerKeys.staffCandidates(organizerId as string, candidateSearch),
      })
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, 'Unable to add staff member'))
    },
  })

  const removeStaffMutation = useMutation({
    mutationFn: (userId: string) => removeOrganizerStaff(organizerId as string, userId),
    onSuccess: () => {
      toast.success('Staff member removed')
      queryClient.invalidateQueries({ queryKey: organizerKeys.staff(organizerId as string) })
      queryClient.invalidateQueries({
        queryKey: organizerKeys.staffCandidates(organizerId as string, candidateSearch),
      })
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, 'Unable to remove staff member'))
    },
  })

  const handleOrganizerSubmit = () => {
    if (!organizerId || !organizerName.trim()) {
      toast.error('Organizer name is required')
      return
    }

    organizerMutation.mutate(organizerName.trim())
  }

  const handleAddStaff = () => {
    if (!candidateSearch) {
      toast.error('Enter an email address')
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(candidateSearch)) {
      toast.error('Enter a valid email address')
      return
    }

    if (staffCandidatesQuery.isLoading) {
      toast.error('Still checking that email, please try again')
      return
    }

    if (!matchedCandidate) {
      toast.error('No assignable user found for that email')
      return
    }

    const userId = Number(matchedCandidate.id)
    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error('Matched user has an invalid ID')
      return
    }

    addStaffMutation.mutate(userId)
  }

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Team"
        description="Manage organizer profile and staff assignments using supported endpoints."
      />

      {!organizerId ? (
        <SectionCard title="Organizer Access">
          <p className="text-sm text-slate-600">
            This account is not linked to an organizer. Owner and staff workflows stay blocked
            until the backend user record includes an `organizerId` UUID.
          </p>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Organizer Profile"
            subtitle="Live organizer metadata from the backend"
            actions={
              <Link
                href={`/organizers/${organizerId}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ExternalLink className="h-4 w-4" />
                View public page
              </Link>
            }
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <FormField
                label="Organizer name"
                htmlFor="organizer-name"
                description={`Organizer ID: ${organizerId}`}
              >
                <Input
                  id="organizer-name"
                  value={organizerName || organizer?.name || ''}
                  onChange={(event) => setOrganizerName(event.target.value)}
                  disabled={!canManageOrganizer || organizerMutation.isPending}
                />
              </FormField>
              <div className="flex items-end">
                <Button
                  onClick={handleOrganizerSubmit}
                  disabled={!canManageOrganizer || organizerMutation.isPending}
                >
                  {organizerMutation.isPending ? 'Saving...' : 'Save organizer'}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <Badge variant={organizer?.status === 'ACTIVE' ? 'success' : 'outline'}>
                {organizer?.status ?? 'Unknown'}
              </Badge>
              <span>
                Updated{' '}
                {organizer?.updatedAt ? formatRelativeDate(organizer.updatedAt) : 'unknown'}
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title="Organizer Staff"
            subtitle="Search USER/STAFF by email. USER accounts become STAFF when assigned."
            actions={
              canManageStaff ? (
                <div className="flex items-end gap-3">
                  <div className="min-w-[220px] space-y-2">
                    <Input
                      value={candidateEmail}
                      onChange={(event) => setCandidateEmail(event.target.value)}
                      placeholder="Type user email"
                      type="email"
                      disabled={addStaffMutation.isPending}
                    />
                  </div>
                  <Button
                    onClick={handleAddStaff}
                    disabled={addStaffMutation.isPending || !candidateSearch}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add staff
                  </Button>
                </div>
              ) : null
            }
          >
            <div className="space-y-4">
              {canManageStaff && candidateSearch.length > 0 && candidateSearch.length < 2 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                  Enter at least 2 characters of the user email to search.
                </div>
              ) : null}
              {canManageStaff &&
              candidateSearch.length >= 2 &&
              !staffCandidatesQuery.isLoading &&
              !staffCandidates.length ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                  No assignable users match that email.
                </div>
              ) : null}
              {canManageStaff && candidateSearch.length >= 2 && matchedCandidate ? (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4 text-sm text-teal-700">
                  Match found: {matchedCandidate.name ?? matchedCandidate.email} ({matchedCandidate.role})
                </div>
              ) : null}
              {staffCandidatesQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  {getErrorMessage(staffCandidatesQuery.error, 'Unable to search users')}
                </div>
              ) : null}
              {staffQuery.isLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <Spinner size="sm" />
                  Loading organizer staff...
                </div>
              ) : !canManageStaff ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
                  You do not have permission to view or manage organizer staff.
                </div>
              ) : staff.length ? (
                staff.map((member, index) => (
                  <div
                    key={`${member.id || 'missing-id'}-${member.email || 'missing-email'}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {member.name ?? 'Unnamed staff member'}
                        </p>
                        <Badge variant="outline">{member.role}</Badge>
                        <Badge variant={member.status === 'ACTIVE' ? 'success' : 'outline'}>
                          {member.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                    {canManageOrganizer ? (
                      <Button
                        variant="outline"
                        onClick={() => removeStaffMutation.mutate(member.id)}
                        disabled={removeStaffMutation.isPending}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
                  No staff members are assigned to this organizer yet.
                </div>
              )}
            </div>
          </SectionCard>

        </>
      )}

    </div>
  )
}
