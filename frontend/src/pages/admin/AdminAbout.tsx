import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  getAbout,
  adminUpdateAbout,
  adminCreateTeamMember,
  adminUpdateTeamMember,
  adminDeleteTeamMember,
} from '../../services/endpoints'
import type { TeamMember } from '../../types'

export default function AdminAbout() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-about-data'], queryFn: getAbout })

  const about = data?.data?.data?.about
  const visiMisi = data?.data?.data?.visi_misi
  const teamMembers = data?.data?.data?.team_members || []

  // About & Visi Misi Form State
  const [aboutText, setAboutText] = useState('')
  const [visiMisiText, setVisiMisiText] = useState('')
  const [savingContent, setSavingContent] = useState(false)

  // Team Member Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
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

  const handleOpenCreateMember = () => {
    setEditingMember(null)
    setName('')
    setPosition('')
    setSortOrder(teamMembers.length + 1)
    setPhotoFile(null)
    setModalOpen(true)
  }

  const handleOpenEditMember = (member: TeamMember) => {
    setEditingMember(member)
    setName(member.name)
    setPosition(member.position)
    setSortOrder(member.sort_order)
    setPhotoFile(null)
    setModalOpen(true)
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingMember(true)
    try {
      if (editingMember) {
        await adminUpdateTeamMember(editingMember.id, { name, position, sort_order: sortOrder })
        toast.success('Data pengurus diperbarui!')
      } else {
        const form = new FormData()
        form.append('name', name)
        form.append('position', position)
        form.append('sort_order', String(sortOrder))
        if (photoFile) form.append('photo', photoFile)
        await adminCreateTeamMember(form)
        toast.success('Pengurus baru ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-about-data'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
      setModalOpen(false)
    } catch {
      toast.error('Gagal menyimpan pengurus.')
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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
          About Us & Struktur Pengurus
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Kelola deskripsi profil komunitas, visi misi, dan daftar pengurus COMPASS.
        </p>
      </div>

      {/* 1. Editor Teks About & Visi Misi */}
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

      {/* 2. Kelola Pengurus */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg text-white uppercase">Struktur Pengurus</h2>
          <button
            onClick={handleOpenCreateMember}
            className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase"
          >
            + Tambah Pengurus
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamMembers.map(m => (
            <div key={m.id} className="card-dark rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="h-40 bg-dark-surface rounded-lg overflow-hidden mb-3">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                  )}
                </div>
                <div className="text-xs font-bold text-gold uppercase">{m.position}</div>
                <div className="font-heading font-bold text-white text-base mt-0.5">{m.name}</div>
                <div className="text-[10px] text-white/40 mt-1">Urutan: {m.sort_order}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenEditMember(m)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteMember(m.id)}
                  className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs"
                >
                  Hapus
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

          {!editingMember && (
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Foto Pengurus</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold"
              />
            </div>
          )}

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
