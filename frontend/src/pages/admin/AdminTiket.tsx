import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetMatches,
  adminGetTickets,
  adminCreateTicket,
  adminUpdateTicket,
  adminDeleteTicket,
  adminUpdateMatch,
} from '../../services/endpoints'
import type { TicketCategory } from '../../types'

export default function AdminTiket() {
  const queryClient = useQueryClient()
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState<TicketCategory | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(50000)
  const [quota, setQuota] = useState<number>(100)
  const [ticketFormUrl, setTicketFormUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Ambil list pertandingan
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['admin-matches'],
    queryFn: adminGetMatches,
  })
  const matches = matchesData?.data?.data || []
  const activeMatchId = selectedMatchId || matches[0]?.id

  // Ambil tiket per match yang dipilih
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['admin-match-tickets', activeMatchId],
    queryFn: () => adminGetTickets(activeMatchId),
    enabled: !!activeMatchId,
  })
  const tickets = ticketsData?.data?.data || []
  const activeMatch = matches.find(m => m.id === activeMatchId)

  const handleOpenCreate = () => {
    setEditingTicket(null)
    setName('')
    setPrice(50000)
    setQuota(200)
    setModalOpen(true)
  }

  const handleOpenEdit = (t: TicketCategory) => {
    setEditingTicket(t)
    setName(t.name)
    setPrice(Number(t.price))
    setQuota(t.quota)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeMatchId) return
    setSubmitting(true)
    try {
      if (editingTicket) {
        await adminUpdateTicket(activeMatchId, editingTicket.id, {
          name,
          price: String(price) as any,
          quota,
        })
        toast.success('Kategori tiket berhasil diperbarui!')
      } else {
        await adminCreateTicket(activeMatchId, {
          name,
          price: String(price) as any,
          quota,
        })
        toast.success('Kategori tiket baru ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-match-tickets', activeMatchId] })
      queryClient.invalidateQueries({ queryKey: ['match-tickets', activeMatchId] })
      setModalOpen(false)
    } catch {
      toast.error('Gagal menyimpan kategori tiket.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (ticketId: string) => {
    if (!confirm('Hapus kategori tiket ini?')) return
    try {
      await adminDeleteTicket(activeMatchId, ticketId)
      toast.success('Kategori tiket dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-match-tickets', activeMatchId] })
      queryClient.invalidateQueries({ queryKey: ['match-tickets', activeMatchId] })
    } catch {
      toast.error('Gagal menghapus tiket.')
    }
  }

  const handleSaveFormUrl = async () => {
    if (!activeMatchId) return
    try {
      await adminUpdateMatch(activeMatchId, { ticket_form_url: ticketFormUrl || null })
      toast.success('Link form pembelian tiket berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['admin-matches'] })
    } catch {
      toast.error('Gagal menyimpan link form.')
    }
  }

  if (matchesLoading) return <LoadingSpinner size="md" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
          Kelola Tiket Pertandingan
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Atur kuota, harga kategori tiket, dan link formulir eksternal Google Form per pertandingan.
        </p>
      </div>

      {/* Select Match Dropdown */}
      <div className="card-dark p-6 rounded-xl space-y-4">
        <div>
          <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
            Pilih Pertandingan
          </label>
          <select
            value={activeMatchId}
            onChange={e => {
              setSelectedMatchId(e.target.value)
              const found = matches.find(m => m.id === e.target.value)
              setTicketFormUrl(found?.ticket_form_url || '')
            }}
            className="w-full sm:max-w-md bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
          >
            {matches.map(m => (
              <option key={m.id} value={m.id}>
                {m.match_date} - PSS Sleman vs {m.opponent_name} ({m.stadium})
              </option>
            ))}
          </select>
        </div>

        {/* Form link for this match */}
        {activeMatch && (
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
                Link Google Form Pembelian Tiket Laga Ini
              </label>
              <input
                type="url"
                defaultValue={activeMatch.ticket_form_url || ''}
                onChange={e => setTicketFormUrl(e.target.value)}
                placeholder="https://forms.google.com/..."
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <button
              onClick={handleSaveFormUrl}
              className="btn-gold py-2 px-5 rounded-lg text-xs font-bold uppercase whitespace-nowrap"
            >
              Simpan Link
            </button>
          </div>
        )}
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg text-white uppercase">
            Kategori Tiket ({tickets.length})
          </h2>
          <button
            onClick={handleOpenCreate}
            disabled={!activeMatchId}
            className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
          >
            + Tambah Kategori Tiket
          </button>
        </div>

        {ticketsLoading ? (
          <LoadingSpinner size="sm" />
        ) : tickets.length === 0 ? (
          <div className="card-dark p-8 text-center rounded-xl">
            <p className="text-white/50 text-sm">Belum ada kategori tiket untuk pertandingan ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tickets.map(t => (
              <div key={t.id} className="card-dark p-5 rounded-xl flex flex-col justify-between border-white/10">
                <div>
                  <h3 className="font-heading font-bold text-lg text-white uppercase">{t.name}</h3>
                  <div className="font-mono font-bold text-xl text-gold mt-1">
                    Rp {Number(t.price).toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-white/60 mt-3 space-y-1">
                    <div>Total Kuota: <strong className="text-white">{t.quota}</strong></div>
                    <div>Terjual: <strong className="text-white">{t.sold}</strong></div>
                    <div>Sisa Kuota: <strong className="text-emerald-400">{Math.max(0, t.quota - t.sold)}</strong></div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 flex justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTicket ? 'Edit Kategori Tiket' : 'Tambah Kategori Tiket'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nama Tribun / Kategori</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Tribun Selatan / VIP"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Harga (Rupiah)</label>
            <input
              type="number"
              min="0"
              step="5000"
              required
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold font-mono"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Jumlah Kuota</label>
            <input
              type="number"
              min="0"
              required
              value={quota}
              onChange={e => setQuota(Number(e.target.value))}
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold font-mono"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline-gold py-2 px-3 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-4 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
