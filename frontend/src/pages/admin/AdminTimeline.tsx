import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetHistory,
  adminCreateHistory,
  adminUpdateHistory,
  adminDeleteHistory,
} from '../../services/endpoints'
import type { HistoryTimeline } from '../../types'

export default function AdminTimeline() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HistoryTimeline | null>(null)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-history'],
    queryFn: adminGetHistory,
  })

  const items = data?.data?.data || []

  const handleOpenCreate = () => {
    setEditingItem(null)
    setYear(2027)
    setTitle('')
    setDescription('')
    setSortOrder(items.length + 1)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: HistoryTimeline) => {
    setEditingItem(item)
    setYear(item.year)
    setTitle(item.title)
    setDescription(item.description)
    setSortOrder(item.sort_order)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingItem) {
        await adminUpdateHistory(editingItem.id, { year, title, description, sort_order: sortOrder })
        toast.success('Tonggak sejarah berhasil diperbarui!')
      } else {
        await adminCreateHistory({ year, title, description, sort_order: sortOrder })
        toast.success('Tonggak sejarah baru ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-history'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
      setModalOpen(false)
    } catch {
      toast.error('Gagal menyimpan tonggak sejarah.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus item sejarah ini?')) return
    try {
      await adminDeleteHistory(id)
      toast.success('Item sejarah dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-history'] })
      queryClient.invalidateQueries({ queryKey: ['public-about'] })
    } catch {
      toast.error('Gagal menghapus item sejarah.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
            Sejarah Komunitas (Timeline)
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Kelola tonggak perjalanan sejarah COMPASS dari tahun ke tahun.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn-gold rounded-lg py-2.5 px-4 text-xs font-bold uppercase">
          + Tambah Tonggak Sejarah
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : (
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-heading text-white">
                <tr>
                  <th className="p-4">Tahun</th>
                  <th className="p-4">Judul Peristiwa</th>
                  <th className="p-4">Deskripsi</th>
                  <th className="p-4">Urutan</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="p-4 font-heading font-bold text-gold text-base whitespace-nowrap">
                      {item.year}
                    </td>
                    <td className="p-4 font-semibold text-white">
                      {item.title}
                    </td>
                    <td className="p-4 text-xs text-white/60 max-w-md line-clamp-2">
                      {item.description}
                    </td>
                    <td className="p-4 text-xs">
                      {item.sort_order}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Tonggak Sejarah' : 'Tambah Tonggak Sejarah'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Tahun Peristiwa</label>
              <input
                type="number"
                required
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Urutan</label>
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Judul Peristiwa</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Lahirnya Komunitas COMPASS"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Deskripsi Peristiwa</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Jelaskan momen penting peristiwa tersebut..."
              className="w-full bg-dark border border-white/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline-gold py-2 px-4 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-5 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
