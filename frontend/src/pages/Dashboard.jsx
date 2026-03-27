import { useEffect, useMemo, useState } from 'react'
import { Activity, ChevronRight, Loader2 } from 'lucide-react'
import api from '../api/client.js'
import { MealPlanDisplay } from '../components/MealPlanDisplay.jsx'
import { Navbar } from '../components/Navbar.jsx'
import { WorkoutForm } from '../components/WorkoutForm.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getApiErrorMessage } from '../utils/apiError.js'
import { computeTdee } from '../utils/tdee.js'

function parseCommaSeparatedList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const CUISINE_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'Mediterranean', label: 'Mediterranean' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Asian', label: 'Asian' },
  { value: 'Mexican', label: 'Mexican' },
  { value: 'Indian', label: 'Indian' },
  { value: 'French', label: 'French' },
  { value: 'Middle Eastern', label: 'Middle Eastern' },
  { value: 'American', label: 'American' },
]

export function Dashboard() {
  const { user, fetchProfile } = useAuth()
  const [profileError, setProfileError] = useState('')
  const [workoutStep, setWorkoutStep] = useState('idle')
  const [prediction, setPrediction] = useState(null)
  const [mealPlan, setMealPlan] = useState(null)
  const [mealsPerDay, setMealsPerDay] = useState(3)
  const [snacksPerDay, setSnacksPerDay] = useState(1)
  const [cuisine, setCuisine] = useState('')
  const [vegan, setVegan] = useState(false)
  const [vegetarian, setVegetarian] = useState(false)
  const [allergiesText, setAllergiesText] = useState('')
  const [dislikedText, setDislikedText] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')

  useEffect(() => {
    let cancelled = false
    setProfileError('')
    fetchProfile()
      .catch((err) => {
        if (!cancelled) setProfileError(getApiErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [fetchProfile])

  const tdee = useMemo(() => computeTdee(user), [user])

  function handlePredictionSuccess(data) {
    setPrediction(data)
    setMealPlan(null)
    setPlanError('')
    setWorkoutStep('result')
  }

  function resetFlow() {
    setWorkoutStep('idle')
    setPrediction(null)
    setMealPlan(null)
    setPlanError('')
    setVegan(false)
    setVegetarian(false)
    setAllergiesText('')
    setDislikedText('')
  }

  async function handleGeneratePlan() {
    setPlanError('')
    if (mealsPerDay <= 0 && snacksPerDay <= 0) {
      setPlanError('Add at least one meal or snack per day.')
      return
    }
    if (!prediction?.total_calories) {
      setPlanError('Log a workout first so we can align your plan with your activity.')
      return
    }

    setPlanLoading(true)
    try {
      const allergies = parseCommaSeparatedList(allergiesText)
      const dislikedIngredients = parseCommaSeparatedList(dislikedText)
      const payload = {
        meals_per_day: Number(mealsPerDay),
        snacks_per_day: Number(snacksPerDay),
        preferences: {
          vegan: Boolean(vegan),
          vegetarian: Boolean(vegetarian),
          cuisine: cuisine.trim() ? cuisine.trim() : null,
          allergies,
          disliked_ingredients: dislikedIngredients,
        },
        predicted_burn: Number(prediction.total_calories),
      }
      const { data } = await api.post('/recommend/generate-plan', payload)
      setMealPlan(data)
      setWorkoutStep('mealplan')
    } catch (err) {
      setPlanError(getApiErrorMessage(err))
    } finally {
      setPlanLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-50">
      {planLoading && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-2xl">
            <Loader2
              className="mx-auto h-12 w-12 animate-spin text-primary-500"
              aria-hidden
            />
            <p className="mt-6 text-base font-semibold leading-snug text-slate-900">
              We&apos;re preparing your personalized nutrition plan… this may take a minute.
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Please keep this tab open until your meals are ready.
            </p>
          </div>
        </div>
      )}

      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
        </header>

        {profileError && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {profileError}
          </div>
        )}

        <section className="mb-10">
          <div className="overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white shadow-md">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary-500 p-3 text-white shadow-sm">
                  <Activity className="h-8 w-8" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium tracking-wide text-slate-600">
                    Estimated daily calories
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl">
                    {tdee != null ? (
                      <>
                        {tdee.toLocaleString()}
                        <span className="ml-2 text-lg font-semibold text-slate-500">kcal / day</span>
                      </>
                    ) : (
                      <span className="text-lg font-medium text-slate-600">
                        Add age, gender, height, and weight in your profile to see your estimate.
                      </span>
                    )}
                  </p>
                  <p className="mt-2 max-w-xl text-xs text-slate-500">
                    Based on your profile. Workouts you log adjust how we plan your day.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {workoutStep === 'idle' && (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Log your activity</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Record what you did, see calories burned, then get meal ideas that fit your day.
            </p>
            <button
              type="button"
              onClick={() => setWorkoutStep('logging')}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600"
            >
              Log workout
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </section>
        )}

        {workoutStep === 'logging' && (
          <WorkoutForm
            onSuccess={handlePredictionSuccess}
            onCancel={() => setWorkoutStep('idle')}
          />
        )}

        {workoutStep === 'result' && prediction && (
          <section className="space-y-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-slate-900">Your session</h2>
              <p className="mt-4 text-4xl font-bold tabular-nums text-primary-600">
                {Number(prediction.total_calories).toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
                <span className="ml-2 text-lg font-semibold text-slate-500">kcal burned</span>
              </p>
              <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
                {(prediction.breakdown || []).map((row, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span className="font-medium text-slate-800">{row.exercise_type}</span>
                    <span className="text-slate-600">
                      {row.duration_minutes} min · {row.intensity_level}
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

            <div className="rounded-xl border border-slate-200/90 bg-white p-8 shadow-lg ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 pb-6">
                <p className="text-xs font-medium tracking-wide text-slate-400">
                  Continue
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Personalize Your Daily Nutrition
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                  We&apos;ve calculated your daily needs based on your profile and recent activity. This session
                  adds about{' '}
                  <span className="font-semibold tabular-nums text-slate-800">
                    {Number(prediction.total_calories).toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                    kcal
                  </span>{' '}
                  from your workout activity. Tell us how you like to eat, and we&apos;ll shape your plan.
                </p>
              </div>

              {planError && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {planError}
                </div>
              )}

              <div className="mt-8 space-y-10">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Daily structure</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    How many main meals and snacks should each day include?
                  </p>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="meals-count"
                        className="block text-sm font-medium text-slate-800"
                      >
                        Meals per day
                      </label>
                      <p className="mt-0.5 text-xs text-slate-500">Breakfast, lunch, dinner, etc.</p>
                      <input
                        id="meals-count"
                        type="number"
                        min={0}
                        max={10}
                        value={mealsPerDay}
                        onChange={(e) => setMealsPerDay(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-500/15"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="snacks-count"
                        className="block text-sm font-medium text-slate-800"
                      >
                        Snacks per day
                      </label>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Snacks are planned as smaller portions within your day.
                      </p>
                      <input
                        id="snacks-count"
                        type="number"
                        min={0}
                        max={10}
                        value={snacksPerDay}
                        onChange={(e) => setSnacksPerDay(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-500/15"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Dietary preferences</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    We&apos;ll respect these when choosing foods for you.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-6 rounded-xl border border-slate-100 bg-slate-50/60 p-5">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={vegan}
                        onChange={(e) => setVegan(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-slate-800">Vegan</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={vegetarian}
                        onChange={(e) => setVegetarian(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-slate-800">Vegetarian</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Cuisine</h3>
                  <p className="mt-1 text-xs text-slate-500">Optional — choose a style you enjoy.</p>
                  <select
                    id="cuisine"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="mt-3 w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/15"
                  >
                    {CUISINE_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Constraints</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Separate multiple items with commas (e.g. peanuts, shellfish, dairy).
                  </p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="allergies" className="block text-sm font-medium text-slate-800">
                        Allergies
                      </label>
                      <input
                        id="allergies"
                        type="text"
                        value={allergiesText}
                        onChange={(e) => setAllergiesText(e.target.value)}
                        placeholder="e.g. peanuts, soy"
                        autoComplete="off"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                      />
                    </div>
                    <div>
                      <label htmlFor="disliked" className="block text-sm font-medium text-slate-800">
                        Disliked ingredients
                      </label>
                      <input
                        id="disliked"
                        type="text"
                        value={dislikedText}
                        onChange={(e) => setDislikedText(e.target.value)}
                        placeholder="e.g. cilantro, olives"
                        autoComplete="off"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 border-t border-slate-100 pt-8">
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={planLoading}
                  className="rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md transition duration-200 ease-out hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  Generate personalized meal plan
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFlow}
              className="text-sm font-normal text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline"
            >
              Start over
            </button>
          </section>
        )}

        {workoutStep === 'mealplan' && mealPlan && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900">Your plan</h2>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-normal text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              >
                Log another workout
              </button>
            </div>
            <MealPlanDisplay plan={mealPlan} />
          </section>
        )}
      </main>
    </div>
  )
}
