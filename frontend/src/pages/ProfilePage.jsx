import { useEffect, useState } from 'react'
import api from '../api/client.js'
import { Navbar } from '../components/Navbar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getApiErrorMessage } from '../utils/apiError.js'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15'

export function ProfilePage() {
  const { updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState(false)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadError('')
    setLoading(true)
    api
      .get('/users/me')
      .then(({ data }) => {
        if (cancelled) return
        setEmail(data.email ?? '')
        setFullName(data.full_name ?? '')
        setAge(data.age != null ? String(data.age) : '')
        setGender(data.gender ?? '')
        setHeight(data.height != null ? String(data.height) : '')
        setWeight(data.weight != null ? String(data.weight) : '')
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getApiErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleUpdate(e) {
    e.preventDefault()
    setSaveError('')
    setSuccess(false)
    setSaving(true)
    try {
      const ageNum = age === '' ? null : parseInt(age, 10)
      const heightNum = height === '' ? null : parseFloat(height)
      const weightNum = weight === '' ? null : parseFloat(weight)
      if (age !== '' && Number.isNaN(ageNum)) {
        setSaveError('Please enter a valid age.')
        setSaving(false)
        return
      }
      if (height !== '' && Number.isNaN(heightNum)) {
        setSaveError('Please enter a valid height.')
        setSaving(false)
        return
      }
      if (weight !== '' && Number.isNaN(weightNum)) {
        setSaveError('Please enter a valid weight.')
        setSaving(false)
        return
      }
      const payload = {
        full_name: fullName.trim() || null,
        age: ageNum,
        gender: gender || null,
        height: heightNum,
        weight: weightNum,
      }
      const { data } = await api.put('/users/me', payload)
      updateUser(data)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setSaveError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const displayInitials = (() => {
    const source = (fullName || email || '').trim()
    if (!source) return 'U'
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  })()

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Profile settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Update your physical attributes for accurate calorie targets.
          </p>
        </header>

        {loadError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {loadError}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          {loading ? (
            <p className="text-sm text-slate-500">Loading profile…</p>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                  {displayInitials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Settings header</p>
                  <p className="text-sm text-slate-500">Your personal profile and body metrics</p>
                </div>
              </div>

              {success && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
                >
                  Profile updated successfully.
                </div>
              )}
              {saveError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {saveError}
                </div>
              )}

              <div>
                <label htmlFor="profile-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-600`}
                />
              </div>

              <div>
                <label htmlFor="profile-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Full name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="profile-age" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Age
                </label>
                <input
                  id="profile-age"
                  type="number"
                  min={19}
                  step={1}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="profile-gender" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gender
                </label>
                <select
                  id="profile-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>

              <div>
                <label htmlFor="profile-height" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Height (cm)
                </label>
                <input
                  id="profile-height"
                  type="number"
                  min={0.1}
                  step="any"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="profile-weight" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Weight (kg)
                </label>
                <input
                  id="profile-weight"
                  type="number"
                  min={0.1}
                  step="any"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
