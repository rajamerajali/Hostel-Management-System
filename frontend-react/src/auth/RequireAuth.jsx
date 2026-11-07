import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Same-origin now (single app) — declarative redirects, no cross-domain
// race condition to guard against, so no useEffect needed.
export default function RequireAuth({ roles, children }) {
  const { user } = useAuth()

  if (!user || !localStorage.getItem('hostel_token')) {
    return <Navigate to="/" replace />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }
  return children
}
