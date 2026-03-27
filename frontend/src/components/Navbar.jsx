import { Link, NavLink } from 'react-router-dom'
import { Activity, History, LayoutDashboard, LogOut, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'

export function Navbar() {
  const { user, token, logout, loading } = useAuth()
  const loggedIn = Boolean(user && token)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <Link to="/" className="flex items-center gap-2 text-emerald-600 transition hover:text-emerald-700">
          <Activity className="h-8 w-8 shrink-0" aria-hidden />
          <span className="text-lg font-semibold text-slate-900">SmartCalorie</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {!loading && !loggedIn && (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Signup
              </Link>
            </>
          )}

          {!loading && loggedIn && (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Dashboard
              </NavLink>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <History className="h-4 w-4" aria-hidden />
                History
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <User className="h-4 w-4" aria-hidden />
                Profile
              </NavLink>
              {user?.is_admin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                      isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Admin
                </NavLink>
              )}
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:px-4"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
