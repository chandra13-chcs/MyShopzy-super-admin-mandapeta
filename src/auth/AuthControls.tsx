import { useAuth0 } from '@auth0/auth0-react'

export function AuthControls() {
  const { error, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0()

  if (isLoading) {
    return <div className="admin-profile" aria-live="polite">Checking admin session…</div>
  }

  if (error) {
    return (
      <div className="admin-profile" role="alert">
        <span><strong>Authentication unavailable</strong><small>Please try signing in again.</small></span>
        <button className="auth-action" onClick={() => loginWithRedirect()} type="button">Sign in</button>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-profile">
        <span><strong>Admin sign-in required</strong><small>Protected records stay unavailable until sign-in.</small></span>
        <button className="auth-action" onClick={() => loginWithRedirect()} type="button">Sign in</button>
      </div>
    )
  }

  return (
    <div className="admin-profile">
      <span className="profile-avatar">{user?.name?.slice(0, 1) ?? 'A'}</span>
      <span><strong>{user?.name ?? 'Signed in'}</strong><small>Admin access is checked by the backend</small></span>
      <button
        className="auth-action"
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        type="button"
      >
        Sign out
      </button>
    </div>
  )
}

export function AuthConfigurationRequired() {
  return (
    <main className="auth-setup">
      <h1>Super Admin sign-in is not configured</h1>
      <p>Set the following public Auth0 application values to enable sign-in.</p>
      <ul>
        <li>VITE_AUTH0_DOMAIN</li>
        <li>VITE_AUTH0_CLIENT_ID</li>
        <li>VITE_AUTH0_AUDIENCE</li>
      </ul>
      <p>Protected admin records remain unavailable until Auth0 and backend authorization are configured.</p>
    </main>
  )
}
