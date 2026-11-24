import axios from 'axios'

export const getBaseApiUrl = (): string => {
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string)?.trim()
  if (!envUrl) return '/api/v1'
  const clean = envUrl.replace(/\/+$/, '')
  return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`
}

export const getAssetUrl = (path?: string | null): string => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string)?.trim() || ''
  const origin = envUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return origin ? `${origin}${cleanPath}` : cleanPath
}

const api = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT token for admin routes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('compass_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 (logout admin)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAdminRoute = window.location.pathname.startsWith('/admin')
      if (isAdminRoute && window.location.pathname !== '/admin/login') {
        localStorage.removeItem('compass_token')
        localStorage.removeItem('compass_admin')
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
