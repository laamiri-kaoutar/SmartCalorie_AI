import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '../api/client.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  const fetchProfile = useCallback(async () => {
    const { data } = await api.get('/users/me')
    setUser(data)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const stored = localStorage.getItem('token')
      if (!stored) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const decoded = jwtDecode(stored)
        if (decoded.exp != null && decoded.exp * 1000 < Date.now()) {
          clearSession()
          if (!cancelled) setLoading(false)
          return
        }
      } catch {
        clearSession()
        if (!cancelled) setLoading(false)
        return
      }

      if (!cancelled) setToken(stored)

      try {
        const { data } = await api.get('/users/me')
        if (!cancelled) setUser(data)
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const login = useCallback(
    async ({ email, password }) => {
      const { data } = await api.post('/auth/login', { email, password })
      const accessToken = data.access_token
      localStorage.setItem('token', accessToken)
      setToken(accessToken)
      const me = await api.get('/users/me')
      setUser(me.data)
      return me.data
    },
    []
  )

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser)
  }, [])

  const signup = useCallback(async (payload) => {
    const { data } = await api.post('/auth/signup', payload)
    return data
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      signup,
      fetchProfile,
      updateUser,
    }),
    [user, token, loading, login, logout, signup, fetchProfile, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
