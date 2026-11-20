import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { adminLogin } from '../../services/endpoints'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await adminLogin(email, password)
      const { token, admin } = res.data.data
      login(token, admin)
      toast.success('Login berhasil!')
      navigate('/admin/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Email atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary border-2 border-gold flex items-center justify-center rounded mx-auto mb-4">
            <span className="font-heading font-bold text-gold text-2xl">C</span>
          </div>
          <h1 className="font-heading font-bold text-2xl text-white uppercase tracking-wide">COMPASS Admin</h1>
          <p className="text-white/50 text-sm mt-1">Masuk ke panel administrasi</p>
        </div>

        <form onSubmit={handleSubmit} className="card-dark p-6 space-y-4 rounded-lg">
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-dark border border-white/20 rounded px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
              placeholder="admin@compass.id"
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-dark border border-white/20 rounded px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
