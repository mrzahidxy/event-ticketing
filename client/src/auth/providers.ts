import GitHub from 'next-auth/providers/github'

import { env } from '@/config/env'

export function getOptionalOAuthProviders() {
  const providers = []

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      }),
    )
  }

  return providers
}
