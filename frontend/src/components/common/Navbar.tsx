import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSiteSettings } from '../../services/endpoints'
import { getAssetUrl } from '../../services/api'
import { Menu, X, Ticket } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/tiket', label: 'Tiket' },
  { to: '/merchandise', label: 'Merchandise' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/jadwal', label: 'Jadwal' },
  { to: '/berita', label: 'Berita' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const { data: settingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: getSiteSettings,
    staleTime: 1000 * 60 * 10,
  })
  const siteName = settingsData?.data?.data?.site_name || 'COMPASS'
  const logoUrl = settingsData?.data?.data?.logo_url

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#060a08]/95 backdrop-blur-md shadow-xl shadow-black/70 border-b border-gold/30 py-1'
          : 'bg-[#070b09]/80 backdrop-blur-sm border-b border-gold/15 py-2.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            {logoUrl ? (
              <img src={getAssetUrl(logoUrl)} alt={siteName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="w-9 h-9 bg-primary border border-gold flex items-center justify-center rounded-lg shadow-sm group-hover:border-gold transition-colors">
                <span className="font-heading font-black text-gold text-sm tracking-wider">CP</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-heading font-black text-xl text-white group-hover:text-gold transition-colors uppercase tracking-widest leading-none">
                {siteName}
              </span>
              <span className="text-[9px] text-gold/80 font-semibold tracking-[0.2em] uppercase mt-0.5">
                PSS Sleman Fans
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 font-heading font-medium text-sm uppercase tracking-wide transition-all rounded-md ${
                    isActive
                      ? 'text-gold bg-primary/40 border-b-2 border-gold font-bold shadow-sm'
                      : 'text-white/80 hover:text-gold hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            {/* Shortcut Cek Tiket */}
            <Link
              to="/tiket/cek"
              className="ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold/40 text-gold text-xs font-heading font-bold uppercase tracking-wider hover:bg-gold hover:text-dark transition-all duration-300"
            >
              <Ticket size={14} strokeWidth={1.5} />
              <span>Cek Tiket</span>
            </Link>
          </div>

          {/* Mobile Hamburger Button with Lucide */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to="/tiket/cek"
              className="p-2 rounded-lg border border-gold/30 text-gold hover:bg-gold hover:text-dark transition-colors"
              title="Cek Tiket Saya"
            >
              <Ticket size={18} strokeWidth={1.5} />
            </Link>
            <button
              className="text-white/80 hover:text-gold transition-colors p-2 rounded-lg hover:bg-white/5"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="lg:hidden border-t border-gold/20 py-3 mt-1 space-y-1 animate-fade-in bg-dark/95 backdrop-blur-lg rounded-b-xl px-2">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-3.5 py-2.5 rounded-lg font-heading font-medium uppercase tracking-wide transition-all text-sm ${
                    isActive
                      ? 'text-gold bg-primary/50 border-l-4 border-gold font-bold'
                      : 'text-white/80 hover:text-gold hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
