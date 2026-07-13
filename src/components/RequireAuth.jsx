import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/state/AuthContext"

export function RequireAuth({ admin = false, allowSuspended = false, children }) {
  const { isAdmin, isSuspended, loading, profileLoading, user } = useAuth()
  const location = useLocation()

  if (loading || (user && profileLoading)) {
    return (
      <div className="route-loading auth-route-loading" role="status">
        <span className="loader" aria-hidden="true" />
        Securing workspace
      </div>
    )
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (isSuspended && !allowSuspended) {
    return <Navigate to="/account" replace state={{ suspended: true }} />
  }

  if (admin && !isAdmin) {
    return <Navigate to="/account" replace state={{ denied: true }} />
  }

  return children
}
