import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSiteSettings } from '../../services/endpoints'

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
  const { data: settingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: getSiteSettings,
    staleTime: 1000 * 60 * 10,
  })
  const siteName = settingsData?.data?.data?.site_name || 'COMPASS'
  const logoUrl = settingsData?.data?.data?.logo_url

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-dark/95 backdrop-blur-md border-b border-gold/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-10 w-auto" />
            ) : (
              <div className="w-10 h-10 bg-primary border-2 border-gold flex items-center justify-center rounded">
                <span className="font-heading font-bold text-gold text-sm">C</span>
              </div>
            )}
            <span className="font-heading font-bold text-xl text-white group-hover:text-gold transition-colors uppercase tracking-wider">
              {siteName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 font-heading font-medium text-sm uppercase tracking-wide transition-colors ${
                    isActive
                      ? 'text-gold border-b-2 border-gold'
                      : 'text-white/80 hover:text-gold'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Hamburger */}
          <button
            className="lg:hidden text-white/80 hover:text-gold transition-colors p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`block h-0.5 bg-current transition-transform origin-center ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 bg-current transition-opacity ${isOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-current transition-transform origin-center ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden border-t border-white/10 py-3 animate-fade-in">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 font-heading font-medium uppercase tracking-wide transition-colors ${
                    isActive ? 'text-gold bg-primary/40' : 'text-white/80 hover:text-gold hover:bg-white/5'
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
