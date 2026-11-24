import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMatches } from '../../services/endpoints'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Jadwal() {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['public-matches', selectedMonth, selectedStatus],
    queryFn: () => getMatches({
      month: selectedMonth || undefined,
      status: selectedStatus || undefined,
    }),
  })

  const matches = data?.data?.data || []

  // Generate dynamic month list based on current year or match data
  const months = useMemo(() => {
    const list = [{ value: '', label: 'Semua Bulan' }]
    const currentYear = new Date().getFullYear()
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]

    // Create 12 months for current year and next year
    const seen = new Set<string>()
    for (let y = currentYear; y <= currentYear + 1; y++) {
      for (let m = 1; m <= 12; m++) {
        const val = `${y}-${String(m).padStart(2, '0')}`
        if (!seen.has(val)) {
          seen.add(val)
          list.push({
            value: val,
            label: `${monthNames[m - 1]} ${y}`
          })
        }
      }
    }
    return list
  }, [])

  return (
    <div className="py-12 md:py-16 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
            Kalender Laga Resmi
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
            JADWAL <span className="text-gold">PERTANDINGAN</span>
          </h1>
          <div className="gold-divider mx-auto mt-4" />
          <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
            Jadwal lengkap pertandingan PSS Sleman. Pantau laga kandang & tandang Elang Jawa.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6">
          {/* Month Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
            {months.slice(0, 13).map(m => (
              <button
                key={m.value}
                onClick={() => setSelectedMonth(m.value)}
                className={`px-4 py-2 rounded-full font-heading text-xs uppercase tracking-wider shrink-0 transition-all ${
                  selectedMonth === m.value
                    ? 'bg-gold text-dark font-bold shadow'
                    : 'bg-dark-card border border-white/10 text-white/70 hover:text-white hover:border-gold/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {[
              { value: '', label: 'Semua' },
              { value: 'upcoming', label: 'Akan Datang' },
              { value: 'finished', label: 'Selesai' },
            ].map(s => (
              <button
                key={s.value}
                onClick={() => setSelectedStatus(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedStatus === s.value
                    ? 'bg-primary text-gold border border-gold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Match Schedule List */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : matches.length === 0 ? (
          <div className="card-dark p-12 text-center max-w-md mx-auto rounded-2xl">
            <span className="text-4xl mb-3 block">⚽</span>
            <p className="text-white/60 text-sm">Tidak ada jadwal pertandingan pada filter ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(match => {
              const isFinished = match.status === 'finished'
              const isHome = match.home_away === 'home'
              const pssScore = isHome ? match.home_score : match.away_score
              const oppScore = isHome ? match.away_score : match.home_score

              return (
                <div
                  key={match.id}
                  className="card-dark p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 hover:border-gold/40 transition-all duration-300"
                >
                  {/* Left: Competition & Date */}
                  <div className="w-full md:w-48 text-center md:text-left">
                    <span className="inline-block px-2.5 py-0.5 bg-white/10 text-white/70 text-[10px] font-heading font-bold uppercase tracking-wider rounded mb-1">
                      {match.competition}
                    </span>
                    <div className="font-heading font-bold text-white text-base">
                      {new Date(match.match_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-gold font-mono">
                      {match.match_time.slice(0, 5)} WIB
                    </div>
                  </div>

                  {/* Center: Teams & Score */}
                  <div className="flex-1 flex items-center justify-center gap-4 sm:gap-8 w-full">
                    {/* PSS Sleman (Kiri) */}
                    <div className="text-right flex-1">
                      <div className="font-heading font-black text-xl sm:text-2xl text-white">
                        PSS SLEMAN
                      </div>
                      <span className="text-[10px] text-white/50 uppercase">
                        {isHome ? 'Kandang' : 'Tandang'}
                      </span>
                    </div>

                    {/* VS or Score */}
                    <div className="px-4 py-2 bg-dark rounded-xl border border-white/10 shrink-0 text-center min-w-20">
                      {isFinished && pssScore !== null && oppScore !== null ? (
                        <div className="font-mono font-black text-2xl text-gold">
                          {pssScore} - {oppScore}
                        </div>
                      ) : (
                        <div className="font-heading font-bold text-lg text-gold/80">
                          VS
                        </div>
                      )}
                    </div>

                    {/* Opponent (Kanan) */}
                    <div className="text-left flex-1">
                      <div className="font-heading font-black text-xl sm:text-2xl text-gold uppercase">
                        {match.opponent_name}
                      </div>
                      <span className="text-[10px] text-white/50 uppercase">
                        {isHome ? 'Tandang' : 'Kandang'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Stadium & Ticket Button */}
                  <div className="w-full md:w-56 flex flex-col md:items-end justify-center text-center md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-white/10">
                    <div className="text-xs text-white/70 flex items-center justify-center md:justify-end gap-1 mb-2">
                      <span>🏟️</span>
                      <span className="truncate">{match.stadium}</span>
                    </div>

                    {!isFinished && (
                      <Link
                        to="/tiket"
                        className="btn-gold py-1.5 px-4 rounded text-xs inline-block text-center uppercase"
                      >
                        Beli Tiket
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
