const domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim() ?? ''
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim() ?? ''
const audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim() ?? ''

export const auth0Config = {
  domain,
  clientId,
  audience,
  isConfigured: Boolean(domain && clientId && audience),
}
