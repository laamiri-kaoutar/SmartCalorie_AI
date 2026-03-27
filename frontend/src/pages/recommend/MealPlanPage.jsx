import { useLocation, useNavigate } from 'react-router-dom'
import { MealPlanDisplay } from '../../components/MealPlanDisplay.jsx'
import { Navbar } from '../../components/Navbar.jsx'

export function MealPlanPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const mealPlan = location.state?.mealPlan || null
  const prediction = location.state?.prediction || null

  if (!mealPlan) {
    return (
      <div className="min-h-svh bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-lg font-semibold text-amber-900">No meal plan found</h1>
            <p className="mt-2 text-sm text-amber-800">
              Please complete your nutrition settings before opening this page.
            </p>
            <button
              type="button"
              onClick={() => navigate('/recommend/config', { state: { prediction } })}
              className="mt-4 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
            >
              Go to plan settings
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-b from-slate-100/80 via-slate-50 to-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
        <section className="space-y-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-100 backdrop-blur-sm sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Your plan
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Daily nutrition
                </h1>
                <p className="mt-1.5 max-w-md text-sm text-slate-500">
                  Balanced slots aligned with your activity and preferences.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/workout/new')}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition duration-200 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/25"
              >
                Log another workout
              </button>
            </div>
          </div>
          <MealPlanDisplay plan={mealPlan} />
        </section>
      </main>
    </div>
  )
}
