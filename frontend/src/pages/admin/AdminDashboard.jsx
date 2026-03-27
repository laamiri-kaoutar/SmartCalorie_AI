import { createElement, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Activity, FileText, Users } from 'lucide-react'
import api from '../../api/client.js'
import { getApiErrorMessage } from '../../utils/apiError.js'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const EMERALD = '#10b981'
const SLATE_BLUE = '#64748b'

function MetricCard({ title, value, icon }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
          {createElement(icon, { className: 'h-5 w-5', 'aria-hidden': true })}
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-slate-800">
        {Number(value || 0).toLocaleString()}
      </p>
    </article>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_workouts: 0,
    total_plans: 0,
  })
  const [analytics, setAnalytics] = useState({
    activity: [],
    demographics: [],
  })
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState([])
  const successShownRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrors([])
    successShownRef.current = false
    Promise.allSettled([api.get('/admin/stats'), api.get('/admin/analytics')])
      .then((results) => {
        if (cancelled) return
        const nextErrors = []

        const statsResult = results[0]
        if (statsResult.status === 'fulfilled') {
          const d = statsResult.value.data
          setStats({
            total_users: Number(d?.total_users || 0),
            total_workouts: Number(d?.total_workouts || 0),
            total_plans: Number(d?.total_plans || 0),
          })
        } else {
          nextErrors.push(`Stats: ${getApiErrorMessage(statsResult.reason)}`)
        }

        const analyticsResult = results[1]
        if (analyticsResult.status === 'fulfilled') {
          const d = analyticsResult.value.data
          setAnalytics({
            activity: Array.isArray(d?.activity) ? d.activity : [],
            demographics: Array.isArray(d?.demographics) ? d.demographics : [],
          })
        } else {
          nextErrors.push(`Analytics: ${getApiErrorMessage(analyticsResult.reason)}`)
        }

        setErrors(nextErrors)
        if (!successShownRef.current && (statsResult.status === 'fulfilled' || analyticsResult.status === 'fulfilled')) {
          toast.success('Dashboard data loaded.')
          successShownRef.current = true
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    errors.forEach((msg) => toast.error(msg))
  }, [errors])

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">System overview</h1>
        <p className="mt-1 text-sm text-slate-600">Business intelligence and platform analytics.</p>
      </header>

      {errors.length > 0 && (
        <div role="alert" className="mb-6 space-y-2">
          {errors.map((msg) => (
            <div
              key={msg}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {msg}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-slate-600">Loading admin metrics…</p>
        </div>
      ) : (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <MetricCard title="Total registered users" value={stats.total_users} icon={Users} />
            <MetricCard title="Total workouts logged" value={stats.total_workouts} icon={Activity} />
            <MetricCard title="AI plans generated" value={stats.total_plans} icon={FileText} />
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">System activity</h2>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="workouts_count"
                    name="Workouts"
                    stroke={EMERALD}
                    fill={EMERALD}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="plans_count"
                    name="Plans"
                    stroke={SLATE_BLUE}
                    fill={SLATE_BLUE}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="mx-auto w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">User demographics</h2>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.demographics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="gender" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={EMERALD} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      )}
    </div>
  )
}
