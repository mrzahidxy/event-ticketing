import type { AdminUserRole, AdminUser } from '../../api/user-client'

export type DialogAction = 'delete'

export type DirectoryUser = {
  id: string
  email: string
  name: string
  organizer: string
  business: string
  roleLabel: string
  roleValue: AdminUserRole
  statusLabel: string
  statusValue: 'ACTIVE' | 'INACTIVE'
  createdDate: string
  raw: AdminUser
}

export type CreateUserFormValues = {
  name?: string
  email: string
  password: string
  role: AdminUserRole
}

export type StatusFilterOption = 'All' | 'Active' | 'Inactive'
