import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Users,
  UserPlus,
  Search,
  Upload,
  Download,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Ticket,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetMembers,
  adminCreateMember,
  adminUpdateMember,
  adminDeleteMember,
  adminImportMembersCsv,
} from '../../services/endpoints'
import type { Member } from '../../types'

export default function AdminAnggota() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isActive, setIsActive] = useState(true)

  // CSV Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [importing, setImporting] = useState(false)

  // Query Members
  const { data, isLoading } = useQuery({
    queryKey: ['admin-members', search, page],
    queryFn: () => adminGetMembers({ q: search || undefined, page, per_page: perPage }),
  })

  const membersData = data?.data?.data
  const members = membersData?.items || []
  const total = membersData?.total || 0
  const totalPages = membersData?.total_pages || 1

  // Mutations
  const createMutation = useMutation({
    mutationFn: adminCreateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      toast.success('Anggota berhasil didaftarkan!')
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan anggota')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminUpdateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      toast.success('Data anggota berhasil diperbarui!')
      closeModal()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui anggota')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      toast.success('Anggota berhasil dihapus!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus anggota')
    },
  })

  const openCreateModal = () => {
    setEditingMember(null)
    setFullName('')
    setPhone('')
    setEmail('')
    setIsActive(true)
    setModalOpen(true)
  }

  const openEditModal = (m: Member) => {
    setEditingMember(m)
    setFullName(m.full_name)
    setPhone(m.phone)
    setEmail(m.email || '')
    setIsActive(m.is_active)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingMember(null)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingMember) {
      updateMutation.mutate({
        id: editingMember.id,
        data: { full_name: fullName, phone, email: email || undefined, is_active: isActive },
      })
    } else {
      createMutation.mutate({
        full_name: fullName,
        phone,
        email: email || undefined,
        is_active: isActive,
      })
    }
  }

  const handleToggleActive = (m: Member) => {
    updateMutation.mutate({
      id: m.id,
      data: {
        full_name: m.full_name,
        phone: m.phone,
        email: m.email || undefined,
        is_active: !m.is_active,
      },
    })
  }

  const handleDelete = (m: Member) => {
    if (window.confirm(`Yakin ingin menghapus anggota ${m.full_name} (${m.member_code})?`)) {
      deleteMutation.mutate(m.id)
    }
  }

  const handleExportCsv = () => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080/api/v1'
    const token = localStorage.getItem('compass_token')
    fetch(`${apiUrl}/admin/members/export-csv`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `data-anggota-compass-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        toast.success('File CSV anggota berhasil diunduh!')
      })
      .catch(() => toast.error('Gagal mengekspor CSV'))
  }

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvContent.trim()) {
      toast.error('Konten CSV tidak boleh kosong!')
      return
    }

    setImporting(true)
    try {
      const res = await adminImportMembersCsv(csvContent)
      toast.success(
        `Impor selesai! Berhasil: ${res.data.data.success_count}, Gagal: ${res.data.data.error_count}`
      )
      queryClient.invalidateQueries({ queryKey: ['admin-members'] })
      setImportModalOpen(false)
      setCsvContent('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengimpor CSV')
    } finally {
      setImporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = event => {
      setCsvContent(event.target?.result as string)
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-white uppercase tracking-wider flex items-center gap-2.5">
            <Users size={24} strokeWidth={1.5} className="text-gold" />
            <span>Kelola Anggota COMPASS</span>
          </h1>
          <p className="text-white/50 text-xs mt-1">
            Daftar suporter resmi terdaftar yang berhak membeli tiket pertandingan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gold text-dark font-heading font-black uppercase tracking-wider text-xs rounded-xl hover:brightness-110 flex items-center gap-1.5 transition-all shadow-md"
          >
            <UserPlus size={16} strokeWidth={1.5} />
            <span>Tambah Anggota</span>
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-white/20 hover:border-gold text-white/80 hover:text-gold text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Upload size={15} strokeWidth={1.5} />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 rounded-xl border border-white/20 hover:border-gold text-white/80 hover:text-gold text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={15} strokeWidth={1.5} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-dark p-4 rounded-2xl border border-gold/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Cari kode anggota, nama, HP..."
            className="w-full bg-[#060a08] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white placeholder-white/30 text-xs focus:outline-none focus:border-gold transition-colors"
          />
          <Search size={15} strokeWidth={1.5} className="absolute left-3 top-2.5 text-white/40" />
        </div>

        <div className="text-xs text-white/50">
          Total: <strong className="text-gold font-bold">{total}</strong> anggota terdaftar
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-dark rounded-2xl border border-gold/20 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a08] text-white/50 border-b border-white/10 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Kode</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">No. HP</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Tiket Dibeli</th>
                <th className="py-3.5 px-4">Terdaftar</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-white/40 italic">
                    Tidak ada data anggota yang cocok.
                  </td>
                </tr>
              ) : (
                members.map((m: Member) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gold">
                      {m.member_code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {m.full_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white/70">
                      {m.phone}
                    </td>
                    <td className="py-3.5 px-4 text-white/60">
                      {m.email || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(m)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase transition-all ${
                          m.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                        }`}
                        title="Klik untuk ubah status aktif"
                      >
                        {m.is_active ? (
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
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-white bg-white/5 px-2.5 py-0.5 rounded-md">
                        <Ticket size={12} className="text-gold" />
                        <span>{m.ticket_count || 0}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-white/40 text-[11px]">
                      {new Date(m.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 rounded-lg text-white/60 hover:text-gold hover:bg-white/5 transition-colors"
                          title="Ubah Anggota"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors"
                          title="Hapus Anggota"
                        >
                          <Trash2 size={15} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="bg-[#060a08] px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
            <div>
              Halaman {page} dari {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-white/10 disabled:opacity-30 hover:border-gold hover:text-gold transition-colors"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-white/10 disabled:opacity-30 hover:border-gold hover:text-gold transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingMember ? `Ubah Data: ${editingMember.member_code}` : 'Tambah Anggota Baru'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Nama Lengkap <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nama sesuai KTP/identitas"
              className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Nomor WhatsApp / HP <span className="text-gold">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Alamat Email (Opsional)
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="flex items-center gap-2 text-white/80 cursor-pointer"
            >
              {isActive ? (
                <ToggleRight size={24} className="text-emerald-400" />
              ) : (
                <ToggleLeft size={24} className="text-white/40" />
              )}
              <span>Status Anggota Aktif (Berhak Beli Tiket)</span>
            </button>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="w-1/3 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-2/3 py-2.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {editingMember ? 'Simpan Perubahan' : 'Daftarkan Anggota'}
            </button>
          </div>
        </form>
      </Modal>

      {/* IMPORT CSV MODAL */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Data Anggota via CSV"
        size="md"
      >
        <form onSubmit={handleImportCsv} className="space-y-4 text-xs">
          <div className="bg-primary/20 border border-gold/30 rounded-xl p-3 text-white/80 space-y-1">
            <div className="font-bold text-gold flex items-center gap-1.5">
              <FileText size={14} />
              <span>Format Kolom CSV:</span>
            </div>
            <code className="block bg-black/40 p-2 rounded text-[11px] font-mono text-white/90">
              Nama Lengkap,Nomor HP,Email
            </code>
            <p className="text-[10px] text-white/50">
              Kode anggota (CMP-XXXX) akan dibuat otomatis oleh sistem secara berurutan.
            </p>
          </div>

          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Pilih File CSV (.csv)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gold file:text-dark file:font-bold hover:file:brightness-110 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-white/80 font-semibold uppercase mb-1">
              Atau Tempel (Paste) Konten CSV di Sini:
            </label>
            <textarea
              rows={6}
              value={csvContent}
              onChange={e => setCsvContent(e.target.value)}
              placeholder="Bagus Prasetyo,081234567891,bagus@gmail.com&#10;Dimas Wahyu,081234567892,dimas@gmail.com"
              className="w-full bg-[#060a08] border border-white/20 rounded-xl p-3 text-white placeholder-white/20 font-mono text-xs focus:outline-none focus:border-gold"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="w-1/3 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={importing || !csvContent.trim()}
              className="w-2/3 py-2.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Mengimpor Data...</span>
                </>
              ) : (
                <>
                  <Upload size={15} />
                  <span>Proses Import</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
