import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const sidebarLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/carousel', label: 'Hero Carousel', icon: '🎠' },
  { to: '/admin/about', label: 'About Us & Pengurus', icon: '👥' },
  { to: '/admin/timeline', label: 'Sejarah Timeline', icon: '📅' },
  { to: '/admin/humanity', label: 'Compass for Humanity', icon: '❤️' },
  { to: '/admin/jadwal', label: 'Jadwal Pertandingan', icon: '⚽' },
  { to: '/admin/tiket', label: 'Tiket', icon: '🎟️' },
  { to: '/admin/reminder', label: 'Reminder', icon: '🔔' },
  { to: '/admin/merch', label: 'Merchandise', icon: '👕' },
  { to: '/admin/gallery', label: 'Gallery', icon: '🖼️' },
  { to: '/admin/agenda', label: 'Agenda', icon: '📋' },
  { to: '/admin/berita', label: 'Berita', icon: '📰' },
  { to: '/admin/messages', label: 'Pesan Masuk', icon: '✉️' },
  { to: '/admin/settings', label: 'Pengaturan Situs', icon: '⚙️' },
  { to: '/admin/account', label: 'Akun Admin', icon: '🔑' },
]

export default function AdminLayout() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-dark-surface">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-dark border-r border-gold/20 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gold/20">
          <div className="w-9 h-9 bg-primary border-2 border-gold flex items-center justify-center rounded">
            <span className="font-heading font-bold text-gold text-sm">C</span>
          </div>
          <div>
            <div className="font-heading font-bold text-white text-sm uppercase tracking-wide">COMPASS</div>
            <div className="text-white/40 text-xs">Admin Panel</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {sidebarLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-gold border-l-2 border-gold'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gold/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold/20 rounded-full flex items-center justify-center">
              <span className="text-gold font-heading font-bold text-sm">
                {admin?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{admin?.name || 'Admin'}</div>
              <div className="text-white/40 text-xs truncate">{admin?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-dark border-b border-gold/20 px-4 sm:px-6 h-14 flex items-center gap-4 sticky top-0 z-10">
          <button
            className="lg:hidden text-white/70 hover:text-gold transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <span className="text-white/60 text-sm hidden sm:block">Super Admin Dashboard</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
