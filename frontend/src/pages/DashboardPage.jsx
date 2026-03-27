import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Sparkles, Utensils, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { Navbar } from '../components/Navbar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getApiErrorMessage } from '../utils/apiError.js'
import { computeTdee } from '../utils/tdee.js'

const LAST_CUISINE_KEY = 'smartcalorie_last_cuisine'

function todayLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameLocalCalendarDay(isoDateTime, refDate = new Date()) {
  if (isoDateTime == null) return false
  const d = new Date(isoDateTime)
  if (Number.isNaN(d.getTime())) return false
  return (
    d.getFullYear() === refDate.getFullYear() &&
    d.getMonth() === refDate.getMonth() &&
    d.getDate() === refDate.getDate()
  )
}

function planDateKey(planDate) {
  if (planDate == null) return ''
  const s = String(planDate)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function formatDate(value) {
  if (value == null) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(value) {
  if (value == null) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function readLastCuisine() {
  try {
    const v = localStorage.getItem(LAST_CUISINE_KEY)
    return v && v.trim() ? v.trim() : null
  } catch {
    return null
  }
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastCuisine, setLastCuisine] = useState(() => readLastCuisine())
  const [featuredMeal, setFeaturedMeal] = useState(null)

  useEffect(() => {
    let cancelled = false
    setError('')
    setLoading(true)
    setFeaturedMeal(null)

    Promise.all([api.get('/users/me'), api.get('/predict/history'), api.get('/recommend/history')])
      .then(async ([uRes, wRes, pRes]) => {
        if (cancelled) return
        updateUser(uRes.data)
        const wList = wRes.data?.workouts ?? []
        const pList = pRes.data?.plans ?? []
        setWorkouts(wList)
        setPlans(pList)
        setLastCuisine(readLastCuisine())

        const today = todayLocalISO()
        const todayPlan = pList
          .filter((p) => planDateKey(p.date) === today)
          .sort((a, b) => Number(b.id) - Number(a.id))[0]

        if (todayPlan && !cancelled) {
          try {
            const { data } = await api.get(`/recommend/history/${todayPlan.id}`)
            const meals = data?.meals ?? []
            const first =
              meals.find((m) => String(m.entry_type || '').toUpperCase() === 'MEAL') ?? meals[0]
            if (first && !cancelled) {
              setFeaturedMeal({
                name: first.name,
                targetCalories: first.target_calories,
                planId: todayPlan.id,
              })
            }
          } catch {
            if (!cancelled) setFeaturedMeal(null)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [updateUser])

  const tdee = useMemo(() => computeTdee(user), [user])
  const burnToday = useMemo(() => {
    const todayList = workouts.filter((w) => isSameLocalCalendarDay(w.created_at))
    if (!todayList.length) return null
    const latest = [...todayList].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    return latest != null ? Number(latest.total_calories) : null
  }, [workouts])

  const totalTarget =
    tdee != null ? Math.round((tdee + (burnToday ?? 0)) * 10) / 10 : null

  const auditWorkouts = useMemo(() => workouts.slice(0, 2), [workouts])
  const auditPlans = useMemo(() => plans.slice(0, 2), [plans])
  const sessionCount = workouts.length

  const metricCardClass =
    'flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100'

  return (
    <div className="min-h-svh bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Command center</h1>
          <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-600">Loading dashboard data…</p>
            <p className="mt-1 text-xs text-slate-500">Profile, workouts, and meal plans</p>
          </div>
        ) : (
          <>
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" aria-hidden />
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-600">
                  Daily Energy Hub
                </h2>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5">
                <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-8 sm:divide-x sm:divide-y-0">
                  <div className="bg-slate-900 px-5 py-6 text-white sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">TDEE</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums sm:text-4xl">
                      {tdee != null ? (
                        <>
                          {tdee.toLocaleString()}
                          <span className="ml-1 text-lg font-semibold text-slate-400">kcal</span>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-slate-400">Add profile data</span>
                      )}
                    </p>
                    <p className="mt-2 text-xs leading-snug text-slate-400">Baseline daily expenditure</p>
                  </div>

                  <div className="flex items-center justify-center bg-slate-100 px-2 py-3 sm:col-span-1 sm:py-0">
                    <span className="text-2xl font-black text-slate-500" aria-hidden>
                      +
                    </span>
                  </div>

                  <div className="bg-emerald-700 px-5 py-6 text-white sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
                      Workout burn
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-emerald-200/90">
                      Latest ML prediction (today)
                    </p>
                    {burnToday != null ? (
                      <p className="mt-2 text-3xl font-bold tabular-nums sm:text-4xl">
                        {burnToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="ml-1 text-lg font-semibold text-emerald-200">kcal</span>
                      </p>
                    ) : (
                      <p className="mt-3 text-sm font-medium leading-relaxed text-emerald-100">
                        Log a workout to activate your AI nutrition plan.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-center bg-slate-100 px-2 py-3 sm:col-span-1 sm:py-0">
                    <span className="text-2xl font-black text-slate-500" aria-hidden>
                      =
                    </span>
                  </div>

                  <div className="border-t border-slate-200 bg-white px-5 py-6 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)] sm:col-span-2 sm:border-t-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Total target
                    </p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl">
                      {totalTarget != null ? (
                        <>
                          {totalTarget.toLocaleString()}
                          <span className="ml-1 text-lg font-semibold text-slate-500">kcal</span>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-slate-500">—</span>
                      )}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">TDEE plus today&apos;s session burn</p>
                  </div>
                </div>

                {tdee != null && burnToday != null && totalTarget != null && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-slate-800 transition-all"
                        style={{ width: `${Math.min(100, (tdee / totalTarget) * 100)}%` }}
                        title="TDEE"
                      />
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.min(100, (burnToday / totalTarget) * 100)}%`,
                        }}
                        title="Burn"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
              <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-xl ring-1 ring-slate-900/10 lg:col-span-7 lg:p-10">
                <div className="relative z-10 max-w-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                    ML prediction
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Log your next session
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    Capture heart rate and exercises to estimate calories burned. That drives your AI meal plan
                    targets for the day.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/workout/new')}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-400 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    Start session / Log workout
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl"
                  aria-hidden
                />
              </article>

              <article className="flex flex-col rounded-2xl border-2 border-emerald-200/80 bg-white p-6 shadow-lg ring-1 ring-emerald-900/5 lg:col-span-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    Featured recommendation
                  </h2>
                </div>
                {featuredMeal ? (
                  <div className="mt-4 flex flex-1 flex-col">
                    <p className="text-xs font-semibold text-slate-500">Next meal · Today&apos;s plan</p>
                    <p className="mt-2 text-lg font-bold leading-snug text-slate-900">{featuredMeal.name}</p>
                    <p className="mt-3 text-sm text-slate-600">
                      Target{' '}
                      <span className="font-bold tabular-nums text-slate-900">
                        {Number(featuredMeal.targetCalories).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{' '}
                        kcal
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/history', { state: { tab: 'meal-plans', openPlanId: featuredMeal.planId } })
                      }
                      className="mt-auto pt-6 text-left text-sm font-bold text-emerald-700 underline-offset-2 hover:text-emerald-800 hover:underline"
                    >
                      View full plan
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-1 flex-col justify-center py-4">
                    <p className="text-sm leading-relaxed text-slate-600">
                      No AI meal plan saved for today yet. Complete a workout and generate a plan to see your
                      first slot here.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/workout/new')}
                      className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Go to workout flow
                    </button>
                  </div>
                )}
              </article>
            </section>

            {/* Compact metrics */}
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={metricCardClass}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Zap className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total sessions</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{sessionCount}</p>
                </div>
              </div>
              <div className={metricCardClass}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                  <Utensils className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Nutrition profile
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-slate-900">
                    {lastCuisine ?? 'Ready to generate'}
                  </p>
                  <p className="text-xs text-slate-500">Last cuisine when you generated a plan</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Audit trail</h3>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Open full history
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Workouts</p>
                  <ul className="mt-2 space-y-1.5">
                    {auditWorkouts.length === 0 ? (
                      <li className="text-xs text-slate-500">None</li>
                    ) : (
                      auditWorkouts.map((w) => (
                        <li key={w.id}>
                          <button
                            type="button"
                            onClick={() => navigate('/history', { state: { tab: 'workouts' } })}
                            className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition hover:border-slate-200 hover:bg-white"
                          >
                            <span className="tabular-nums text-slate-600">{formatDateTime(w.created_at)}</span>
                            <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                              {Number(w.total_calories).toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                              kcal
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Meal plans</p>
                  <ul className="mt-2 space-y-1.5">
                    {auditPlans.length === 0 ? (
                      <li className="text-xs text-slate-500">None</li>
                    ) : (
                      auditPlans.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() =>
                              navigate('/history', { state: { tab: 'meal-plans', openPlanId: p.id } })
                            }
                            className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition hover:border-slate-200 hover:bg-white"
                          >
                            <span className="tabular-nums text-slate-600">{formatDate(p.date)}</span>
                            <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                              {Number(p.total_target_calories).toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}{' '}
                              kcal
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
