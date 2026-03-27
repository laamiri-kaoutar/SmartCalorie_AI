import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AdminGuard } from './components/AdminGuard.jsx'
import { AdminLayout } from './components/admin/AdminLayout.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { LandingPage } from './pages/Landing.jsx'
import { Login } from './pages/Login.jsx'
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx'
import { AdminIngredients } from './pages/admin/AdminIngredients.jsx'
import { AdminUsers } from './pages/admin/AdminUsers.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { MealPlanPage } from './pages/recommend/MealPlanPage.jsx'
import { PlanConfigPage } from './pages/recommend/PlanConfigPage.jsx'
import { Signup } from './pages/Signup.jsx'
import { WorkoutFormPage } from './pages/workout/WorkoutFormPage.jsx'
import { WorkoutSummaryPage } from './pages/workout/WorkoutSummaryPage.jsx'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              border: '1px solid #e2e8f0',
              color: '#0f172a',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout/new"
            element={
              <ProtectedRoute>
                <WorkoutFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout/summary"
            element={
              <ProtectedRoute>
                <WorkoutSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommend/config"
            element={
              <ProtectedRoute>
                <PlanConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommend/plan"
            element={
              <ProtectedRoute>
                <MealPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminGuard>
                  <AdminLayout />
                </AdminGuard>
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="ingredients" element={<AdminIngredients />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
