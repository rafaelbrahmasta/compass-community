import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Receipt,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  Download,
  Check,
  Scan,
} from 'lucide-react'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetTicketPurchases,
  adminUpdateTicketStatus,
  adminCheckinTicket,
  adminGetTicketProofBlob,
  getMatches,
} from '../../services/endpoints'
import type { TicketPurchase, Match } from '../../types'

export default function AdminPembayaranTiket() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [matchFilter, setMatchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  // Check-in Modal State
  const [checkinModalOpen, setCheckinModalOpen] = useState(false)
  const [checkinMatchId, setCheckinMatchId] = useState('')
  const [scanInput, setScanInput] = useState('')
  const [checkinSuccessData, setCheckinSuccessData] = useState<{
    ticket_code: string
    full_name: string
    member_code: string
    opponent_name: string
    category_name: string
    stadium: string
  } | null>(null)

  // Status Change Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketPurchase | null>(null)
  const [newStatus, setNewStatus] = useState<string>('lunas')
  const [notes, setNotes] = useState('')

  // Preview Bukti Transfer Modal State
  const [proofModalOpen, setProofModalOpen] = useState(false)
  const [proofBlobUrl, setProofBlobUrl] = useState<string | null>(null)
  const [proofLoading, setProofLoading] = useState(false)

  const handleOpenProof = async (ticket: TicketPurchase) => {
    setProofModalOpen(true)
    setProofLoading(true)
    if (proofBlobUrl) {
      URL.revokeObjectURL(proofBlobUrl)
      setProofBlobUrl(null)
    }
    try {
      const blob = await adminGetTicketProofBlob(ticket.id)
      const objectUrl = URL.createObjectURL(blob)
      setProofBlobUrl(objectUrl)
    } catch {
      toast.error('Gagal memuat bukti transfer dari server terautentikasi')
      setProofBlobUrl(null)
    } finally {
      setProofLoading(false)
    }
  }

  const handleCloseProof = () => {
    setProofModalOpen(false)
    if (proofBlobUrl) {
      URL.revokeObjectURL(proofBlobUrl)
      setProofBlobUrl(null)
    }
  }

  // Query Matches for filter dropdown
  const { data: matchesData } = useQuery({
    queryKey: ['admin-matches-dropdown'],
    queryFn: () => getMatches(),
  })
  const matches = matchesData?.data?.data || []

  // Query Ticket Purchases
  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets-list', search, matchFilter, statusFilter, page],
    queryFn: () =>
      adminGetTicketPurchases({
        q: search || undefined,
        match_id: matchFilter || undefined,
        status: statusFilter || undefined,
        page,
        per_page: perPage,
      }),
  })

  const ticketsData = data?.data?.data
  const tickets = ticketsData?.items || []
  const total = ticketsData?.total || 0
  const totalPages = ticketsData?.total_pages || 1

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; notes?: string } }) =>
      adminUpdateTicketStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets-list'] })
      toast.success('Status tiket berhasil diperbarui!')
      setStatusModalOpen(false)
      setSelectedTicket(null)
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Gagal mengubah status tiket')
    },
  })

  const checkinMutation = useMutation({
    mutationFn: (payload: { code_or_payload: string; match_id?: string }) => adminCheckinTicket(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets-list'] })
      setCheckinSuccessData(res.data.data)
      toast.success('Check-in Berhasil! Tiket valid.')
      setScanInput('')
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Gagal check-in tiket')
    },
  })

  const handleCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanInput.trim()) return
    setCheckinSuccessData(null)
    checkinMutation.mutate({
      code_or_payload: scanInput.trim(),
      match_id: checkinMatchId || undefined,
    })
  }

  const handleOpenStatusModal = (ticket: TicketPurchase) => {
    setSelectedTicket(ticket)
    setNewStatus(ticket.status === 'menunggu_pembayaran' ? 'lunas' : ticket.status)
    setNotes(ticket.notes || '')
    setStatusModalOpen(true)
  }

  const handleSubmitStatus = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket) return
    updateStatusMutation.mutate({
      id: selectedTicket.id,
      data: { status: newStatus, notes: notes || undefined },
    })
  }

  const handleExportCsv = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1'
    const token = localStorage.getItem('compass_token')
    const query = new URLSearchParams()
    if (matchFilter) query.append('match_id', matchFilter)
    if (statusFilter) query.append('status', statusFilter)

    fetch(`${apiUrl}/admin/tickets/export-csv?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          throw new Error(errData?.message || `Gagal ekspor CSV (HTTP ${res.status})`)
        }
        return res.blob()
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pesanan-tiket-compass-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        a.remove()
        toast.success('Data pesanan tiket CSV berhasil diunduh!')
      })
      .catch((err: Error) => toast.error(err.message || 'Gagal mengekspor CSV tiket'))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lunas':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={11} strokeWidth={1.5} />
            <span>Lunas</span>
          </span>
        )
      case 'sudah_checkin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <CheckCircle2 size={11} strokeWidth={1.5} />
            <span>Sudah Check-in</span>
          </span>
        )
      case 'dibatalkan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle size={11} strokeWidth={1.5} />
            <span>Dibatalkan</span>
          </span>
        )
      case 'menunggu_pembayaran':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock3 size={11} strokeWidth={1.5} />
            <span>Menunggu Bayar</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-white uppercase tracking-wider flex items-center gap-2.5">
            <Receipt size={24} strokeWidth={1.5} className="text-gold" />
            <span>Pembayaran & Pesanan Tiket</span>
          </h1>
          <p className="text-white/50 text-xs mt-1">
            Kelola transaksi tiket, konfirmasi transfer bank, dan proses check-in stadion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setCheckinSuccessData(null)
              setScanInput('')
              setCheckinModalOpen(true)
            }}
            className="px-4 py-2.5 bg-emerald-500 text-dark font-heading font-black uppercase tracking-wider text-xs rounded-xl hover:bg-emerald-400 flex items-center gap-1.5 transition-all shadow-md"
          >
            <Scan size={16} strokeWidth={1.5} />
            <span>Scan / Check-in Tiket</span>
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

      {/* Filter Bar */}
      <div className="bg-dark p-4 rounded-2xl border border-gold/20 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Cari kode tiket, nama, anggota..."
            className="w-full bg-[#060a08] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white placeholder-white/30 text-xs focus:outline-none focus:border-gold transition-colors"
          />
          <Search size={15} strokeWidth={1.5} className="absolute left-3 top-2.5 text-white/40" />
        </div>

        {/* Filter Pertandingan */}
        <div>
          <select
            value={matchFilter}
            onChange={e => {
              setMatchFilter(e.target.value)
              setPage(1)
            }}
            className="w-full bg-[#060a08] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
          >
            <option value="">Semua Pertandingan</option>
            {matches.map((m: Match) => (
              <option key={m.id} value={m.id}>
                PSS vs {m.opponent_name} ({m.match_date})
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="w-full bg-[#060a08] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
          >
            <option value="">Semua Status</option>
            <option value="menunggu_pembayaran">Menunggu Pembayaran</option>
            <option value="lunas">Lunas</option>
            <option value="sudah_checkin">Sudah Check-in</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-dark rounded-2xl border border-gold/20 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a08] text-white/50 border-b border-white/10 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Kode Tiket</th>
                <th className="py-3.5 px-4">Pemesan</th>
                <th className="py-3.5 px-4">Pertandingan</th>
                <th className="py-3.5 px-4">Kategori & Harga</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Waktu Beli</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-white/40 italic">
                    Tidak ada transaksi tiket yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                tickets.map((t: TicketPurchase) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gold">
                      {t.ticket_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{t.full_name}</div>
                      <div className="text-[11px] text-gold font-mono">{t.member_code} • {t.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">PSS vs {t.opponent_name}</div>
                      <div className="text-[11px] text-white/40">{t.match_date} • {t.stadium}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{t.category_name}</div>
                      <div className="font-mono text-gold font-bold">
                        Rp {Number(t.price).toLocaleString('id-ID')}
                      </div>
                      {t.unique_code ? (
                        <div className="text-[10px] text-white/50">
                          Total: <strong className="text-white">Rp {Number(t.total_price || t.price).toLocaleString('id-ID')}</strong> (+{t.unique_code})
                        </div>
                      ) : null}
                      {t.payment_proof_url ? (
                        <button
                          type="button"
                          onClick={() => handleOpenProof(t)}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                        >
                          Lihat Bukti Transfer
                        </button>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="py-3.5 px-4 text-white/40 text-[11px]">
                      {new Date(t.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenStatusModal(t)}
                        className="px-2.5 py-1 rounded-lg border border-gold/40 text-gold hover:bg-gold hover:text-dark font-semibold text-[11px] transition-all"
                      >
                        Ubah Status
                      </button>
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
              Total: {total} transaksi (Halaman {page} dari {totalPages})
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

      {/* CHECK-IN TIKET MODAL */}
      <Modal
        isOpen={checkinModalOpen}
        onClose={() => setCheckinModalOpen(false)}
        title="Check-in Tiket Suporter (Pintu Masuk)"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <form onSubmit={handleCheckinSubmit} className="space-y-3">
            <div>
              <label className="block text-white/80 font-semibold uppercase mb-1">
                Pilih Pertandingan Pintu Masuk
              </label>
              <select
                value={checkinMatchId}
                onChange={e => setCheckinMatchId(e.target.value)}
                className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
              >
                <option value="">Semua Pertandingan (Cek Otomatis Tanggal Laga)</option>
                {matches.map((m: Match) => (
                  <option key={m.id} value={m.id}>
                    PSS vs {m.opponent_name} ({m.match_date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/80 font-semibold uppercase mb-1">
                Scan QR Code / Masukkan Kode Tiket
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  required
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="Contoh: COMPASS|TCK-... atau TCK-..."
                  className="w-full bg-[#060a08] border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:border-gold"
                />
                <Scan size={16} strokeWidth={1.5} className="absolute left-3 top-3 text-white/40" />
              </div>
            </div>

            <button
              type="submit"
              disabled={checkinMutation.isPending || !scanInput.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-dark font-heading font-black uppercase tracking-wider text-xs hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {checkinMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Memverifikasi Tiket...</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={1.5} />
                  <span>Validasi & Check-in</span>
                </>
              )}
            </button>
          </form>

          {/* Result Alert */}
          {checkinSuccessData && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-4 text-white space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>TIKET VALID & BERHASIL CHECK-IN!</span>
              </div>
              <div className="text-xs space-y-1 text-white/80">
                <div>Nama Suporter: <strong className="text-white">{checkinSuccessData.full_name}</strong></div>
                <div>Kode Anggota: <strong className="text-gold font-mono">{checkinSuccessData.member_code}</strong></div>
                <div>Laga: <strong>PSS Sleman vs {checkinSuccessData.opponent_name}</strong></div>
                <div>Tribun / Kategori: <strong className="text-emerald-400">{checkinSuccessData.category_name}</strong></div>
                <div>Kode Tiket: <span className="font-mono text-white/70">{checkinSuccessData.ticket_code}</span></div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* UPDATE STATUS MODAL (DENGAN STRICT STATE MACHINE) */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Ubah Status: ${selectedTicket?.ticket_code}`}
        size="md"
      >
        <form onSubmit={handleSubmitStatus} className="space-y-4 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
            <div className="text-white font-semibold">{selectedTicket?.full_name} ({selectedTicket?.member_code})</div>
            <div className="text-white/60">Laga: PSS vs {selectedTicket?.opponent_name}</div>
            <div className="text-gold font-bold">Kategori: {selectedTicket?.category_name} - Rp {Number(selectedTicket?.price || 0).toLocaleString('id-ID')}</div>
            <div className="text-white/70">Status saat ini: <strong className="uppercase text-gold">{selectedTicket?.status}</strong></div>
          </div>

          {selectedTicket?.status === 'sudah_checkin' || selectedTicket?.status === 'dibatalkan' ? (
            <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 text-red-300">
              Tiket ini berstatus <strong>{selectedTicket?.status}</strong> (final) dan tidak dapat diubah kembali demi menjaga integritas kuota dan pintu gerbang.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-white/80 font-semibold uppercase mb-1">
                  Pilih Status Tiket <span className="text-gold">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-gold"
                >
                  {selectedTicket?.status === 'menunggu_pembayaran' && (
                    <>
                      <option value="lunas">Lunas (Konfirmasi Pembayaran Diterima)</option>
                      <option value="dibatalkan">Dibatalkan (Kembalikan Kuota)</option>
                    </>
                  )}
                  {selectedTicket?.status === 'lunas' && (
                    <>
                      <option value="sudah_checkin">Sudah Check-in</option>
                      <option value="dibatalkan">Dibatalkan / Refund (Kembalikan Kuota)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-white/80 font-semibold uppercase mb-1">
                  Catatan Admin (Bukti Transfer / Alasan)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Contoh: Transfer BCA telah diverifikasi"
                  className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="w-2/3 py-2.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {updateStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Status'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* MODAL PREVIEW BUKTI TRANSFER (Bug 4: Ambil via auth endpoint dan render Blob) */}
      <Modal
        isOpen={proofModalOpen}
        onClose={handleCloseProof}
        title="Bukti Pembayaran / Transfer"
        size="md"
      >
        <div className="text-center p-2">
          {proofLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <LoadingSpinner size="md" />
              <span className="text-xs text-white/50">Memuat gambar bukti transfer dari server aman...</span>
            </div>
          ) : proofBlobUrl ? (
            <img
              src={proofBlobUrl}
              alt="Bukti Transfer"
              className="max-h-[70vh] mx-auto rounded-xl object-contain border border-white/10 shadow-lg"
            />
          ) : (
            <p className="text-white/40 py-8 italic">Tidak ada gambar bukti transfer atau gagal dimuat.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
