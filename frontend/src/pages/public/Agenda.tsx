import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAgendas } from '../../services/endpoints'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Agenda() {
  const [selectedMonth, setSelectedMonth] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['public-agendas', selectedMonth],
    queryFn: () => getAgendas({ month: selectedMonth || undefined }),
  })

  const agendas = data?.data?.data || []

  // Generate dynamic month list based on current year
  const months = useMemo(() => {
    const list = [{ value: '', label: 'Semua Bulan' }]
    const currentYear = new Date().getFullYear()
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
            Kalender Komunitas
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
            AGENDA <span className="text-gold">COMPASS</span>
          </h1>
          <div className="gold-divider mx-auto mt-4" />
          <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
            Rangkaian kegiatan forum, kopi darat, nonton bareng, dan aksi sosial keluarga besar Supercan.
          </p>
        </div>

        {/* Month Filter */}
        <div className="flex justify-center">
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
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
        </div>

        {/* Agenda List */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : agendas.length === 0 ? (
          <div className="card-dark p-12 text-center max-w-md mx-auto rounded-2xl">
            <span className="text-4xl mb-3 block">📋</span>
            <p className="text-white/60 text-sm">Belum ada agenda pada periode ini.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {agendas.map(agenda => {
              // Otomatis tandai selesai jika tanggal agenda sudah lewat
              const agendaDateTime = new Date(`${agenda.agenda_date}T${agenda.agenda_time || '23:59:59'}`)
              const isPast = !isNaN(agendaDateTime.getTime()) && agendaDateTime < new Date()
              const isDone = agenda.status === 'done' || isPast
              const agendaYear = new Date(agenda.agenda_date).getFullYear()

              return (
                <div
                  key={agenda.id}
                  className={`card-dark p-6 sm:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 ${
                    isDone ? 'opacity-70 border-white/5' : 'border-gold/30 hover:border-gold'
                  }`}
                >
                  <div className="flex items-start gap-5">
                    {/* Date Badge */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary/40 border border-gold/40 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs uppercase font-heading font-bold text-gold">
                        {new Date(agenda.agenda_date).toLocaleDateString('id-ID', { month: 'short' })}
                      </span>
                      <span className="text-2xl sm:text-3xl font-heading font-black text-white">
                        {new Date(agenda.agenda_date).getDate()}
                      </span>
                    </div>

                    {/* Content */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded ${
                          isDone ? 'bg-white/10 text-white/60' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isDone ? 'Selesai' : 'Akan Datang'}
                        </span>
                        <span className="text-xs text-gold font-mono font-medium">
                          ⏰ {agenda.agenda_time.slice(0, 5)} WIB
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-xl sm:text-2xl text-white">
                        {agenda.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-white/50 mt-1">
                        <span>📍</span>
                        <span>{agenda.location}</span>
                      </div>

                      <p className="text-white/70 text-sm mt-3 leading-relaxed">
                        {agenda.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 md:text-right">
                    <span className="text-xs text-white/40">Tahun {agendaYear || 'Berjalan'}</span>
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
