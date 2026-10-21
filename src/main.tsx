import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { AuthConfigurationRequired } from './auth/AuthControls'
import { auth0Config } from './auth/config'
import './index.css'
import App from './App.tsx'

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    {auth0Config.isConfigured ? (
      <Auth0Provider
        domain={auth0Config.domain}
        clientId={auth0Config.clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: auth0Config.audience,
          scope: 'openid profile email',
        }}
      >
        <App />
      </Auth0Provider>
    ) : (
      <AuthConfigurationRequired />
    )}
  </StrictMode>,
)
