import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export function ProtectedRoute({ children }) {
  const { token, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return children
}
