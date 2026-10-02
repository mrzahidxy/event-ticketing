export function resolveOrganizerScopeId(
  user?: { organizerId?: string | null } | null,
) {
  return user?.organizerId ?? null
}
