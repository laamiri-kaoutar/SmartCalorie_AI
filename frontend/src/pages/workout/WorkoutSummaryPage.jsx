import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Navbar } from '../../components/Navbar.jsx'

export function WorkoutSummaryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prediction = location.state?.prediction || null

  const totalCalories = useMemo(() => {
    if (!prediction?.total_calories) return null
    return Number(prediction.total_calories)
  }, [prediction])

  if (!prediction) {
    return (
      <div className="min-h-svh bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-lg font-semibold text-amber-900">No workout data found</h1>
            <p className="mt-2 text-sm text-amber-800">
              Please log your workout first before viewing this page.
            </p>
            <button
              type="button"
              onClick={() => navigate('/workout/new')}
              className="mt-4 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
            >
              Go to workout form
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Workout summary</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review your session and continue to personalize your nutrition.
          </p>
        </header>

        <section className="space-y-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900">Your session</h2>
            <p className="mt-4 text-4xl font-bold tabular-nums text-primary-600">
              {totalCalories?.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              <span className="ml-2 text-lg font-semibold text-slate-500">kcal burned</span>
            </p>
            <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
              {(prediction.breakdown || []).map((row, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium text-slate-800">{row.exercise_type}</span>
                  <span className="text-slate-600">
                    {row.duration_minutes} min - {row.intensity_level}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {Number(row.estimated_calories).toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    })}{' '}
                    kcal
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/recommend/config', { state: { prediction } })}
              className="rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md transition duration-200 ease-out hover:bg-emerald-700"
            >
              Continue to nutrition settings
            </button>
            <button
              type="button"
              onClick={() => navigate('/workout/new')}
              className="text-sm font-normal text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline"
            >
              Start over
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
