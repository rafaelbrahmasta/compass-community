import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Image,
  Users,
  Milestone,
  HeartHandshake,
  Trophy,
  Ticket,
  Bell,
  ShoppingBag,
  Images,
  CalendarDays,
  Newspaper,
  MessageSquare,
  Settings,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Receipt,
  LogOut,
  Menu,
  Shield,
  Tag,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isSuperAdmin = admin?.role === 'super_admin'

  // Definisi Menu Lengkap Berdasarkan Hak Akses (RBAC)
  const navSections = [
    {
      title: 'Utama',
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    // Modul Khusus Super Admin
    ...(isSuperAdmin
      ? [
          {
            title: 'Administrasi & Keanggotaan',
            items: [
              { to: '/admin/admins', label: 'Kelola Admin', icon: ShieldCheck },
              { to: '/admin/anggota', label: 'Kelola Anggota', icon: UserCheck },
              { to: '/admin/pembayaran-tiket', label: 'Pesanan & Check-in Tiket', icon: Receipt },
              { to: '/admin/tiket', label: 'Kategori Tiket Laga', icon: Tag },
              { to: '/admin/reminder', label: 'Data Reminder', icon: Bell },
              { to: '/admin/humanity', label: 'Compass for Humanity', icon: HeartHandshake },
              { to: '/admin/settings', label: 'Pengaturan Situs', icon: Settings },
            ],
          },
        ]
      : []),
    // Modul Konten & Informasi (Bisa diakses super_admin, admin_1, admin_2)
    {
      title: 'Manajemen Konten',
      items: [
        { to: '/admin/carousel', label: 'Hero Carousel', icon: Image },
        { to: '/admin/about', label: 'About & Pengurus', icon: Users },
        { to: '/admin/timeline', label: 'Sejarah Timeline', icon: Milestone },
        { to: '/admin/jadwal', label: 'Jadwal Pertandingan', icon: Trophy },
        { to: '/admin/merch', label: 'Merchandise', icon: ShoppingBag },
        { to: '/admin/gallery', label: 'Gallery Foto', icon: Images },
        { to: '/admin/agenda', label: 'Agenda Acara', icon: CalendarDays },
        { to: '/admin/berita', label: 'Berita & Artikel', icon: Newspaper },
        { to: '/admin/messages', label: 'Pesan Masuk', icon: MessageSquare },
      ],
    },
    {
      title: 'Pengaturan Akun',
      items: [
        { to: '/admin/account', label: 'Ganti Password', icon: KeyRound },
      ],
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const getRoleBadge = () => {
    switch (admin?.role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold/15 text-gold border border-gold/40">
            <Shield size={12} strokeWidth={1.5} />
            <span>Super Admin</span>
          </span>
        )
      case 'admin_1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span>Admin Konten 1</span>
          </span>
        )
      case 'admin_2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <span>Admin Konten 2</span>
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-[#070b09] text-white/80">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/75 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0a100d] border-r border-gold/20 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-primary border-2 border-gold flex items-center justify-center rounded-lg shadow-sm">
            <span className="font-heading font-black text-gold text-sm tracking-wider">CP</span>
          </div>
          <div>
            <div className="font-heading font-black text-white text-base uppercase tracking-widest leading-none">
              COMPASS
            </div>
            <div className="text-[10px] text-gold uppercase tracking-wider font-semibold mt-1">
              Admin Control Panel
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                {section.title}
              </div>
              {section.items.map(item => {
                const IconComponent = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        isActive
                          ? 'bg-primary/50 text-gold border border-gold/40 shadow-sm font-bold'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <IconComponent size={18} strokeWidth={1.5} className="shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/10 bg-[#070b09]/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
                <span className="text-gold font-heading font-bold text-xs">
                  {admin?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-semibold truncate leading-tight">
                  {admin?.name || 'Administrator'}
                </div>
                <div className="text-white/40 text-[10px] truncate">{admin?.email}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
              title="Keluar (Logout)"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-[#0a100d]/90 backdrop-blur-md border-b border-gold/20 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-white/70 hover:text-gold transition-colors p-1"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka Menu"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
            <span className="font-heading font-bold text-white uppercase text-sm tracking-wide hidden sm:inline">
              Komunitas Suporter PSS Sleman
            </span>
          </div>

          <div className="flex items-center gap-3">
            {getRoleBadge()}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
