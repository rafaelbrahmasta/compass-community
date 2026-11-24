import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetAgendas,
  adminCreateAgenda,
  adminUpdateAgenda,
  adminDeleteAgenda,
} from '../../services/endpoints'
import type { Agenda, AgendaStatus } from '../../types'

export default function AdminAgenda() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-agendas'], queryFn: adminGetAgendas })
  const agendas = data?.data?.data || []

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAgenda, setEditingAgenda] = useState<Agenda | null>(null)
  const [title, setTitle] = useState('')
  const [agendaDate, setAgendaDate] = useState('2027-01-15')
  const [agendaTime, setAgendaTime] = useState('19:30')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<AgendaStatus>('upcoming')
  const [submitting, setSubmitting] = useState(false)

  const handleOpenCreate = () => {
    setEditingAgenda(null)
    setTitle('')
    setAgendaDate('2027-01-15')
    setAgendaTime('19:30')
    setLocation('')
    setDescription('')
    setStatus('upcoming')
    setModalOpen(true)
  }

  const handleOpenEdit = (a: Agenda) => {
    setEditingAgenda(a)
    setTitle(a.title)
    setAgendaDate(a.agenda_date)
    setAgendaTime(a.agenda_time.slice(0, 5))
    setLocation(a.location)
    setDescription(a.description)
    setStatus(a.status)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingAgenda) {
        await adminUpdateAgenda(editingAgenda.id, {
          title,
          agenda_date: agendaDate,
          agenda_time: agendaTime.length === 5 ? `${agendaTime}:00` : agendaTime,
          location,
          description,
          status,
        })
        toast.success('Agenda berhasil diperbarui!')
      } else {
        await adminCreateAgenda({
          title,
          agenda_date: agendaDate,
          agenda_time: agendaTime.length === 5 ? `${agendaTime}:00` : agendaTime,
          location,
          description,
          status,
        })
        toast.success('Agenda baru ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-agendas'] })
      queryClient.invalidateQueries({ queryKey: ['public-agendas'] })
      setModalOpen(false)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || 'Gagal menyimpan agenda.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus agenda ini?')) return
    try {
      await adminDeleteAgenda(id)
      toast.success('Agenda dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-agendas'] })
      queryClient.invalidateQueries({ queryKey: ['public-agendas'] })
    } catch {
      toast.error('Gagal menghapus agenda.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
            Kelola Agenda Komunitas
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Jadwal kegiatan forum suporter, rapat, nobar, dan bakti sosial.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase"
        >
          + Tambah Agenda Baru
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : agendas.length === 0 ? (
        <div className="card-dark p-12 text-center rounded-xl max-w-md mx-auto">
          <span className="text-4xl mb-3 block">📋</span>
          <p className="text-white/60 text-sm">Belum ada agenda komunitas.</p>
        </div>
      ) : (
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-heading text-white">
                <tr>
                  <th className="p-4">Tanggal & Jam</th>
                  <th className="p-4">Judul Agenda</th>
                  <th className="p-4">Lokasi</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {agendas.map(a => (
                  <tr key={a.id} className="hover:bg-white/5">
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-white">{a.agenda_date}</div>
                      <div className="text-xs text-gold font-mono">{a.agenda_time.slice(0, 5)} WIB</div>
                    </td>
                    <td className="p-4 font-semibold text-white">
                      {a.title}
                    </td>
                    <td className="p-4 text-xs text-white/60">
                      {a.location}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        a.status === 'done' ? 'bg-white/10 text-white/60' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {a.status === 'done' ? 'Selesai' : 'Akan Datang'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(a)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
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
        title={editingAgenda ? 'Edit Agenda' : 'Tambah Agenda Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Judul Agenda</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Rapat Koordinasi Away Day"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={agendaDate}
                onChange={e => setAgendaDate(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Waktu</label>
              <input
                type="time"
                required
                value={agendaTime}
                onChange={e => setAgendaTime(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Lokasi Kegiatan</label>
            <input
              type="text"
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Contoh: Sekretariat COMPASS / Warung Nobar"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Status Kegiatan</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as AgendaStatus)}
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            >
              <option value="upcoming">Akan Datang</option>
              <option value="done">Selesai</option>
            </select>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Deskripsi Kegiatan</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Poin-poin pembahasan atau agenda pertemuan..."
              className="w-full bg-dark border border-white/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline-gold py-2 px-3 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-4 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan Agenda'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
