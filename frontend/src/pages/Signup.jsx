import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getApiErrorMessage } from '../utils/apiError.js'

const initialForm = {
  full_name: '',
  email: '',
  password: '',
  age: '',
  gender: '',
  height: '',
  weight: '',
}

export function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    if (!form.full_name.trim() || form.full_name.trim().length < 3) {
      return 'Full name must be at least 3 characters.'
    }
    if (!form.email.trim()) return 'Email is required.'
    if (!form.password || form.password.length < 8) {
      return 'Password must be at least 8 characters.'
    }
    const ageNum = Number(form.age)
    if (!form.age || Number.isNaN(ageNum) || ageNum <= 18) {
      return 'Age must be greater than 18.'
    }
    if (form.gender !== 'M' && form.gender !== 'F') {
      return 'Please select a gender.'
    }
    const h = Number(form.height)
    if (!form.height || Number.isNaN(h) || h <= 0) {
      return 'Height must be a positive number (cm).'
    }
    const w = Number(form.weight)
    if (!form.weight || Number.isNaN(w) || w <= 0) {
      return 'Weight must be a positive number (kg).'
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const msg = validate()
    if (msg) {
      setError(msg)
      return
    }
    setSubmitting(true)
    try {
      await signup({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        age: Number(form.age),
        gender: form.gender,
        height: Number(form.height),
        weight: Number(form.weight),
      })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh bg-gradient-to-b from-primary-50/80 to-slate-50">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-10 sm:py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
          <h1 className="text-center text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            We use your profile for accurate calorie estimates (Mifflin–St Jeor &amp; ML).
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                id="signup-name"
                name="full_name"
                type="text"
                autoComplete="name"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="signup-age" className="block text-sm font-medium text-slate-700">
                Age
              </label>
              <input
                id="signup-age"
                name="age"
                type="number"
                min={18}
                step={1}
                inputMode="numeric"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
              <p className="mt-1 text-xs text-slate-500">Minimum 19 years old (must be over 18).</p>
            </div>
            <div>
              <label htmlFor="signup-gender" className="block text-sm font-medium text-slate-700">
                Gender
              </label>
              <select
                id="signup-gender"
                name="gender"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Select…</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div>
              <label htmlFor="signup-height" className="block text-sm font-medium text-slate-700">
                Height (cm)
              </label>
              <input
                id="signup-height"
                name="height"
                type="number"
                min={1}
                step={0.1}
                inputMode="decimal"
                value={form.height}
                onChange={(e) => update('height', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label htmlFor="signup-weight" className="block text-sm font-medium text-slate-700">
                Weight (kg)
              </label>
              <input
                id="signup-weight"
                name="weight"
                type="number"
                min={1}
                step={0.1}
                inputMode="decimal"
                value={form.weight}
                onChange={(e) => update('weight', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-lg bg-primary-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
