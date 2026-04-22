'use client'

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import { formatDate } from '@/lib/format'
import { toTitleCase } from '@/lib/utils'
import { isAdminRole } from '@/types/user'

import {
  createUser,
  deleteUser,
  listUsers,
  updateUserProfile,
  updateUserRole,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
  type UserListFilters,
} from '../../api/user-client'
import { userKeys } from '../../api/user-keys'
import type {
  CreateUserFormValues,
  DialogAction,
  DirectoryUser,
  StatusFilterOption,
} from './types'
import { ROLE_LABELS, STATUS_LABELS } from './constants'

type UseUsersTableState = {
  searchQuery: string
  statusFilter: StatusFilterOption
  isCreateOpen: boolean
  dialog: {
    isOpen: boolean
    user?: DirectoryUser
    action?: DialogAction
  }
}

function mapUserToDirectoryUser(user: AdminUser): DirectoryUser {
  const roleValue = (user.role ?? 'OWNER') as AdminUserRole
  const normalizedStatus =
    typeof user.status === 'string' && user.status.toUpperCase() === 'INACTIVE'
      ? 'INACTIVE'
      : 'ACTIVE'
  const statusValue = normalizedStatus as AdminUserStatus
  const statusLabel = STATUS_LABELS[statusValue] ?? toTitleCase(statusValue)
  const trimmedName = user.name?.trim() ?? ''
  const derivedName = trimmedName || user.email.split('@')[0] || '—'
  const organizerLabel = user.organizerName?.trim() || user.business?.trim() || '—'

  return {
    id: user.id,
    email: user.email,
    name: derivedName,
    organizer: organizerLabel,
    roleLabel: ROLE_LABELS[roleValue] ?? toTitleCase(roleValue),
    roleValue,
    business: organizerLabel,
    statusLabel,
    statusValue,
    createdDate: user.createdAt ? formatDate(user.createdAt) : '—',
    raw: {
      ...user,
      role: roleValue,
      status: statusValue,
    },
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const value = (error as { message?: unknown }).message
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return fallback
}

export const createUserDefaultValues: CreateUserFormValues = {
  name: '',
  email: '',
  password: '',
  role: 'OWNER',
}

export function useUsersTable() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  const [{ searchQuery, statusFilter, isCreateOpen, dialog }, setState] =
    useState<UseUsersTableState>({
      searchQuery: '',
      statusFilter: 'All',
      isCreateOpen: false,
      dialog: { isOpen: false },
    })

  const currentUserId = session?.user?.id ?? null
  const currentRole = session?.user?.role
  const isAdmin = isAdminRole(currentRole)

  const deferredSearch = useDeferredValue(searchQuery)

  const apiFilters = useMemo<Partial<UserListFilters>>(() => {
    const filters: Partial<UserListFilters> = {}

    if (deferredSearch.trim()) {
      filters.search = deferredSearch.trim()
    }

    if (statusFilter === 'Active') {
      filters.status = 'ACTIVE'
    } else if (statusFilter === 'Inactive') {
      filters.status = 'INACTIVE'
    }

    return filters
  }, [deferredSearch, statusFilter])

  const hasShownError = useRef(false)

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: userKeys.list(apiFilters),
    queryFn: () => listUsers(apiFilters),
    placeholderData: (previousData) => previousData,
  })

  useEffect(() => {
    if (error && !hasShownError.current) {
      toast.error('Failed to load users')
      hasShownError.current = true
    } else if (!error && hasShownError.current) {
      hasShownError.current = false
    }
  }, [error])

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (response) => {
      toast.success(response.message ?? 'User created successfully')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      setState((prev) => ({
        ...prev,
        isCreateOpen: false,
      }))
    },
    onError: (mutationError: unknown) => {
      toast.error(getErrorMessage(mutationError, 'Failed to create user'))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminUserStatus }) =>
      updateUserProfile(id, { status }),
    onSuccess: (response, variables) => {
      const statusLabel = variables.status === 'ACTIVE' ? 'activated' : 'suspended'
      toast.success(response.message ?? `User ${statusLabel}`)
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (mutationError: unknown) => {
      toast.error(getErrorMessage(mutationError, 'Failed to update user status'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (response) => {
      toast.success(response.message ?? 'User deleted')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (mutationError: unknown) => {
      toast.error(getErrorMessage(mutationError, 'Failed to delete user'))
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminUserRole }) =>
      updateUserRole(id, { role }),
    onSuccess: (response) => {
      toast.success(response.message ?? 'User role updated')
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (mutationError: unknown) => {
      toast.error(getErrorMessage(mutationError, 'Failed to update user role'))
    },
  })

  const directoryUsers = useMemo<DirectoryUser[]>(
    () => (data?.users ?? []).map(mapUserToDirectoryUser),
    [data?.users]
  )

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase()
    return directoryUsers.filter((user) => {
      const matchesSearch =
        !normalizedQuery ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.business.toLowerCase().includes(normalizedQuery)

      const matchesStatus =
        statusFilter === 'All' || user.statusLabel === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [directoryUsers, searchQuery, statusFilter])

  const isInitialLoading = isLoading && !data
  const isMutatingAction = statusMutation.isPending || deleteMutation.isPending

  const setSearchQuery = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: value,
    }))
  }, [])

  const setStatusFilter = useCallback((value: StatusFilterOption) => {
    setState((prev) => ({
      ...prev,
      statusFilter: value,
    }))
  }, [])

  const requestAction = useCallback(
    (user: DirectoryUser, action: DialogAction) => {
      if (isMutatingAction) {
        toast.info('Please wait for the current request to finish')
        return
      }

      if (!isAdmin) {
        toast.error('You do not have permission to manage users')
        return
      }

      if (user.id === currentUserId) {
        toast.error('You cannot perform this action on your own account')
        return
      }

      setState((prev) => ({
        ...prev,
        dialog: {
          isOpen: true,
          user,
          action,
        },
      }))
    },
    [currentUserId, isAdmin, isMutatingAction]
  )

  const resetDialog = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dialog: { isOpen: false },
    }))
  }, [])

  const handleConfirmAction = useCallback(async () => {
    const pendingUser = dialog.user
    const pendingAction = dialog.action

    if (!pendingUser || !pendingAction || isMutatingAction) {
      return
    }

    try {
      if (pendingAction === 'delete') {
        await deleteMutation.mutateAsync(pendingUser.id)
      } else {
        const nextStatus: AdminUserStatus =
          pendingAction === 'activate' ? 'ACTIVE' : 'INACTIVE'
        await statusMutation.mutateAsync({
          id: pendingUser.id,
          status: nextStatus,
        })
      }

      resetDialog()
    } catch {
      // handled via toast in mutation callbacks
    }
  }, [deleteMutation, dialog.action, dialog.user, isMutatingAction, resetDialog, statusMutation])

  const handleRoleChange = useCallback(
    async (user: DirectoryUser, role: AdminUserRole) => {
      if (!isAdmin) {
        toast.error('You do not have permission to update roles')
        return
      }

      if (user.id === currentUserId) {
        toast.error('You cannot change your own role')
        return
      }

      if (role === user.roleValue || roleMutation.isPending) {
        return
      }

      try {
        await roleMutation.mutateAsync({ id: user.id, role })
      } catch {
        // handled in mutation error
      }
    },
    [currentUserId, isAdmin, roleMutation]
  )

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      if (open && !isAdmin) {
        toast.error('You do not have permission to create users')
        return
      }

      setState((prev) => ({
        ...prev,
        isCreateOpen: open,
      }))
    },
    [isAdmin]
  )

  const handleCreateUser = useCallback(
    async (values: CreateUserFormValues) => {
      if (!isAdmin) {
        toast.error('You do not have permission to create users')
        return
      }

      await createMutation.mutateAsync({
        email: values.email,
        password: values.password,
        role: values.role,
        name: values.name?.trim() || undefined,
      })
    },
    [createMutation, isAdmin]
  )

  const openCreateModal = useCallback(() => handleCreateOpenChange(true), [handleCreateOpenChange])
  const closeCreateModal = useCallback(() => handleCreateOpenChange(false), [handleCreateOpenChange])

  return {
    rows: filteredUsers,
    rawUsers: directoryUsers,
    meta: data?.meta,
    isInitialLoading,
    isFetching,
    isAdmin,
    currentUserId,
    searchQuery,
    statusFilter,
    setSearchQuery,
    setStatusFilter,
    requestAction,
    resetDialog,
    handleConfirmAction,
    handleRoleChange,
    dialog,
    isMutatingAction,
    isRoleUpdating: roleMutation.isPending,
    isCreateOpen,
    openCreateModal,
    closeCreateModal,
    handleCreateOpenChange,
    handleCreateUser,
    isCreating: createMutation.isPending,
  }
}

export type UsersTableContext = ReturnType<typeof useUsersTable>
