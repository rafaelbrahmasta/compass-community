import { useQuery } from '@tanstack/react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { adminGetReminders, adminGetMatches } from '../../services/endpoints'

export default function AdminReminder() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reminders'],
    queryFn: adminGetReminders,
  })

  const { data: matchesData } = useQuery({
    queryKey: ['admin-matches'],
    queryFn: adminGetMatches,
  })

  const reminders = data?.data?.data || []
  const matches = matchesData?.data?.data || []

  // Helper map match id to opponent
  const matchMap = new Map(matches.map(m => [m.id, m]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
          Daftar Pengingat Pertandingan (Reminders)
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Daftar suporter yang berlangganan reminder email otomatis via background scheduler.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : reminders.length === 0 ? (
        <div className="card-dark p-12 text-center rounded-xl max-w-md mx-auto">
          <span className="text-4xl mb-3 block">🔔</span>
          <p className="text-white/60 text-sm">Belum ada suporter yang mendaftarkan pengingat tiket.</p>
        </div>
      ) : (
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-heading text-white">
                <tr>
                  <th className="p-4">Pertandingan</th>
                  <th className="p-4">Email Suporter</th>
                  <th className="p-4">WhatsApp</th>
                  <th className="p-4">Waktu Pilihan</th>
                  <th className="p-4">Jadwal Kirim</th>
                  <th className="p-4 text-right">Status Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reminders.map(r => {
                  const match = matchMap.get(r.match_id)
                  const opponent = match ? match.opponent_name : 'Laga PSS'

                  return (
                    <tr key={r.id} className="hover:bg-white/5">
                      <td className="p-4 font-semibold text-white">
                        PSS vs <span className="text-gold uppercase">{opponent}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-white/90">
                        {r.email}
                      </td>
                      <td className="p-4 text-xs text-white/60">
                        {r.whatsapp || '-'}
                      </td>
                      <td className="p-4 text-xs">
                        {r.remind_before === 'h_minus_1_day' ? 'H-1 Hari' : 'H-3 Jam'}
                      </td>
                      <td className="p-4 text-xs text-white/60 whitespace-nowrap">
                        {new Date(r.scheduled_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        {r.email_sent ? (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-bold">
                            Terkirim ✓
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-bold">
                            Menunggu Jadwal
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
