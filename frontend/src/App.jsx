import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium font-mono text-slate-300">Loading ProMatrix...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route: If already signed in, redirect to /dashboard */}
        <Route
          path="/auth"
          element={session ? <Navigate to="/dashboard" replace /> : <Auth />}
        />

        {/* Dashboard Route: If NOT signed in, redirect to /auth */}
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/auth" replace />}
        />

        {/* Root Route: Redirect based on authentication status */}
        <Route
          path="/"
          element={
            session ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />
          }
        />

        {/* Catch-all unknown paths */}
        <Route
          path="*"
          element={
            session ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
