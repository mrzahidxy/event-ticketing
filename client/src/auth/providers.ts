import GitHub from 'next-auth/providers/github'

export function getOptionalOAuthProviders() {
  const providers = []

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      }),
    )
  }

  return providers
}
