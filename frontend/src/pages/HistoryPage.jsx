import { useCallback, useEffect, useRef, useState } from 'react'
import { Flame, Utensils } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { MealPlanDisplay } from '../components/MealPlanDisplay.jsx'
import { Navbar } from '../components/Navbar.jsx'
import { getApiErrorMessage } from '../utils/apiError.js'

/** Map API PlanDetails to the shape expected by MealPlanDisplay */
function planDetailsToDisplayPlan(details) {
  let snackNum = 0
  const slots = (details.meals || []).map((m) => {
    const isSnack = String(m.entry_type || '').toUpperCase() === 'SNACK'
    if (isSnack) snackNum += 1
    return {
      slot_name: isSnack ? `Snack ${snackNum}` : m.name || 'Meal',
      target_calories: m.target_calories,
      meal: {
        meal_name: m.name,
        ingredients: (m.ingredients || []).map((ing) => ({
          name: ing.ingredient_name,
          grams: ing.grams,
          simplified_name: String(ing.ingredient_name || '').split(',')[0].trim(),
        })),
        preparation_steps: m.preparation_steps || [],
      },
    }
  })
  return {
    total_target_calories: details.plan.total_target_calories,
    slots,
  }
}

function formatDate(value) {
  if (value == null) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(value) {
  if (value == null) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navAppliedKeyRef = useRef(null)

  const [tab, setTab] = useState('workouts')

  const [workouts, setWorkouts] = useState([])
  const [plans, setPlans] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [detailPlan, setDetailPlan] = useState(null)
  const [detailMeta, setDetailMeta] = useState(null)
  const [detailLoadingId, setDetailLoadingId] = useState(null)
  const [detailError, setDetailError] = useState('')

  const loadLists = useCallback(async () => {
    setListError('')
    setListLoading(true)
    try {
      const [wRes, pRes] = await Promise.all([
        api.get('/predict/history'),
        api.get('/recommend/history'),
      ])
      setWorkouts(wRes.data?.workouts ?? [])
      setPlans(pRes.data?.plans ?? [])
    } catch (err) {
      setListError(getApiErrorMessage(err))
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLists()
  }, [loadLists])

  const handleViewPlan = useCallback(async (planId) => {
    setDetailError('')
    setDetailLoadingId(planId)
    try {
      const { data } = await api.get(`/recommend/history/${planId}`)
      setDetailMeta({ id: data.plan.id, date: data.plan.date })
      setDetailPlan(planDetailsToDisplayPlan(data))
    } catch (err) {
      setDetailPlan(null)
      setDetailMeta(null)
      setDetailError(getApiErrorMessage(err))
    } finally {
      setDetailLoadingId(null)
    }
  }, [])

  useEffect(() => {
    if (listLoading) return
    const s = location.state
    if (!s || (!s.tab && s.openPlanId == null)) return
    const key = `${location.key}-${s.tab ?? ''}-${s.openPlanId ?? ''}`
    if (navAppliedKeyRef.current === key) return
    navAppliedKeyRef.current = key
    if (s.tab === 'workouts' || s.tab === 'meal-plans') setTab(s.tab)
    if (s.openPlanId != null) {
      setTab('meal-plans')
      void handleViewPlan(s.openPlanId)
    }
    navigate('.', { replace: true, state: {} })
  }, [listLoading, location.state, location.key, handleViewPlan, navigate])

  function closeDetail() {
    setDetailPlan(null)
    setDetailMeta(null)
    setDetailError('')
  }

  function switchTab(next) {
    if (next !== 'meal-plans') closeDetail()
    setTab(next)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl p-8">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">History &amp; Progress</h1>
          <p className="mt-1 text-sm text-slate-600">Past workouts and saved meal plans.</p>
        </header>

        {listError && (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {listError}
          </div>
        )}

        <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => switchTab('workouts')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === 'workouts'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Workouts
          </button>
          <button
            type="button"
            onClick={() => switchTab('meal-plans')}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === 'meal-plans'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Meal plans
          </button>
        </div>

        {listLoading ? (
          <p className="text-sm text-slate-500">Loading history…</p>
        ) : (
          <>
            {tab === 'workouts' && (
              <section className="space-y-3">
                {workouts.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                    No workout sessions yet.
                  </p>
                ) : (
                  workouts.map((w) => {
                    const exercises = (w.exercises || []).map((e) => e.exercise_type).join(', ')
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => navigate('/history', { state: { tab: 'workouts' } })}
                        className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-700">
                              <Flame className="h-4 w-4" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-500">{formatDateTime(w.created_at)}</p>
                              <p className="mt-1 truncate text-sm text-slate-700">{exercises || '—'}</p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tabular-nums text-emerald-700">
                            {Number(w.total_calories).toLocaleString(undefined, { maximumFractionDigits: 1 })} kcal
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </section>
            )}

            {tab === 'meal-plans' && (
              <section className="space-y-6">
                <div className="space-y-3">
                  {plans.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                      No saved meal plans yet.
                    </p>
                  ) : (
                    plans.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-700">
                              <Utensils className="h-4 w-4" aria-hidden />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500">{formatDate(p.date)}</p>
                              <p className="mt-1 text-sm font-medium text-slate-700">Saved nutrition plan</p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tabular-nums text-emerald-700">
                            {Number(p.total_target_calories).toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                            kcal
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleViewPlan(p.id)}
                          disabled={detailLoadingId === p.id}
                          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {detailLoadingId === p.id ? 'Loading…' : 'View full plan'}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {detailError && (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {detailError}
                  </div>
                )}

                {detailPlan && detailMeta && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved plan</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {formatDate(detailMeta.date)} · Plan #{detailMeta.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeDetail}
                        className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                      >
                        Close
                      </button>
                    </div>
                    <MealPlanDisplay plan={detailPlan} />
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
