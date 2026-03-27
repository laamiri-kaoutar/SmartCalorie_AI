import { ChefHat } from 'lucide-react'

function slotEntryType(slotName) {
  const n = (slotName || '').toLowerCase()
  return n.startsWith('snack') ? 'SNACK' : 'MEAL'
}

function ingredientLabel(ing) {
  return ing.simplified_name || String(ing.name || '').split(',')[0].trim()
}

export function MealPlanDisplay({ plan }) {
  if (!plan?.slots?.length) {
    return (
      <p className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
        No meal slots in this plan.
      </p>
    )
  }

  return (
    <div className="space-y-10">
      {/* Hero summary */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Daily blueprint
            </p>
            <p className="mt-1 text-xs text-slate-400">Total energy for today</p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-slate-900 sm:text-4xl">
              {Number(plan.total_target_calories).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
              <span className="ml-2 text-lg font-semibold text-slate-500 sm:text-xl">kcal</span>
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            Scientifically calculated
          </span>
        </div>
      </section>

      {/* Cards */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {plan.slots.map((slot, i) => {
          const entryType = slotEntryType(slot.slot_name)
          const isSnack = entryType === 'SNACK'

          return (
            <article
              key={`${slot.slot_name}-${i}`}
              className={`group flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-200/40 transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-200/50 ${
                isSnack ? 'border-t-[3px] border-t-sky-500' : 'border-t-[3px] border-t-emerald-500'
              }`}
            >
              <header className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold leading-snug tracking-tight text-slate-800 sm:text-[1.05rem]">
                    {slot.meal?.meal_name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                      isSnack
                        ? 'bg-sky-50 text-sky-800 ring-sky-200/80'
                        : 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
                    }`}
                  >
                    {entryType}
                  </span>
                </div>
                <p className="mt-2.5 text-xs font-medium text-slate-500">{slot.slot_name}</p>
                <p className="mt-3 text-xs text-slate-500">
                  Target{' '}
                  <span className="text-sm font-semibold tabular-nums text-slate-800">
                    {Number(slot.target_calories).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{' '}
                    kcal
                  </span>
                </p>
              </header>

              <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Ingredients
                </h4>
                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/30">
                  {(slot.meal?.ingredients || []).map((ing, j) => (
                    <div
                      key={`${ing.name}-${j}`}
                      className={`flex items-baseline justify-between gap-4 px-4 py-3.5 text-sm ${
                        j % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <span className="font-medium leading-snug text-slate-800">{ingredientLabel(ing)}</span>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-emerald-800">
                        {Number(ing.grams).toLocaleString(undefined, { maximumFractionDigits: 1 })} g
                      </span>
                    </div>
                  ))}
                </div>

                {slot.meal?.preparation_steps?.length > 0 && (
                  <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <ChefHat className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.75} aria-hidden />
                      Preparation
                    </h4>
                    <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600 marker:font-semibold marker:text-emerald-600">
                      {slot.meal.preparation_steps.map((step, k) => (
                        <li key={k} className="pl-1">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
