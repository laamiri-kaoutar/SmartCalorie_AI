import { Link } from 'react-router-dom'
import { Navbar } from '../components/Navbar.jsx'

export function LandingPage() {
  return (
    <div className="min-h-svh bg-gradient-to-b from-primary-50 to-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Track calories with <span className="text-primary-600">clarity</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          SmartCalorie AI combines nutrition science and machine learning to estimate burn and plan meals.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/signup"
            className="rounded-lg bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  )
}
