import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  roles: Role[];
  organizerId?: string | null;
  permissions: string[];
}

export type SanitizedUser = AuthenticatedUser & {
  createdAt?: Date;
  organizerName?: string | null;
  updatedAt?: Date;
};
