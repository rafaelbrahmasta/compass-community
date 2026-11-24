import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import {
  Ticket,
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  XCircle,
  Copy,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import Modal from '../../components/common/Modal'
import Reveal from '../../components/common/Reveal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { checkTicket, uploadTicketPaymentProof } from '../../services/endpoints'
import type { TicketPurchase } from '../../types'

export default function CekTiket() {
  const [searchMode, setSearchMode] = useState<'code' | 'member'>('code')
  const [ticketCode, setTicketCode] = useState('')
  const [memberCode, setMemberCode] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<TicketPurchase[] | null>(null)
  const [bankInfo, setBankInfo] = useState<any | null>(null)
  const [searched, setSearched] = useState(false)

  // Upload Proof State
  const [uploadProofModalOpen, setUploadProofModalOpen] = useState(false)
  const [targetTicket, setTargetTicket] = useState<TicketPurchase | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSearched(true)

    try {
      const params =
        searchMode === 'code'
          ? { ticket_code: ticketCode.trim().toUpperCase(), phone: phone.trim() }
          : { member_code: memberCode.trim().toUpperCase(), phone: phone.trim() }

      const res = await checkTicket(params)
      const resData = res.data.data
      const list = Array.isArray(resData) ? resData : (resData?.tickets || [])
      setTickets(list)
      if (resData?.bank_info) setBankInfo(resData.bank_info)
      toast.success('Data tiket berhasil ditemukan!')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setTickets([])
      toast.error(error.response?.data?.message || 'Tiket tidak ditemukan. Periksa kembali data Anda.')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetTicket || !proofFile) return

    setUploading(true)
    try {
      const form = new FormData()
      form.append('ticket_code', targetTicket.ticket_code)
      form.append('phone', phone.trim())
      form.append('file', proofFile)

      const res = await uploadTicketPaymentProof(form)
      toast.success(res.data.message || 'Bukti pembayaran berhasil diunggah!')
      setUploadProofModalOpen(false)
      setProofFile(null)

      // Refresh tiket
      if (ticketCode || memberCode) {
        const params = searchMode === 'code'
          ? { ticket_code: ticketCode.trim().toUpperCase(), phone: phone.trim() }
          : { member_code: memberCode.trim().toUpperCase(), phone: phone.trim() }
        const r = await checkTicket(params)
        const d = r.data.data
        setTickets(Array.isArray(d) ? d : (d?.tickets || []))
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah bukti pembayaran')
    } finally {
      setUploading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} disalin ke clipboard!`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lunas':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={13} strokeWidth={1.5} />
            <span>Lunas (Siap Check-in)</span>
          </span>
        )
      case 'sudah_checkin':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <CheckCircle2 size={13} strokeWidth={1.5} />
            <span>Sudah Digunakan (Check-in)</span>
          </span>
        )
      case 'dibatalkan':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle size={13} strokeWidth={1.5} />
            <span>Dibatalkan / Kedaluwarsa</span>
          </span>
        )
      case 'menunggu_pembayaran':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock3 size={13} strokeWidth={1.5} />
            <span>Menunggu Pembayaran</span>
          </span>
        )
    }
  }

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Back Link & Header */}
        <Reveal variant="fade-up">
          <Link
            to="/tiket"
            className="inline-flex items-center gap-2 text-white/60 hover:text-gold text-sm font-semibold mb-4 transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Kembali ke Halaman Tiket</span>
          </Link>

          <div className="text-center max-w-2xl mx-auto">
            <span className="text-gold font-heading font-semibold tracking-widest uppercase text-xs">
              Layanan Mandiri Suporter
            </span>
            <h1 className="text-3xl md:text-4xl font-heading font-black text-white uppercase mt-2 tracking-wide">
              CEK <span className="text-gold">TIKET SAYA</span>
            </h1>
            <div className="w-16 h-1 bg-gold mx-auto mt-3 rounded-full" />
            <p className="mt-3 text-white/70 text-sm leading-relaxed">
              Lihat status pembayaran, rincian tiket, dan QR Code resmi untuk ditunjukkan kepada petugas saat memasuki stadion.
            </p>
          </div>
        </Reveal>

        {/* Search Form Card */}
        <Reveal variant="scale-in" delay={100}>
          <div className="bg-[#0b120e] border border-gold/30 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/50">
            {/* Toggle Mode */}
            <div className="grid grid-cols-2 gap-2 bg-[#060a08] p-1.5 rounded-xl border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => setSearchMode('code')}
                className={`py-2 px-4 rounded-lg font-heading font-bold text-xs uppercase tracking-wider transition-all ${
                  searchMode === 'code'
                    ? 'bg-gold text-dark shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Cari Pakai Kode Tiket
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('member')}
                className={`py-2 px-4 rounded-lg font-heading font-bold text-xs uppercase tracking-wider transition-all ${
                  searchMode === 'member'
                    ? 'bg-gold text-dark shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Cari Pakai Data Anggota
              </button>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              {searchMode === 'code' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-xs font-semibold uppercase mb-1.5">
                      Kode Tiket <span className="text-gold">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={ticketCode}
                        onChange={e => setTicketCode(e.target.value.toUpperCase())}
                        placeholder="Contoh: TCK-20261120-XXXX"
                        className="w-full bg-[#060a08] border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm font-mono uppercase tracking-wider"
                      />
                      <Ticket
                        size={18}
                        strokeWidth={1.5}
                        className="absolute right-4 top-3.5 text-white/40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-white/80 text-xs font-semibold uppercase mb-1.5">
                      Nomor HP Terdaftar <span className="text-gold">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full bg-[#060a08] border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-xs font-semibold uppercase mb-1.5">
                      Kode Anggota <span className="text-gold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={memberCode}
                      onChange={e => setMemberCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: CMP-0001"
                      className="w-full bg-[#060a08] border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-xs font-semibold uppercase mb-1.5">
                      Nomor HP Terdaftar <span className="text-gold">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full bg-[#060a08] border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm font-mono"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-gold/20 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Mencari Tiket...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} strokeWidth={1.5} />
                    <span>Periksa Tiket</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </Reveal>

        {/* Results Area */}
        {searched && (
          <div className="space-y-6">
            {tickets && tickets.length > 0 ? (
              tickets.map((t, index) => (
                <Reveal key={t.id} variant="fade-up" delay={index * 100}>
                  <div className="bg-[#0b120e] border border-gold/30 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                    {/* Top status & code */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-6">
                      <div>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest block font-bold">
                          Kode Tiket Elektronik
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-black text-xl text-gold tracking-wide">
                            {t.ticket_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(t.ticket_code, 'Kode Tiket')}
                            className="text-white/60 hover:text-gold transition-colors p-1"
                            title="Salin Kode Tiket"
                          >
                            <Copy size={15} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>

                      <div>{getStatusBadge(t.status)}</div>
                    </div>

                    {/* Match & Ticket Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8">
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs text-gold font-semibold uppercase tracking-wider block mb-1">
                            {t.competition || 'BRI Liga 1'}
                          </span>
                          <h3 className="font-heading font-black text-2xl text-white uppercase tracking-wide">
                            PSS SLEMAN <span className="text-white/40 font-normal">vs</span>{' '}
                            <span className="text-gold">{t.opponent_name}</span>
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs bg-white/5 p-4 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2">
                            <Calendar size={15} strokeWidth={1.5} className="text-gold shrink-0" />
                            <span>{t.match_date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={15} strokeWidth={1.5} className="text-gold shrink-0" />
                            <span>{t.match_time ? t.match_time.slice(0, 5) : ''} WIB</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <MapPin size={15} strokeWidth={1.5} className="text-gold shrink-0" />
                            <span className="truncate">{t.stadium}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-white/40 block">Kategori Tribun:</span>
                            <span className="font-bold text-white text-sm">{t.category_name}</span>
                          </div>
                          <div>
                            <span className="text-white/40 block">Harga Dasar:</span>
                            <span className="font-bold text-gold text-sm font-mono">
                              Rp {Number(t.price).toLocaleString('id-ID')}
                            </span>
                          </div>
                          {t.unique_code ? (
                            <div className="col-span-2 bg-gold/10 border border-gold/30 rounded-xl p-3 flex items-center justify-between">
                              <div>
                                <span className="text-[11px] text-white/70 block">Kode Unik Transfer:</span>
                                <span className="font-mono font-bold text-gold text-xs">+{t.unique_code}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[11px] text-white/70 block">TOTAL TRANSFER:</span>
                                <span className="font-mono font-black text-white text-base">
                                  Rp {Number(t.total_price || t.price).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          ) : null}
                          <div>
                            <span className="text-white/40 block">Nama Anggota:</span>
                            <span className="font-semibold text-white">{t.full_name}</span>
                          </div>
                          <div>
                            <span className="text-white/40 block">Kode Anggota:</span>
                            <span className="font-semibold text-gold font-mono">{t.member_code}</span>
                          </div>
                        </div>

                        {t.status === 'menunggu_pembayaran' && (
                          <div className="space-y-3">
                            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-xs text-amber-300 space-y-1">
                              <div><strong>Penting:</strong> Harap transfer tepat hingga 3 digit terakhir untuk verifikasi cepat.</div>
                              {bankInfo && (
                                <div className="text-white/80 mt-1 font-mono">
                                  Bank: {bankInfo.bank_name} | No. Rekening: <strong>{bankInfo.account_number}</strong> (a/n {bankInfo.account_name})
                                </div>
                              )}
                            </div>

                            {t.payment_proof_url ? (
                              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-400">
                                <CheckCircle2 size={16} />
                                <span>Bukti transfer telah diunggah. Menunggu verifikasi admin.</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetTicket(t)
                                  setUploadProofModalOpen(true)
                                }}
                                className="w-full py-2.5 px-4 rounded-xl bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 font-heading font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all"
                              >
                                <Upload size={14} />
                                <span>Unggah Bukti Transfer</span>
                              </button>
                            )}
                          </div>
                        )}

                        {t.status === 'sudah_checkin' && (
                          <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-3 text-xs text-blue-300">
                            Tiket telah digunakan untuk check-in pada{' '}
                            {t.checked_in_at ? new Date(t.checked_in_at).toLocaleString('id-ID') : '-'}.
                          </div>
                        )}
                      </div>

                      {/* QR Code Section */}
                      <div className="flex flex-col items-center justify-center p-4 bg-[#060a08] border border-white/10 rounded-xl text-center">
                        {t.status === 'lunas' || t.status === 'sudah_checkin' ? (
                          <>
                            <div className="bg-white p-3 rounded-2xl shadow-lg shadow-black/80 inline-block mb-3">
                              <QRCodeSVG value={t.qr_payload} size={150} level="M" />
                            </div>
                            <span className="text-xs text-white/70 font-semibold flex items-center gap-1.5">
                              <QrCode size={14} className="text-gold" />
                              <span>Tunjukkan QR ini di Pintu Masuk</span>
                            </span>
                            <span className="text-[10px] text-white/40 mt-1">
                              Satu QR hanya berlaku 1 kali scan
                            </span>
                          </>
                        ) : (
                          <div className="p-6 text-center text-white/40 space-y-2">
                            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
                              <QrCode size={28} strokeWidth={1.5} />
                            </div>
                            <div className="text-xs font-semibold text-white/60">
                              QR Code Terkunci
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              QR Code untuk scan masuk stadion akan otomatis muncul di sini setelah pembayaran diverifikasi oleh admin.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))
            ) : (
              <Reveal variant="fade-up">
                <div className="bg-[#0b120e] border border-white/10 p-10 rounded-2xl text-center text-white/60">
                  <XCircle size={40} strokeWidth={1.5} className="mx-auto text-red-400 mb-3" />
                  <h4 className="font-heading font-bold text-lg text-white uppercase tracking-wide">
                    Tidak Ada Tiket Ditemukan
                  </h4>
                  <p className="text-sm mt-1 text-white/50">
                    Pastikan kode tiket atau nomor anggota dan HP yang Anda masukkan sudah benar.
                  </p>
                </div>
              </Reveal>
            )}
          </div>
        )}
        {/* MODAL UNGGAH BUKTI TRANSFER */}
        <Modal
          isOpen={uploadProofModalOpen}
          onClose={() => setUploadProofModalOpen(false)}
          title={`Unggah Bukti Transfer: ${targetTicket?.ticket_code}`}
          size="md"
        >
          <form onSubmit={handleUploadProof} className="space-y-4 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="text-white font-semibold">PSS Sleman vs {targetTicket?.opponent_name}</div>
              <div className="text-gold font-bold">
                Total Tagihan: Rp {Number(targetTicket?.total_price || targetTicket?.price || 0).toLocaleString('id-ID')}
              </div>
            </div>

            <div>
              <label className="block text-white/80 font-semibold uppercase mb-1">
                Pilih Foto / Gambar Bukti Transfer (JPG, PNG, WebP max 5MB) <span className="text-gold">*</span>
              </label>
              <input
                type="file"
                required
                accept="image/jpeg,image/png,image/webp"
                onChange={e => setProofFile(e.target.files?.[0] || null)}
                className="w-full bg-[#060a08] border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gold file:text-dark file:font-bold hover:file:brightness-110"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setUploadProofModalOpen(false)}
                className="w-1/3 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={uploading || !proofFile}
                className="w-2/3 py-2.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {uploading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Unggah Bukti</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
