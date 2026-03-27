import { useNavigate } from 'react-router-dom'
import { Navbar } from '../../components/Navbar.jsx'
import { WorkoutForm } from '../../components/WorkoutForm.jsx'

export function WorkoutFormPage() {
  const navigate = useNavigate()

  function handleSuccess(prediction) {
    navigate('/workout/summary', { state: { prediction } })
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Log your activity</h1>
          <p className="mt-1 text-sm text-slate-600">
            Add your session details and we will estimate your calories burned.
          </p>
        </header>

        <WorkoutForm onSuccess={handleSuccess} onCancel={() => navigate('/dashboard')} />
      </main>
    </div>
  )
}
