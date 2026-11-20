import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Bell,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Reveal from '../../components/common/Reveal'
import {
  getUpcomingMatches,
  getMatchTickets,
  createReminder,
  buyTicket,
} from '../../services/endpoints'
import type { Match, RemindBefore, TicketCategory, BuyTicketResult } from '../../types'

export default function Tiket() {
  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-matches-page'],
    queryFn: getUpcomingMatches,
  })

  // State Reminder
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [remindBefore, setRemindBefore] = useState<RemindBefore>('h_minus_1_day')
  const [submittingReminder, setSubmittingReminder] = useState(false)

  // State Checkout Beli Tiket Langsung (Revisi 6)
  const [checkoutMatch, setCheckoutMatch] = useState<Match | null>(null)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [memberCode, setMemberCode] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submittingCheckout, setSubmittingCheckout] = useState(false)
  const [purchaseResult, setPurchaseResult] = useState<BuyTicketResult | null>(null)

  const matches = data?.data?.data || []

  const handleOpenReminder = (match: Match) => {
    setSelectedMatch(match)
    setReminderModalOpen(true)
  }

  const handleOpenCheckout = (match: Match) => {
    setCheckoutMatch(match)
    setSelectedCategoryId('')
    setMemberCode('')
    setPhone('')
    setNotes('')
    setPurchaseResult(null)
    setCheckoutModalOpen(true)
  }

  const handleSubmitReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMatch) return
    setSubmittingReminder(true)

    try {
      await createReminder({
        match_id: selectedMatch.id,
        email,
        whatsapp: whatsapp ? whatsapp : undefined,
        remind_before: remindBefore,
      })
      toast.success('Pengingat berhasil diaktifkan! Cek inbox email Anda.')
      setReminderModalOpen(false)
      setEmail('')
      setWhatsapp('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Gagal mendaftarkan pengingat.')
    } finally {
      setSubmittingReminder(false)
    }
  }

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkoutMatch) return
    if (!selectedCategoryId) {
      toast.error('Silakan pilih kategori tiket yang diinginkan.')
      return
    }

    setSubmittingCheckout(true)
    try {
      const res = await buyTicket({
        match_id: checkoutMatch.id,
        category_id: selectedCategoryId,
        member_code: memberCode,
        phone,
        notes: notes ? notes : undefined,
      })
      setPurchaseResult(res.data.data)
      toast.success('Pesanan tiket berhasil dibuat!')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Gagal memesan tiket.')
    } finally {
      setSubmittingCheckout(false)
    }
  }

  const handleAddToCalendar = (match: Match) => {
    const title = `PSS Sleman vs ${match.opponent_name}`
    const desc = `Dukung PSS Sleman di ${match.stadium} (${match.competition})`
    const loc = match.stadium

    const cleanDate = match.match_date.replace(/-/g, '')
    const cleanTime = match.match_time.replace(/:/g, '')
    const start = `${cleanDate}T${cleanTime}00`

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//COMPASS PSS Sleman//ID',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${loc}`,
      `DTSTART:${start}`,
      `DTEND:${start}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', `PSS_vs_${match.opponent_name.replace(/\s+/g, '_')}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Jadwal kalender (.ics) berhasil diunduh!')
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} disalin ke clipboard!`)
  }

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Section */}
        <Reveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
              Tiket Resmi Laga PSS Sleman
            </span>
            <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
              TIKET <span className="text-gold">PERTANDINGAN</span>
            </h1>
            <div className="w-20 h-1 bg-gold mx-auto mt-4 rounded-full" />
            <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
              Pembelian tiket resmi langsung di website COMPASS untuk anggota terdaftar (H-4 sebelum laga).
            </p>
            <div className="mt-6 flex justify-center items-center gap-3">
              <Link
                to="/tiket/cek"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gold/40 text-gold bg-primary/20 hover:bg-gold hover:text-dark font-heading font-bold uppercase tracking-wider text-sm transition-all duration-300"
              >
                <Search size={16} strokeWidth={1.5} />
                <span>Cek Tiket Saya</span>
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Match Cards */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : matches.length === 0 ? (
          <Reveal variant="scale-in">
            <div className="bg-[#0b120e] border border-gold/20 p-12 text-center max-w-xl mx-auto rounded-2xl shadow-xl">
              <div className="w-16 h-16 bg-primary/40 border border-gold/40 rounded-full flex items-center justify-center text-gold mx-auto mb-4">
                <Ticket size={32} strokeWidth={1.5} />
              </div>
              <h3 className="font-heading font-bold text-2xl text-white uppercase tracking-wide">
                Belum Ada Pertandingan Dalam 4 Hari Ke Depan
              </h3>
              <p className="text-white/60 text-sm mt-3 leading-relaxed">
                Penjualan tiket dibuka H-4 sebelum kickoff pertandingan. Pantau jadwal lengkap satu musim penuh di menu Jadwal.
              </p>
              <div className="mt-6">
                <Link
                  to="/jadwal"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold text-dark font-heading font-bold uppercase tracking-wider rounded-lg text-sm hover:brightness-110 transition-all"
                >
                  <Calendar size={16} strokeWidth={1.5} />
                  <span>Lihat Jadwal Lengkap</span>
                </Link>
              </div>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {matches.map((match, idx) => (
              <Reveal key={match.id} variant="fade-up" delay={idx * 150}>
                <MatchTicketCard
                  match={match}
                  onBuy={() => handleOpenCheckout(match)}
                  onRemind={() => handleOpenReminder(match)}
                  onCalendar={() => handleAddToCalendar(match)}
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* CHECKOUT MODAL PEMBELIAN TIKET LANGSUNG */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        title={purchaseResult ? 'Tiket Berhasil Dipesan!' : `Beli Tiket: PSS vs ${checkoutMatch?.opponent_name}`}
        size="lg"
      >
        {!purchaseResult ? (
          <CheckoutForm
            match={checkoutMatch}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            memberCode={memberCode}
            setMemberCode={setMemberCode}
            phone={phone}
            setPhone={setPhone}
            notes={notes}
            setNotes={setNotes}
            submitting={submittingCheckout}
            onSubmit={handleSubmitCheckout}
            onCancel={() => setCheckoutModalOpen(false)}
          />
        ) : (
          <PurchaseSuccessView
            result={purchaseResult}
            onCopy={copyToClipboard}
            onClose={() => setCheckoutModalOpen(false)}
          />
        )}
      </Modal>

      {/* REMINDER MODAL FORM */}
      <Modal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title={`Ingatkan Saya: PSS vs ${selectedMatch?.opponent_name}`}
        size="md"
      >
        <form onSubmit={handleSubmitReminder} className="space-y-4">
          <p className="text-white/70 text-sm">
            Notifikasi email otomatis akan dikirim sebelum laga dimulai agar tidak ketinggalan tiket & kickoff.
          </p>

          <div>
            <label className="block text-white/80 text-xs font-semibold uppercase mb-1.5">
              Alamat Email <span className="text-gold">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-[#0a110d] border border-white/20 rounded-lg px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-white/80 text-xs font-semibold uppercase mb-1.5">
              Nomor WhatsApp (Opsional)
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="08123456789"
              className="w-full bg-[#0a110d] border border-white/20 rounded-lg px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-white/80 text-xs font-semibold uppercase mb-1.5">
              Waktu Pengingat
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`border rounded-xl p-3 text-center cursor-pointer transition-all ${
                  remindBefore === 'h_minus_1_day'
                    ? 'border-gold bg-primary/40 text-gold font-bold shadow-sm'
                    : 'border-white/10 text-white/70 hover:bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="remindBefore"
                  className="sr-only"
                  checked={remindBefore === 'h_minus_1_day'}
                  onChange={() => setRemindBefore('h_minus_1_day')}
                />
                <div className="text-sm">H-1 Hari</div>
                <div className="text-[10px] text-white/50 mt-0.5">24 jam sebelum laga</div>
              </label>

              <label
                className={`border rounded-xl p-3 text-center cursor-pointer transition-all ${
                  remindBefore === 'h_minus_3_hours'
                    ? 'border-gold bg-primary/40 text-gold font-bold shadow-sm'
                    : 'border-white/10 text-white/70 hover:bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="remindBefore"
                  className="sr-only"
                  checked={remindBefore === 'h_minus_3_hours'}
                  onChange={() => setRemindBefore('h_minus_3_hours')}
                />
                <div className="text-sm">H-3 Jam</div>
                <div className="text-[10px] text-white/50 mt-0.5">3 jam sebelum kickoff</div>
              </label>
            </div>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setReminderModalOpen(false)}
              className="w-1/3 py-2.5 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submittingReminder}
              className="w-2/3 py-2.5 rounded-lg bg-gold text-dark font-heading font-bold uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {submittingReminder ? 'Menyimpan...' : 'Pasang Pengingat'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function MatchTicketCard({
  match,
  onBuy,
  onRemind,
  onCalendar,
}: {
  match: Match
  onBuy: () => void
  onRemind: () => void
  onCalendar: () => void
}) {
  const { data: ticketData } = useQuery({
    queryKey: ['match-tickets', match.id],
    queryFn: () => getMatchTickets(match.id),
  })

  const tickets = ticketData?.data?.data || []

  return (
    <div className="bg-[#0b120e] p-6 sm:p-8 rounded-2xl border border-gold/30 flex flex-col justify-between hover:border-gold/60 transition-all duration-300 shadow-xl shadow-black/40">
      <div>
        {/* Match Header Tag */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold/15 text-gold font-heading font-bold text-xs uppercase tracking-wider rounded-md border border-gold/30">
            {match.competition}
          </span>
          <span className="text-xs text-white/60 font-semibold tracking-wide">
            {match.home_away === 'home' ? 'KANDANG (HOME)' : 'TANDANG (AWAY)'}
          </span>
        </div>

        {/* Opponent Info */}
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="text-center sm:text-left flex-1">
            <div className="text-white/40 text-[11px] uppercase tracking-wider font-semibold">Tuan Rumah</div>
            <div className="font-heading font-black text-2xl text-white mt-1 tracking-wide">PSS SLEMAN</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center font-heading font-bold text-gold text-sm shrink-0">
            VS
          </div>
          <div className="text-center sm:text-right flex-1">
            <div className="text-white/40 text-[11px] uppercase tracking-wider font-semibold">Tim Tamu</div>
            <div className="font-heading font-black text-2xl text-gold mt-1 uppercase tracking-wide truncate">
              {match.opponent_name}
            </div>
          </div>
        </div>

        {/* Date, Time, Stadium */}
        <div className="mt-6 p-4 bg-white/5 rounded-xl grid grid-cols-3 gap-2 text-center border border-white/5 text-sm">
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1">
              <Calendar size={12} strokeWidth={1.5} />
              <span>Tanggal</span>
            </div>
            <div className="font-bold text-white text-xs sm:text-sm mt-1">{match.match_date}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              <span>Kickoff</span>
            </div>
            <div className="font-bold text-gold text-xs sm:text-sm mt-1">{match.match_time.slice(0, 5)} WIB</div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1">
              <MapPin size={12} strokeWidth={1.5} />
              <span>Stadion</span>
            </div>
            <div className="font-bold text-white text-xs sm:text-sm mt-1 truncate">{match.stadium}</div>
          </div>
        </div>

        {/* Ticket Categories List */}
        <div className="mt-6 space-y-2.5">
          <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Ticket size={14} strokeWidth={1.5} className="text-gold" />
            <span>Kategori Tiket & Kuota:</span>
          </div>
          {tickets.length === 0 ? (
            <div className="text-white/40 text-xs italic bg-black/30 p-3 rounded-lg border border-white/5">
              Kategori tiket sedang disiapkan panitia pelaksana pertandingan.
            </div>
          ) : (
            tickets.map(t => {
              const remaining = Math.max(0, t.quota - t.sold)
              const isSoldOut = remaining === 0
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                    isSoldOut
                      ? 'bg-red-950/20 border-red-500/20 opacity-60'
                      : 'bg-[#060a08] border-white/10 hover:border-gold/30'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-white">{t.name}</span>
                    <span className={`text-xs ml-2.5 font-medium ${isSoldOut ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isSoldOut ? 'HABIS' : `Tersisa: ${remaining}`}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-gold">
                    Rp {Number(t.price).toLocaleString('id-ID')}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Action Buttons: Direct Purchase (No Google Form) */}
      <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
        <button
          onClick={onBuy}
          className="w-full py-3.5 px-6 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-base hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-gold/15 transition-all duration-300"
        >
          <Ticket size={18} strokeWidth={1.5} />
          <span>Beli Tiket Sekarang</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onRemind}
            className="py-2.5 px-3 rounded-lg border border-gold/40 text-gold hover:bg-gold hover:text-dark text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Bell size={14} strokeWidth={1.5} />
            <span>Ingatkan Saya</span>
          </button>
          <button
            onClick={onCalendar}
            className="py-2.5 px-3 rounded-lg border border-white/20 hover:border-white text-white/80 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Calendar size={14} strokeWidth={1.5} />
            <span>Tambah Kalender</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckoutForm({
  match,
  selectedCategoryId,
  setSelectedCategoryId,
  memberCode,
  setMemberCode,
  phone,
  setPhone,
  notes,
  setNotes,
  submitting,
  onSubmit,
  onCancel,
}: {
  match: Match | null
  selectedCategoryId: string
  setSelectedCategoryId: (id: string) => void
  memberCode: string
  setMemberCode: (code: string) => void
  phone: string
  setPhone: (p: string) => void
  notes: string
  setNotes: (n: string) => void
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  const { data: ticketData } = useQuery({
    queryKey: ['match-tickets', match?.id],
    queryFn: () => getMatchTickets(match?.id || ''),
    enabled: !!match?.id,
  })

  const tickets = ticketData?.data?.data || []

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="bg-primary/20 border border-gold/30 rounded-xl p-3.5 text-xs text-white/80 space-y-1">
        <div className="flex items-center gap-1.5 text-gold font-bold">
          <ShieldCheck size={16} strokeWidth={1.5} />
          <span>Syarat Pembelian Tiket COMPASS</span>
        </div>
        <p className="leading-relaxed">
          Khusus anggota resmi COMPASS yang aktif. 1 anggota maksimal 1 tiket per laga. Masukkan Kode Anggota dan Nomor HP yang terdaftar untuk verifikasi.
        </p>
      </div>

      {/* Pilih Kategori */}
      <div>
        <label className="block text-white/80 text-xs font-semibold uppercase mb-2">
          Pilih Kategori Tiket <span className="text-gold">*</span>
        </label>
        <div className="space-y-2">
          {tickets.map((t: TicketCategory) => {
            const remaining = Math.max(0, t.quota - t.sold)
            const isSoldOut = remaining === 0
            const isSelected = selectedCategoryId === t.id
            return (
              <label
                key={t.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSoldOut
                    ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/5'
                    : isSelected
                    ? 'border-gold bg-primary/40 shadow-sm'
                    : 'border-white/10 hover:border-gold/40 bg-[#09100c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="ticketCategory"
                    disabled={isSoldOut}
                    checked={isSelected}
                    onChange={() => setSelectedCategoryId(t.id)}
                    className="accent-gold"
                  />
                  <div>
                    <span className="font-semibold text-white text-sm block">{t.name}</span>
                    <span className={`text-[11px] ${isSoldOut ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                      {isSoldOut ? 'Habis' : `Tersisa: ${remaining} tiket`}
                    </span>
                  </div>
                </div>
                <div className="font-mono font-bold text-gold text-sm">
                  Rp {Number(t.price).toLocaleString('id-ID')}
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Input Identitas Anggota */}
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
            className="w-full bg-[#0a110d] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm uppercase font-mono"
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
            className="w-full bg-[#0a110d] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-white/80 text-xs font-semibold uppercase mb-1.5">
          Catatan Tambahan (Opsional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Catatan jika ada..."
          className="w-full bg-[#0a110d] border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm"
        />
      </div>

      <div className="pt-2 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-1/3 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/5 text-sm transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting || !selectedCategoryId}
          className="w-2/3 py-2.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Memproses Pesanan...</span>
            </>
          ) : (
            <>
              <Ticket size={16} strokeWidth={1.5} />
              <span>Konfirmasi Pesanan</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}

function PurchaseSuccessView({
  result,
  onCopy,
  onClose,
}: {
  result: BuyTicketResult
  onCopy: (t: string, l: string) => void
  onClose: () => void
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
        <CheckCircle2 size={36} strokeWidth={1.5} />
      </div>

      <div>
        <h3 className="font-heading font-black text-2xl text-white uppercase tracking-wider">
          Pesanan Berhasil Dibuat!
        </h3>
        <p className="text-white/60 text-xs mt-1">
          Segera lakukan transfer sebelum batas waktu pembayaran berakhir (24 jam).
        </p>
      </div>

      {/* Ticket Brief Card */}
      <div className="bg-[#060a08] border border-gold/30 rounded-2xl p-5 text-left space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Kode Tiket</div>
            <div className="font-mono font-black text-lg text-gold flex items-center gap-2">
              <span>{result.ticket_code}</span>
              <button
                type="button"
                onClick={() => onCopy(result.ticket_code, 'Kode Tiket')}
                className="text-white/60 hover:text-gold transition-colors p-1"
                title="Salin Kode Tiket"
              >
                <Copy size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Status</div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Menunggu Pembayaran
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-white/40 block">Laga:</span>
            <span className="font-semibold text-white">PSS Sleman vs {result.match_info.opponent_name}</span>
          </div>
          <div>
            <span className="text-white/40 block">Kategori & Harga:</span>
            <span className="font-semibold text-gold">
              {result.category_name} (Rp {Number(result.price).toLocaleString('id-ID')})
            </span>
          </div>
          <div>
            <span className="text-white/40 block">Pemilik Tiket:</span>
            <span className="font-semibold text-white">{result.member.full_name} ({result.member.member_code})</span>
          </div>
          <div>
            <span className="text-white/40 block">Batas Waktu Bayar:</span>
            <span className="font-semibold text-red-400">
              {new Date(result.expires_at).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* QR Code Preview */}
        <div className="pt-3 border-t border-white/10 flex flex-col items-center">
          <div className="text-[11px] text-white/50 mb-2">QR Code Tiket (Aktif setelah Lunas):</div>
          <div className="bg-white p-2.5 rounded-xl shadow-md inline-block">
            <QRCodeSVG value={result.qr_payload} size={130} />
          </div>
        </div>
      </div>

      {/* Instruksi Pembayaran */}
      <div className="bg-primary/20 border border-gold/30 rounded-2xl p-4 text-left text-xs space-y-2">
        <div className="text-gold font-bold uppercase tracking-wider flex items-center gap-1.5">
          <AlertCircle size={15} strokeWidth={1.5} />
          <span>Petunjuk Transfer Bank</span>
        </div>
        <div className="text-white/80 space-y-1">
          <div>Bank: <strong className="text-white">{result.bank_info.bank_name}</strong></div>
          <div>
            Nomor Rekening:{' '}
            <strong className="text-gold font-mono text-sm">{result.bank_info.account_number}</strong>
            <button
              type="button"
              onClick={() => onCopy(result.bank_info.account_number, 'Nomor Rekening')}
              className="ml-2 text-white/60 hover:text-gold"
            >
              <Copy size={12} className="inline" />
            </button>
          </div>
          <div>Atas Nama: <strong className="text-white">{result.bank_info.account_name}</strong></div>
          <div>Jumlah Transfer: <strong className="text-gold font-mono text-sm">Rp {Number(result.price).toLocaleString('id-ID')}</strong></div>
          <p className="text-white/50 text-[11px] pt-1">
            * Sertakan kode tiket <strong className="text-gold font-mono">{result.ticket_code}</strong> pada berita transfer. Admin akan memverifikasi dalam waktu 1x24 jam.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          to="/tiket/cek"
          className="w-1/2 py-2.5 rounded-xl border border-gold/40 text-gold hover:bg-gold hover:text-dark font-heading font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <Search size={14} strokeWidth={1.5} />
          <span>Cek Status Tiket</span>
        </Link>
        <button
          onClick={onClose}
          className="w-1/2 py-2.5 rounded-xl bg-gold text-dark font-heading font-bold uppercase tracking-wider text-xs hover:brightness-110 transition-all"
        >
          Selesai
        </button>
      </div>
    </div>
  )
}
