import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Newspaper, ShoppingBag, Bell, Mail, Calendar, Ticket, Compass } from 'lucide-react'
import { getDashboardStats } from '../../services/endpoints'
import { useAuth } from '../../context/AuthContext'

export default function Dashboard() {
  const { admin } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })
  const stats = data?.data?.data

  const cards = [
    { label: 'Total Berita', value: stats?.total_news ?? 0, icon: <Newspaper size={24} />, color: 'text-blue-400' },
    { label: 'Total Produk', value: stats?.total_products ?? 0, icon: <ShoppingBag size={24} />, color: 'text-green-400' },
    { label: 'Reminder Aktif', value: stats?.active_reminders ?? 0, icon: <Bell size={24} />, color: 'text-yellow-400' },
    { label: 'Pesan Belum Dibaca', value: stats?.unread_messages ?? 0, icon: <Mail size={24} />, color: 'text-red-400' },
  ]

  // Menu cepat yang disesuaikan dengan role admin (Temuan 15)
  const quickMenuItems = [
    { label: 'Tambah Berita', icon: <Newspaper size={20} />, link: '/admin/berita', superAdminOnly: false },
    { label: 'Kelola Jadwal', icon: <Calendar size={20} />, link: '/admin/jadwal', superAdminOnly: false },
    { label: 'Kelola Tiket', icon: <Ticket size={20} />, link: '/admin/tiket', superAdminOnly: true },
    { label: 'Pesan Masuk', icon: <Mail size={20} />, link: '/admin/messages', superAdminOnly: true },
  ].filter(item => !item.superAdminOnly || admin?.role === 'super_admin')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Ringkasan panel administrasi COMPASS</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card-dark p-5 rounded-lg flex flex-col justify-between">
            <div className={`p-2.5 rounded-lg bg-white/5 w-fit ${c.color} mb-3`}>
              {c.icon}
            </div>
            <div>
              <div className={`font-heading text-3xl font-bold ${c.color}`}>
                {isLoading ? (
                  <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
                ) : c.value}
              </div>
              <div className="text-white/60 text-sm mt-1">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {stats?.next_match && (
        <div className="card-dark p-5 rounded-lg">
          <h2 className="font-heading font-bold text-white uppercase tracking-wide mb-4 text-sm">Pertandingan Terdekat</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/40 border border-gold/40 flex items-center justify-center text-gold">
              <Compass size={28} />
            </div>
            <div>
              <div className="text-white font-semibold">PSS Sleman vs {stats.next_match.opponent_name}</div>
              <div className="text-white/50 text-sm mt-1">
                {new Date(stats.next_match.match_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {stats.next_match.match_time.slice(0, 5)} WIB · {stats.next_match.stadium}
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded mt-2 inline-block font-medium ${
                stats.next_match.home_away === 'home' ? 'bg-primary text-gold border border-gold/40' : 'bg-gold/20 text-gold border border-gold/30'
              }`}>
                {stats.next_match.home_away === 'home' ? 'Kandang (Home)' : 'Tandang (Away)'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="card-dark p-5 rounded-lg">
        <h2 className="font-heading font-bold text-white uppercase tracking-wide mb-3 text-sm">Menu Cepat</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickMenuItems.map(item => (
            <Link
              key={item.label}
              to={item.link}
              className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-primary/40 hover:border-gold/30 border border-white/5 rounded-lg transition-all text-center group"
            >
              <span className="text-gold group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-white/70 text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
