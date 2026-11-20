import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Admin } from '../types'
import { getAdminProfile } from '../services/endpoints'

interface AuthContextType {
  admin: Admin | null
  token: string | null
  isLoading: boolean
  login: (token: string, admin: Admin) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('compass_token')
    const storedAdmin = localStorage.getItem('compass_admin')

    if (storedToken && storedAdmin) {
      setTimeout(() => {
        setToken(storedToken)
        try {
          setAdmin(JSON.parse(storedAdmin))
        } catch {
          localStorage.removeItem('compass_admin')
        }
      }, 0)
      // Verify token still valid
      getAdminProfile()
        .then(res => setAdmin(res.data.data))
        .catch(() => {
          localStorage.removeItem('compass_token')
          localStorage.removeItem('compass_admin')
          setToken(null)
          setAdmin(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setTimeout(() => setIsLoading(false), 0)
    }
  }, [])

  const login = (newToken: string, newAdmin: Admin) => {
    localStorage.setItem('compass_token', newToken)
    localStorage.setItem('compass_admin', JSON.stringify(newAdmin))
    setToken(newToken)
    setAdmin(newAdmin)
  }

  const logout = () => {
    localStorage.removeItem('compass_token')
    localStorage.removeItem('compass_admin')
    setToken(null)
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{
      admin,
      token,
      isLoading,
      login,
      logout,
      isAuthenticated: !!token && !!admin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return ctx
}
