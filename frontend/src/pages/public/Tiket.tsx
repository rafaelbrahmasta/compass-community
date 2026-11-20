import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { getUpcomingMatches, getMatchTickets, createReminder } from '../../services/endpoints'
import type { Match, RemindBefore } from '../../types'

export default function Tiket() {
  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-matches-page'],
    queryFn: getUpcomingMatches,
  })

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [remindBefore, setRemindBefore] = useState<RemindBefore>('h_minus_1_day')
  const [submitting, setSubmitting] = useState(false)

  const matches = data?.data?.data || []

  const handleOpenReminder = (match: Match) => {
    setSelectedMatch(match)
    setModalOpen(true)
  }

  const handleSubmitReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMatch) return
    setSubmitting(true)

    try {
      await createReminder({
        match_id: selectedMatch.id,
        email,
        whatsapp: whatsapp ? whatsapp : undefined,
        remind_before: remindBefore,
      })
      toast.success('Pengingat berhasil diaktifkan! Cek inbox email Anda mendekati laga.')
      setModalOpen(false)
      setEmail('')
      setWhatsapp('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Gagal mendaftarkan pengingat.')
    } finally {
      setSubmitting(false)
    }
  }

  // Generate file .ics untuk Google/Apple Calendar
  const handleAddToCalendar = (match: Match) => {
    const title = `PSS Sleman vs ${match.opponent_name}`
    const desc = `Dukung PSS Sleman di ${match.stadium} (${match.competition})`
    const loc = match.stadium

    // Format YYYYMMDDTHHMMSSZ
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
    toast.success('File kalender (.ics) berhasil diunduh!')
  }

  return (
    <div className="py-12 md:py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
            Tribun Maguwoharjo
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
            TIKET <span className="text-gold">PERTANDINGAN</span>
          </h1>
          <div className="gold-divider mx-auto mt-4" />
          <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
            Pemesanan tiket resmi pertandingan PSS Sleman untuk 4 hari ke depan. Pesan lebih awal sebelum kuota habis!
          </p>
        </div>

        {/* Match Cards */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : matches.length === 0 ? (
          /* Empty State yang ramah */
          <div className="card-dark p-12 text-center max-w-xl mx-auto rounded-2xl border-white/10">
            <div className="w-20 h-20 bg-primary/30 border border-gold/30 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
              ⚽
            </div>
            <h3 className="font-heading font-bold text-2xl text-white uppercase tracking-wide">
              Belum Ada Pertandingan Dalam 4 Hari Ke Depan
            </h3>
            <p className="text-white/60 text-sm mt-3 leading-relaxed">
              Penjualan tiket dibuka H-4 sebelum hari pertandingan. Pantau jadwal lengkap satu musim penuh di menu Jadwal.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <a href="/jadwal" className="btn-gold rounded text-sm px-6 py-2.5">
                Lihat Jadwal Lengkap
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {matches.map(match => (
              <MatchTicketCard
                key={match.id}
                match={match}
                onRemind={() => handleOpenReminder(match)}
                onCalendar={() => handleAddToCalendar(match)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reminder Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Ingatkan Saya: PSS vs ${selectedMatch?.opponent_name}`}
        size="md"
      >
        <form onSubmit={handleSubmitReminder} className="space-y-4">
          <p className="text-white/70 text-sm">
            Kami akan mengirimkan notifikasi otomatis ke email Anda sebelum pertandingan dimulai agar tidak ketinggalan tiket & laga.
          </p>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1.5">
              Alamat Email <span className="text-gold">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-dark border border-white/20 rounded-lg px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1.5">
              Nomor WhatsApp (Opsional)
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="08123456789"
              className="w-full bg-dark border border-white/20 rounded-lg px-3.5 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1.5">
              Waktu Pengingat
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${remindBefore === 'h_minus_1_day' ? 'border-gold bg-primary/40 text-gold font-bold' : 'border-white/10 text-white/70 hover:bg-white/5'}`}>
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

              <label className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${remindBefore === 'h_minus_3_hours' ? 'border-gold bg-primary/40 text-gold font-bold' : 'border-white/10 text-white/70 hover:bg-white/5'}`}>
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

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-1/3 btn-outline-gold py-2.5 rounded-lg text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-2/3 btn-gold py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Pasang Pengingat'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function MatchTicketCard({
  match,
  onRemind,
  onCalendar,
}: {
  match: Match
  onRemind: () => void
  onCalendar: () => void
}) {
  const { data: ticketData } = useQuery({
    queryKey: ['match-tickets', match.id],
    queryFn: () => getMatchTickets(match.id),
  })

  const tickets = ticketData?.data?.data || []
  const formUrl = match.ticket_form_url || 'https://forms.google.com'

  return (
    <div className="card-dark p-6 sm:p-8 rounded-2xl border-gold/30 flex flex-col justify-between">
      <div>
        {/* Match Header Tag */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <span className="inline-block px-3 py-1 bg-gold/20 text-gold font-heading font-bold text-xs uppercase tracking-wider rounded">
            {match.competition}
          </span>
          <span className="text-xs text-white/60">
            {match.home_away === 'home' ? '🏠 KANDANG' : '✈️ TANDANG'}
          </span>
        </div>

        {/* Opponent Info */}
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="text-center sm:text-left flex-1">
            <div className="text-white/50 text-xs uppercase font-semibold">Tuan Rumah</div>
            <div className="font-heading font-black text-2xl text-white mt-1">PSS SLEMAN</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center font-heading font-bold text-gold text-sm shrink-0">
            VS
          </div>
          <div className="text-center sm:text-right flex-1">
            <div className="text-white/50 text-xs uppercase font-semibold">Tim Lawan</div>
            <div className="font-heading font-black text-2xl text-gold mt-1 uppercase">{match.opponent_name}</div>
          </div>
        </div>

        {/* Date, Time, Stadium */}
        <div className="mt-6 p-4 bg-white/5 rounded-xl grid grid-cols-3 gap-2 text-center border border-white/5">
          <div>
            <div className="text-white/40 text-xs uppercase">Tanggal</div>
            <div className="font-bold text-white text-sm mt-0.5">{match.match_date}</div>
          </div>
          <div>
            <div className="text-white/40 text-xs uppercase">Kickoff</div>
            <div className="font-bold text-gold text-sm mt-0.5">{match.match_time.slice(0, 5)} WIB</div>
          </div>
          <div>
            <div className="text-white/40 text-xs uppercase">Stadion</div>
            <div className="font-bold text-white text-sm mt-0.5 truncate">{match.stadium}</div>
          </div>
        </div>

        {/* Ticket Categories List */}
        <div className="mt-6 space-y-2.5">
          <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">
            Kategori Tiket Tersedia:
          </div>
          {tickets.length === 0 ? (
            <div className="text-white/40 text-xs italic">Kategori tiket sedang disiapkan panitia pelaksana.</div>
          ) : (
            tickets.map(t => {
              const remaining = Math.max(0, t.quota - t.sold)
              return (
                <div key={t.id} className="flex items-center justify-between p-3 bg-dark/60 rounded-lg border border-white/5 text-sm">
                  <div>
                    <span className="font-semibold text-white">{t.name}</span>
                    <span className="text-xs text-white/40 ml-2">Sisa: {remaining}</span>
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

      {/* Action Buttons */}
      <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
        <a
          href={formUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full btn-gold rounded-lg py-3 flex items-center justify-center gap-2 font-bold shadow-lg text-center"
        >
          <span>Beli Tiket Sekarang</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onRemind}
            className="btn-outline-gold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5"
          >
            <span>🔔</span> Ingatkan Saya
          </button>
          <button
            onClick={onCalendar}
            className="border border-white/20 hover:border-white text-white/80 hover:text-white py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>📅</span> Tambah Kalender
          </button>
        </div>
      </div>
    </div>
  )
}
