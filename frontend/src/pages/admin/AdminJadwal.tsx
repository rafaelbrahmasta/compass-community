import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetMatches,
  adminCreateMatch,
  adminUpdateMatch,
  adminDeleteMatch,
  adminImportMatchesCsv,
} from '../../services/endpoints'
import type { Match, MatchStatus, HomeAway } from '../../types'

export default function AdminJadwal() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-matches'], queryFn: adminGetMatches })
  const matches = data?.data?.data || []

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)

  // Form State
  const [opponentName, setOpponentName] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [matchTime, setMatchTime] = useState('')
  const [stadium, setStadium] = useState('Stadion Maguwoharjo')
  const [homeAway, setHomeAway] = useState<HomeAway>('home')
  const [competition, setCompetition] = useState('BRI Liga 1')
  const [status, setStatus] = useState<MatchStatus>('upcoming')
  const [ticketFormUrl, setTicketFormUrl] = useState('')
  const [homeScore, setHomeScore] = useState<number | ''>('')
  const [awayScore, setAwayScore] = useState<number | ''>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleOpenCreate = () => {
    setEditingMatch(null)
    setOpponentName('')
    setMatchDate('2027-01-01')
    setMatchTime('19:00')
    setStadium('Stadion Maguwoharjo')
    setHomeAway('home')
    setCompetition('BRI Liga 1')
    setStatus('upcoming')
    setTicketFormUrl('')
    setModalOpen(true)
  }

  const handleOpenEdit = (m: Match) => {
    setEditingMatch(m)
    setOpponentName(m.opponent_name)
    setMatchDate(m.match_date)
    setMatchTime(m.match_time.slice(0, 5))
    setStadium(m.stadium)
    setHomeAway(m.home_away)
    setCompetition(m.competition)
    setStatus(m.status)
    setTicketFormUrl(m.ticket_form_url || '')
    setModalOpen(true)
  }

  const handleOpenScore = (m: Match) => {
    setEditingMatch(m)
    setHomeScore(m.home_score !== null ? m.home_score : 0)
    setAwayScore(m.away_score !== null ? m.away_score : 0)
    setStatus('finished')
    setScoreModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingMatch) {
        await adminUpdateMatch(editingMatch.id, {
          opponent_name: opponentName,
          match_date: matchDate,
          match_time: matchTime.length === 5 ? `${matchTime}:00` : matchTime,
          stadium,
          home_away: homeAway,
          competition,
          status,
          ticket_form_url: ticketFormUrl || null,
        })
        toast.success('Jadwal pertandingan berhasil diperbarui!')
      } else {
        await adminCreateMatch({
          opponent_name: opponentName,
          match_date: matchDate,
          match_time: matchTime.length === 5 ? `${matchTime}:00` : matchTime,
          stadium,
          home_away: homeAway,
          competition,
          status,
          ticket_form_url: ticketFormUrl || null,
        })
        toast.success('Jadwal pertandingan baru ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-matches'] })
      queryClient.invalidateQueries({ queryKey: ['public-matches'] })
      queryClient.invalidateQueries({ queryKey: ['public-upcoming'] })
      setModalOpen(false)
    } catch {
      toast.error('Gagal menyimpan jadwal pertandingan.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMatch) return
    setSubmitting(true)
    try {
      await adminUpdateMatch(editingMatch.id, {
        home_score: Number(homeScore),
        away_score: Number(awayScore),
        status: 'finished',
      })
      toast.success('Skor akhir pertandingan berhasil dicatat!')
      queryClient.invalidateQueries({ queryKey: ['admin-matches'] })
      queryClient.invalidateQueries({ queryKey: ['public-matches'] })
      setScoreModalOpen(false)
    } catch {
      toast.error('Gagal menyimpan skor.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) return
    setSubmitting(true)
    try {
      const res = await adminImportMatchesCsv(csvFile)
      toast.success(`Berhasil mengimpor ${res.data.data.imported} jadwal pertandingan!`)
      queryClient.invalidateQueries({ queryKey: ['admin-matches'] })
      queryClient.invalidateQueries({ queryKey: ['public-matches'] })
      setCsvModalOpen(false)
      setCsvFile(null)
    } catch {
      toast.error('Gagal mengimpor CSV. Pastikan format kolom sesuai.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jadwal pertandingan ini?')) return
    try {
      await adminDeleteMatch(id)
      toast.success('Jadwal berhasil dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-matches'] })
      queryClient.invalidateQueries({ queryKey: ['public-matches'] })
    } catch {
      toast.error('Gagal menghapus jadwal.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
            Jadwal Pertandingan (2027)
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Kelola jadwal laga musim 2027, update skor akhir, atau impor berkas CSV.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="btn-outline-gold py-2 px-3 rounded-lg text-xs font-bold uppercase"
          >
            📥 Import CSV
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase"
          >
            + Tambah Laga
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : (
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-heading text-white">
                <tr>
                  <th className="p-4">Tanggal & Jam</th>
                  <th className="p-4">Lawan</th>
                  <th className="p-4">Tipe</th>
                  <th className="p-4">Stadion</th>
                  <th className="p-4">Status & Skor</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {matches.map(m => (
                  <tr key={m.id} className="hover:bg-white/5">
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-white">{m.match_date}</div>
                      <div className="text-xs text-gold font-mono">{m.match_time.slice(0, 5)} WIB</div>
                    </td>
                    <td className="p-4 font-heading font-bold text-base text-white">
                      PSS vs <span className="text-gold uppercase">{m.opponent_name}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${m.home_away === 'home' ? 'bg-primary text-gold' : 'bg-white/10 text-white/70'}`}>
                        {m.home_away === 'home' ? 'Kandang' : 'Tandang'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-white/70 max-w-xs truncate">
                      {m.stadium}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {m.status === 'finished' && m.home_score !== null && m.away_score !== null ? (
                        <span className="font-mono font-bold text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                          Selesai: {m.home_score} - {m.away_score}
                        </span>
                      ) : (
                        <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded">
                          Akan Datang
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenScore(m)}
                        className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded text-xs transition-colors"
                      >
                        Skor
                      </button>
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs transition-colors"
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

      {/* Modal Match Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMatch ? 'Edit Jadwal Pertandingan' : 'Tambah Pertandingan Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nama Klub Lawan</label>
            <input
              type="text"
              required
              value={opponentName}
              onChange={e => setOpponentName(e.target.value)}
              placeholder="Contoh: Persija Jakarta / Arema FC"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Tanggal Pertandingan</label>
              <input
                type="date"
                required
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Waktu Kickoff</label>
              <input
                type="time"
                required
                value={matchTime}
                onChange={e => setMatchTime(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Tipe Pertandingan</label>
              <select
                value={homeAway}
                onChange={e => setHomeAway(e.target.value as HomeAway)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              >
                <option value="home">Kandang (Home)</option>
                <option value="away">Tandang (Away)</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Kompetisi</label>
              <input
                type="text"
                required
                value={competition}
                onChange={e => setCompetition(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Stadion / Lokasi</label>
            <input
              type="text"
              required
              value={stadium}
              onChange={e => setStadium(e.target.value)}
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Link Google Form Pembelian Tiket</label>
            <input
              type="url"
              value={ticketFormUrl}
              onChange={e => setTicketFormUrl(e.target.value)}
              placeholder="https://forms.google.com/..."
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline-gold py-2 px-4 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-5 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Input Skor */}
      <Modal
        isOpen={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        title={`Input Skor Akhir: PSS vs ${editingMatch?.opponent_name}`}
        size="sm"
      >
        <form onSubmit={handleSaveScore} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <label className="block text-white/70 text-xs uppercase mb-1 font-bold">PSS Sleman</label>
              <input
                type="number"
                min="0"
                required
                value={homeScore}
                onChange={e => setHomeScore(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-center font-mono font-black text-2xl bg-dark border border-white/20 rounded-lg py-2 text-gold focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs uppercase mb-1 font-bold">{editingMatch?.opponent_name}</label>
              <input
                type="number"
                min="0"
                required
                value={awayScore}
                onChange={e => setAwayScore(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-center font-mono font-black text-2xl bg-dark border border-white/20 rounded-lg py-2 text-gold focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setScoreModalOpen(false)} className="btn-outline-gold py-2 px-3 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-4 rounded text-xs font-bold disabled:opacity-50">
              Simpan Skor
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Import CSV */}
      <Modal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        title="Impor Jadwal Pertandingan dari CSV"
        size="md"
      >
        <form onSubmit={handleImportCsv} className="space-y-4">
          <p className="text-white/70 text-xs leading-relaxed">
            Upload file format CSV dengan header kolom wajib:
            <br />
            <code className="bg-white/10 px-2 py-0.5 rounded text-gold font-mono text-[11px] block mt-1">
              tanggal,waktu,lawan,kandang_tandang,stadion,kompetisi
            </code>
            Contoh baris data:
            <br />
            <code className="text-white/50 text-[10px] font-mono block mt-0.5">
              2027-01-10,19:00,Persija Jakarta,home,Maguwoharjo,BRI Liga 1
            </code>
          </p>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Pilih File CSV</label>
            <input
              type="file"
              accept=".csv"
              required
              onChange={e => setCsvFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold cursor-pointer"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setCsvModalOpen(false)} className="btn-outline-gold py-2 px-4 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting || !csvFile} className="btn-gold py-2 px-5 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Mengimpor...' : 'Mulai Impor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
