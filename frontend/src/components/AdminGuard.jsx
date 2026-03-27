import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export function AdminGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    )
  }

  if (!user?.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
