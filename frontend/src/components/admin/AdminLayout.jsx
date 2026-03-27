import { createElement } from 'react'
import { Database, LayoutDashboard, Users } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

function SidebarLink({ to, icon, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'bg-emerald-500/20 text-emerald-200'
            : 'text-slate-200 hover:bg-slate-700/70 hover:text-white'
        }`
      }
    >
      {createElement(icon, { className: 'h-4 w-4 shrink-0', 'aria-hidden': true })}
      <span>{label}</span>
    </NavLink>
  )
}

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-700 bg-slate-900 p-5">
          <div className="mb-6 border-b border-slate-700 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Back office</p>
            <h1 className="mt-2 text-lg font-bold text-white">Admin console</h1>
          </div>
          <nav className="space-y-1.5">
            <SidebarLink to="/admin" icon={LayoutDashboard} label="System Overview" end />
            <SidebarLink to="/admin/users" icon={Users} label="User Management" />
            <SidebarLink to="/admin/ingredients" icon={Database} label="Food Library" />
          </nav>
          <div className="mt-auto pt-6">
            <Link
              to="/dashboard"
              className="block rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-center text-sm font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-200"
            >
              Switch to User App
            </Link>
          </div>
        </aside>

        <main className="min-h-screen flex-1 overflow-y-auto p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
