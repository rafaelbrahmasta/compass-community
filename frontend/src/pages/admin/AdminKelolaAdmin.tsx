import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'
import {
  adminGetAdmins,
  adminCreateAdmin,
  adminUpdateAdmin,
  adminResetAdminPassword,
  adminDeleteAdmin,
} from '../../services/endpoints'
import type { Admin, AdminRole } from '../../types'

export default function AdminKelolaAdmin() {
  const queryClient = useQueryClient()
  const { admin: currentUser } = useAuth()

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin_1' | 'admin_2'>('admin_1')

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<AdminRole>('admin_1')
  const [editIsActive, setEditIsActive] = useState(true)

  // Reset Password Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetTargetAdmin, setResetTargetAdmin] = useState<Admin | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // Query Admins
  const { data, isLoading } = useQuery({
    queryKey: ['admin-admins-list'],
    queryFn: adminGetAdmins,
  })

  const admins = data?.data?.data || []

  // Mutations
  const createMutation = useMutation({
    mutationFn: adminCreateAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admins-list'] })
      toast.success('Admin baru berhasil dibuat!')
      setCreateModalOpen(false)
      setName('')
      setEmail('')
      setPassword('')
      setRole('admin_1')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat akun admin')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminUpdateAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admins-list'] })
      toast.success('Data admin berhasil diperbarui!')
      setEditModalOpen(false)
      setEditingAdmin(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui admin')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, new_password }: { id: string; new_password: string }) =>
      adminResetAdminPassword(id, new_password),
    onSuccess: () => {
      toast.success('Password admin berhasil direset!')
      setResetModalOpen(false)
      setResetTargetAdmin(null)
      setNewPassword('')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mereset password')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admins-list'] })
      toast.success('Akun admin berhasil dihapus!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus akun admin')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({ name, email, password, role })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAdmin) return
    updateMutation.mutate({
      id: editingAdmin.id,
      data: { name: editName, role: editRole, is_active: editIsActive },
    })
  }

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTargetAdmin) return
    resetPasswordMutation.mutate({
      id: resetTargetAdmin.id,
      new_password: newPassword,
    })
  }

  const handleDelete = (a: Admin) => {
    if (a.id === currentUser?.id) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri!')
      return
    }
    if (window.confirm(`Yakin ingin menghapus admin ${a.name} (${a.email})?`)) {
      deleteMutation.mutate(a.id)
    }
  }

  const openEdit = (a: Admin) => {
    setEditingAdmin(a)
    setEditName(a.name)
    setEditRole(a.role)
    setEditIsActive(a.is_active ?? true)
    setEditModalOpen(true)
  }

  const openReset = (a: Admin) => {
    setResetTargetAdmin(a)
    setNewPassword('')
    setResetModalOpen(true)
  }

  const getRoleBadge = (r: AdminRole) => {
    switch (r) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-gold/15 text-gold border border-gold/40">
            <Shield size={11} strokeWidth={1.5} />
            <span>Super Admin</span>
          </span>
        )
      case 'admin_1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span>Admin Konten 1</span>
          </span>
        )
      case 'admin_2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <span>Admin Konten 2</span>
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-white uppercase tracking-wider flex items-center gap-2.5">
            <ShieldCheck size={24} strokeWidth={1.5} className="text-gold" />
            <span>Kelola Akun Administrator (RBAC)</span>
          </h1>
          <p className="text-white/50 text-xs mt-1">
            Khusus Super Admin: kelola hak akses dan peran admin_1 serta admin_2.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-gold text-dark font-heading font-black uppercase tracking-wider text-xs rounded-xl hover:brightness-110 flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
        >
          <UserPlus size={16} strokeWidth={1.5} />
          <span>Tambah Admin Baru</span>
        </button>
      </div>

      {/* Info Card Role Explanation */}
      <div className="bg-primary/20 border border-gold/30 rounded-2xl p-4 text-xs text-white/80 space-y-1">
        <div className="font-bold text-gold flex items-center gap-1.5 uppercase tracking-wide">
          <AlertTriangle size={15} />
          <span>Aturan Hak Akses (Role-Based Access Control)</span>
        </div>
        <p className="leading-relaxed">
          <strong>super_admin:</strong> Akses penuh ke seluruh fitur dan sistem.<br />
          <strong>admin_1 & admin_2:</strong> Dibatasi khusus untuk pengelolaan konten informasi (Berita, Hero Carousel, About Us, Sejarah, Agenda, Gallery, Merchandise, Pesan Masuk). Dilarang mengakses transaksi tiket, data anggota, pengaturan keuangan, dan akun admin.
        </p>
      </div>

      {/* Table Section */}
      <div className="bg-dark rounded-2xl border border-gold/20 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a08] text-white/50 border-b border-white/10 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Nama Admin</th>
                <th className="py-3.5 px-4">Email Login</th>
                <th className="py-3.5 px-4 text-center">Peran (Role)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Dibuat Pada</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-white/40 italic">
                    Tidak ada data admin.
                  </td>
                </tr>
              ) : (
                admins.map((a: Admin) => {
                  const isSelf = a.id === currentUser?.id
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                        <span>{a.name}</span>
                        {isSelf && (
                          <span className="text-[10px] text-gold font-bold bg-gold/15 px-2 py-0.5 rounded border border-gold/30">
                            (Akun Anda)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-white/70">
                        {a.email}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getRoleBadge(a.role)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            a.is_active !== false
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {a.is_active !== false ? (
                            <>
                              <CheckCircle2 size={11} strokeWidth={1.5} />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={11} strokeWidth={1.5} />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white/40 text-[11px]">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(a)}
                            className="p-1.5 rounded-lg text-white/60 hover:text-gold hover:bg-white/5 transition-colors"
                            title="Ubah Role / Status"
                          >
                            <Edit2 size={15} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => openReset(a)}
                            className="p-1.5 rounded-lg text-white/60 hover:text-amber-400 hover:bg-white/5 transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound size={15} strokeWidth={1.5} />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(a)}
                              className="p-1.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors"
                              title="Hapus Admin"
                            >
                              <Trash2 size={15} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ADMIN MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Buat Akun Admin Baru"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Nama Admin <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Admin Konten Sleman"
              className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Email Login <span className="text-gold">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@compass.id"
              className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Password Baru (Minimal 8 Karakter) <span className="text-gold">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Pilih Role Akses <span className="text-gold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'admin_1'
                    ? 'border-gold bg-primary/40 text-gold font-bold shadow-sm'
                    : 'border-white/10 hover:border-gold/30 bg-[#060a08] text-white/70'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  className="sr-only"
                  checked={role === 'admin_1'}
                  onChange={() => setRole('admin_1')}
                />
                <div className="text-sm font-semibold">admin_1</div>
                <div className="text-[10px] text-white/50 mt-0.5">Kelola Konten & Informasi</div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'admin_2'
                    ? 'border-gold bg-primary/40 text-gold font-bold shadow-sm'
                    : 'border-white/10 hover:border-gold/30 bg-[#060a08] text-white/70'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  className="sr-only"
                  checked={role === 'admin_2'}
                  onChange={() => setRole('admin_2')}
                />
                <div className="text-sm font-semibold">admin_2</div>
                <div className="text-[10px] text-white/50 mt-0.5">Kelola Konten & Informasi</div>
              </label>
            </div>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-2/3 py-2.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Buat Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT ADMIN MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Ubah Admin: ${editingAdmin?.email}`}
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Nama Admin
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {editingAdmin?.id !== currentUser?.id && (
            <div>
              <label className="block text-white/80 font-semibold uppercase mb-1">
                Role Akses
              </label>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value as AdminRole)}
                className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-gold"
              >
                <option value="admin_1">admin_1 (Kelola Konten)</option>
                <option value="admin_2">admin_2 (Kelola Konten)</option>
                <option value="super_admin">super_admin (Akses Penuh)</option>
              </select>
            </div>
          )}

          {editingAdmin?.id !== currentUser?.id && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setEditIsActive(!editIsActive)}
                className="flex items-center gap-2 text-white/80 cursor-pointer"
              >
                {editIsActive ? (
                  <ToggleRight size={24} className="text-emerald-400" />
                ) : (
                  <ToggleLeft size={24} className="text-white/40" />
                )}
                <span>Status Akun Aktif (Bisa Login)</span>
              </button>
            </div>
          )}

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-2/3 py-2.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Password: ${resetTargetAdmin?.name}`}
        size="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
          <p className="text-white/70 text-sm">
            Masukkan password baru minimal 8 karakter untuk akun <strong>{resetTargetAdmin?.email}</strong>.
          </p>

          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Password Baru <span className="text-gold">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className="w-2/3 py-2.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {resetPasswordMutation.isPending ? 'Mereset...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
