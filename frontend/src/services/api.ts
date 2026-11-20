import axios from 'axios'

const api = axios.create({
  baseURL: ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:8080/api/v1',
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
