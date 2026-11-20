import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../../services/endpoints'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })
  const stats = data?.data?.data

  const cards = [
    { label: 'Total Berita', value: stats?.total_news ?? 0, icon: '📰', color: 'text-blue-400' },
    { label: 'Total Produk', value: stats?.total_products ?? 0, icon: '👕', color: 'text-green-400' },
    { label: 'Reminder Aktif', value: stats?.active_reminders ?? 0, icon: '🔔', color: 'text-yellow-400' },
    { label: 'Pesan Belum Dibaca', value: stats?.unread_messages ?? 0, icon: '✉️', color: 'text-red-400' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Ringkasan panel administrasi COMPASS</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card-dark p-5 rounded-lg">
            <div className="text-3xl mb-3">{c.icon}</div>
            <div className={`font-heading text-3xl font-bold ${c.color}`}>
              {isLoading ? (
                <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
              ) : c.value}
            </div>
            <div className="text-white/60 text-sm mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {stats?.next_match && (
        <div className="card-dark p-5 rounded-lg">
          <h2 className="font-heading font-bold text-white uppercase tracking-wide mb-4 text-sm">Pertandingan Terdekat</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl">⚽</div>
            <div>
              <div className="text-white font-semibold">PSS Sleman vs {stats.next_match.opponent_name}</div>
              <div className="text-white/50 text-sm mt-1">
                {stats.next_match.match_date} · {stats.next_match.match_time} · {stats.next_match.stadium}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${
                stats.next_match.home_away === 'home' ? 'bg-primary text-gold' : 'bg-gold/20 text-gold'
              }`}>
                {stats.next_match.home_away === 'home' ? '🏠 Kandang' : '✈️ Tandang'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="card-dark p-5 rounded-lg">
        <h2 className="font-heading font-bold text-white uppercase tracking-wide mb-3 text-sm">Menu Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'Tambah Berita', icon: '📰', link: '/admin/berita' },
            { label: 'Kelola Jadwal', icon: '⚽', link: '/admin/jadwal' },
            { label: 'Kelola Tiket', icon: '🎟️', link: '/admin/tiket' },
            { label: 'Pesan Masuk', icon: '✉️', link: '/admin/messages' },
          ].map(item => (
            <a
              key={item.label}
              href={item.link}
              className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-primary/40 rounded-lg transition-colors text-center"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-white/70 text-xs">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
