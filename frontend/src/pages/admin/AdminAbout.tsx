import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Upload, Image as ImageIcon, RefreshCw, User, Plus, Edit, Trash2 } from 'lucide-react'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  getAbout,
  adminUpdateAbout,
  adminUploadAboutImage,
  adminCreateTeamMember,
  adminUpdateTeamMember,
  adminDeleteTeamMember,
} from '../../services/endpoints'
import { getAssetUrl } from '../../services/api'
import type { TeamMember } from '../../types'

const DEFAULT_ABOUT_IMAGE =
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80'

export default function AdminAbout() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-about-data'], queryFn: getAbout })

  const about = data?.data?.data?.about
  const visiMisi = data?.data?.data?.visi_misi
  const aboutImage = data?.data?.data?.about_image
  const teamMembers = data?.data?.data?.team_members || []

  // About & Visi Misi Form State
  const [aboutText, setAboutText] = useState('')
  const [visiMisiText, setVisiMisiText] = useState('')
  const [savingContent, setSavingContent] = useState(false)

  // Photo State
  const [photoUploadFile, setPhotoUploadFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [customPhotoUrl, setCustomPhotoUrl] = useState('')
  const [savingPhoto, setSavingPhoto] = useState(false)

  // Team Member Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [memberPhotoFile, setMemberPhotoFile] = useState<File | null>(null)
  const [savingMember, setSavingMember] = useState(false)

  const handleSaveAbout = async () => {
    setSavingContent(true)
    try {
      await adminUpdateAbout('about', aboutText || about?.content || '')
      await adminUpdateAbout('visi_misi', visiMisiText || visiMisi?.content || '')
      toast.success('Konten profil & visi misi berhasil diperbarui!')
      queryClient.invalidateQueries({ queryKey: ['admin-about-data'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
    } catch {
      toast.error('Gagal menyimpan konten.')
    } finally {
      setSavingContent(false)
    }
  }

  const handleSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoUploadFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleUploadPhoto = async () => {
    if (!photoUploadFile) {
      toast.error('Silakan pilih file gambar terlebih dahulu.')
      return
    }
    setSavingPhoto(true)
    try {
      await adminUploadAboutImage(photoUploadFile)
      toast.success('Foto profil komunitas berhasil diperbarui!')
      setPhotoUploadFile(null)
      setPhotoPreview(null)
      queryClient.invalidateQueries({ queryKey: ['admin-about-data'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
    } catch {
      toast.error('Gagal mengunggah foto.')
    } finally {
      setSavingPhoto(false)
    }
  }

  const handleSavePhotoUrl = async () => {
    if (!customPhotoUrl.trim()) {
      toast.error('Masukkan URL gambar yang valid.')
      return
    }
    setSavingPhoto(true)
    try {
      await adminUpdateAbout('about_image', customPhotoUrl.trim())
      toast.success('URL foto komunitas berhasil disimpan!')
      setCustomPhotoUrl('')
      queryClient.invalidateQueries({ queryKey: ['admin-about-data'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
    } catch {
      toast.error('Gagal menyimpan URL foto.')
    } finally {
      setSavingPhoto(false)
    }
  }

  const handleResetPhoto = async () => {
    if (!confirm('Kembalikan foto komunitas ke gambar default?')) return
    setSavingPhoto(true)
    try {
      await adminUpdateAbout('about_image', '')
      toast.success('Foto komunitas dikembalikan ke default.')
      setPhotoPreview(null)
      setPhotoUploadFile(null)
      queryClient.invalidateQueries({ queryKey: ['admin-about-data'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
    } catch {
      toast.error('Gagal mereset foto.')
    } finally {
      setSavingPhoto(false)
    }
  }

  const handleOpenCreateMember = () => {
    setEditingMember(null)
    setName('')
    setPosition('')
    setSortOrder(teamMembers.length + 1)
    setMemberPhotoFile(null)
    setModalOpen(true)
  }

  const handleOpenEditMember = (member: TeamMember) => {
    setEditingMember(member)
    setName(member.name)
    setPosition(member.position)
    setSortOrder(member.sort_order)
    setMemberPhotoFile(null)
    setModalOpen(true)
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingMember(true)
    try {
      if (editingMember) {
        await adminUpdateTeamMember(editingMember.id, { name, position, sort_order: sortOrder })
        if (memberPhotoFile) {
          await import('../../services/endpoints').then(m => m.adminUpdateTeamMemberPhoto(editingMember.id, memberPhotoFile))
        }
        toast.success('Data pengurus & foto berhasil diperbarui!')
      } else {
        const form = new FormData()
        form.append('name', name)
        form.append('position', position)
        form.append('sort_order', String(sortOrder))
        if (memberPhotoFile) form.append('photo', memberPhotoFile)
        await adminCreateTeamMember(form)
        toast.success('Pengurus baru ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-about-data'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
      setModalOpen(false)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || 'Gagal menyimpan pengurus.')
    } finally {
      setSavingMember(false)
    }
  }

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Hapus pengurus ini?')) return
    try {
      await adminDeleteTeamMember(id)
      toast.success('Pengurus dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-about-data'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
    } catch {
      toast.error('Gagal menghapus pengurus.')
    }
  }

  if (isLoading) return <LoadingSpinner size="md" />

  const currentActiveImage =
    photoPreview || (aboutImage?.content ? getAssetUrl(aboutImage.content) : DEFAULT_ABOUT_IMAGE)

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
          About Us & Struktur Pengurus
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Kelola foto utama profil komunitas, deskripsi, visi misi, dan susunan kepengurusan COMPASS.
        </p>
      </div>

      {/* 1. Kelola Foto Utama Profil Komunitas */}
      <div className="card-dark p-6 rounded-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-heading font-bold text-lg text-gold uppercase flex items-center gap-2">
              <ImageIcon size={20} className="text-gold" />
              <span>Foto Utama Komunitas (Tentang COMPASS)</span>
            </h2>
            <p className="text-white/50 text-xs mt-1">
              Foto ini tampil di halaman Beranda (Section Tentang COMPASS) dan halaman Tentang Kami publik.
            </p>
          </div>
          {aboutImage?.content && (
            <button
              onClick={handleResetPhoto}
              disabled={savingPhoto}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <RefreshCw size={13} />
              <span>Reset ke Gambar Default</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Preview Foto */}
          <div className="lg:col-span-5 space-y-2">
            <label className="block text-white/70 text-xs font-semibold uppercase">
              Preview Foto Saat Ini
            </label>
            <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border-2 border-gold/40 bg-dark-surface shadow-lg">
              <img
                src={currentActiveImage}
                alt="Foto Profil Komunitas COMPASS"
                className="w-full h-full object-cover"
              />
              {photoPreview && (
                <div className="absolute top-2 left-2 bg-gold text-dark text-[11px] font-bold px-2 py-0.5 rounded shadow">
                  Preview Baru (Belum Disimpan)
                </div>
              )}
            </div>
            <p className="text-white/40 text-[11px] truncate">
              {aboutImage?.content ? `Sumber: ${aboutImage.content}` : 'Sumber: Gambar Default'}
            </p>
          </div>

          {/* Form Upload & URL */}
          <div className="lg:col-span-7 space-y-5">
            {/* Opsi 1: Unggah File */}
            <div className="p-4 rounded-lg bg-dark-surface/50 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Opsi 1: Unggah Foto dari Komputer
              </span>
              <p className="text-white/50 text-xs">
                Format didukung: JPG, PNG, WebP (maksimal 5 MB).
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSelectPhoto}
                  className="text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold hover:file:brightness-110 cursor-pointer"
                />
                <button
                  onClick={handleUploadPhoto}
                  disabled={!photoUploadFile || savingPhoto}
                  className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Upload size={14} />
                  <span>{savingPhoto ? 'Mengunggah...' : 'Unggah Foto'}</span>
                </button>
              </div>
            </div>

            {/* Opsi 2: Input URL Langsung */}
            <div className="p-4 rounded-lg bg-dark-surface/50 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Opsi 2: Atau Gunakan URL Gambar Eksternal
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={customPhotoUrl}
                  onChange={e => setCustomPhotoUrl(e.target.value)}
                  className="flex-1 bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                />
                <button
                  onClick={handleSavePhotoUrl}
                  disabled={!customPhotoUrl.trim() || savingPhoto}
                  className="btn-outline-gold py-2 px-4 rounded-lg text-xs font-bold uppercase disabled:opacity-40 whitespace-nowrap"
                >
                  Simpan URL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Editor Teks About & Visi Misi */}
      <div className="card-dark p-6 rounded-xl space-y-6">
        <h2 className="font-heading font-bold text-lg text-gold uppercase">Profil & Visi Misi</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
              Deskripsi Komunitas (About)
            </label>
            <textarea
              rows={4}
              defaultValue={about?.content || ''}
              onChange={e => setAboutText(e.target.value)}
              className="w-full bg-dark border border-white/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
              Visi & Misi Komunitas
            </label>
            <textarea
              rows={4}
              defaultValue={visiMisi?.content || ''}
              onChange={e => setVisiMisiText(e.target.value)}
              className="w-full bg-dark border border-white/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveAbout}
              disabled={savingContent}
              className="btn-gold py-2 px-6 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
            >
              {savingContent ? 'Menyimpan...' : 'Simpan Teks Profil'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Kelola Pengurus */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg text-white uppercase">Struktur Pengurus</h2>
          <button
            onClick={handleOpenCreateMember}
            className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Tambah Pengurus</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamMembers.map(m => (
            <div key={m.id} className="card-dark rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="h-40 bg-dark-surface rounded-lg overflow-hidden mb-3">
                  {m.photo_url ? (
                    <img src={getAssetUrl(m.photo_url)} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <User size={36} className="text-white/30" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-bold text-gold uppercase">{m.position}</div>
                <div className="font-heading font-bold text-white text-base mt-0.5">{m.name}</div>
                <div className="text-[10px] text-white/40 mt-1">Urutan: {m.sort_order}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenEditMember(m)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <Edit size={12} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteMember(m.id)}
                  className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Member */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? 'Edit Pengurus' : 'Tambah Pengurus Baru'}
        size="md"
      >
        <form onSubmit={handleSaveMember} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Jabatan / Posisi</label>
            <input
              type="text"
              required
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="Contoh: Ketua Umum / Divisi Kreatif"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Urutan Tampil</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
              {editingMember ? 'Ganti Foto Pengurus (Opsional)' : 'Foto Pengurus'}
            </label>
            {editingMember && editingMember.photo_url && (
              <div className="flex items-center gap-3 mb-2 p-2 bg-dark-surface/50 rounded-lg border border-white/10">
                <img src={getAssetUrl(editingMember.photo_url)} alt={editingMember.name} className="w-12 h-12 object-cover rounded-md" />
                <span className="text-xs text-white/60">Foto profil saat ini. Pilih file baru di bawah jika ingin menggantinya.</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={e => setMemberPhotoFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline-gold py-2 px-4 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={savingMember} className="btn-gold py-2 px-5 rounded text-xs font-bold disabled:opacity-50">
              {savingMember ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
