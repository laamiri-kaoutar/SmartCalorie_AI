import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../api/client.js'
import { EXERCISE_TYPES, INTENSITY_LEVELS } from '../constants/workout.js'
import { getApiErrorMessage } from '../utils/apiError.js'

function emptyRow() {
  return {
    id: crypto.randomUUID(),
    exercise_type: EXERCISE_TYPES[0],
    duration_minutes: '30',
    intensity_level: INTENSITY_LEVELS[1],
  }
}

export function WorkoutForm({ onSuccess, onCancel }) {
  const [avgHeartRate, setAvgHeartRate] = useState('120')
  const [rows, setRows] = useState(() => [emptyRow()])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function addRow() {
    setRows((r) => [...r, emptyRow()])
  }

  function removeRow(id) {
    setRows((r) => (r.length <= 1 ? r : r.filter((row) => row.id !== id)))
  }

  function updateRow(id, field, value) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const hr = Number(avgHeartRate)
    if (!avgHeartRate || Number.isNaN(hr) || hr <= 0) {
      setError('Average heart rate must be a positive number.')
      return
    }

    const exercises = []
    for (const row of rows) {
      const dur = Number(row.duration_minutes)
      if (!row.duration_minutes || Number.isNaN(dur) || dur <= 0) {
        setError('Each exercise needs a duration greater than zero.')
        return
      }
      exercises.push({
        exercise_type: row.exercise_type,
        duration_minutes: dur,
        intensity_level: row.intensity_level,
      })
    }

    setSubmitting(true)
    try {
      const { data } = await api.post('/predict/calories', {
        avg_heart_rate: hr,
        exercises,
      })
      onSuccess(data)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Log workout</h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="mt-6">
        <label htmlFor="avg-hr" className="block text-sm font-medium text-slate-700">
          Average heart rate (bpm)
        </label>
        <input
          id="avg-hr"
          type="number"
          min={1}
          step="any"
          value={avgHeartRate}
          onChange={(e) => setAvgHeartRate(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Exercises</span>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add exercise
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-12 sm:items-end"
            >
              <div className="sm:col-span-4">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Type
                </label>
                <select
                  value={row.exercise_type}
                  onChange={(e) => updateRow(row.id, 'exercise_type', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {EXERCISE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Intensity
                </label>
                <select
                  value={row.intensity_level}
                  onChange={(e) => updateRow(row.id, 'intensity_level', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {INTENSITY_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Duration (min)
                </label>
                <input
                  type="number"
                  min={0.1}
                  step="any"
                  value={row.duration_minutes}
                  onChange={(e) => updateRow(row.id, 'duration_minutes', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div className="flex sm:col-span-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove exercise ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 disabled:opacity-60"
        >
          {submitting ? 'Estimating…' : 'Estimate calories burned'}
        </button>
      </div>
    </form>
  )
}
