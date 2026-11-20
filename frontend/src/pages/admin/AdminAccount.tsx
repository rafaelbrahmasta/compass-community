import { useState } from 'react'
import toast from 'react-hot-toast'
import { changePassword } from '../../services/endpoints'
import { useAuth } from '../../context/AuthContext'

export default function AdminAccount() {
  const { admin } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok.')
      return
    }

    setSubmitting(true)
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success('Password admin berhasil diubah!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Gagal mengubah password. Pastikan password lama benar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
          Akun & Keamanan Admin
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Kelola kredensial dan kata sandi akun Super Administrator COMPASS.
        </p>
      </div>

      {/* Info Card */}
      <div className="card-dark p-6 rounded-xl border-white/10 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gold/20 border border-gold flex items-center justify-center font-heading font-black text-gold text-2xl">
          {admin?.name?.charAt(0).toUpperCase() || 'A'}
        </div>
        <div>
          <div className="text-white font-bold text-base">{admin?.name || 'Super Admin'}</div>
          <div className="text-white/50 text-xs font-mono">{admin?.email || 'admin@compass.id'}</div>
          <span className="inline-block px-2 py-0.5 bg-primary text-gold text-[10px] font-bold rounded mt-1.5 uppercase tracking-wider">
            Super Administrator
          </span>
        </div>
      </div>

      {/* Change Password Form */}
      <form onSubmit={handleSubmit} className="card-dark p-6 sm:p-8 rounded-xl border-gold/30 space-y-4">
        <h2 className="font-heading font-bold text-lg text-gold uppercase mb-2">
          Ubah Kata Sandi
        </h2>

        <div>
          <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
            Password Saat Ini
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
            Password Baru (Minimal 8 Karakter)
          </label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
            Konfirmasi Password Baru
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-gold py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : 'Ubah Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
