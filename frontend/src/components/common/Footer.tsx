import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSiteSettings } from '../../services/endpoints'
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  HeartHandshake,
  ShieldAlert,
} from 'lucide-react'
import Reveal from './Reveal'

const InstagramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
)

const TwitterIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
  </svg>
)

const YoutubeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

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

export default function Footer() {
  const { data: settingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: getSiteSettings,
    staleTime: 1000 * 60 * 10,
  })
  const settings = settingsData?.data?.data
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#070b09] border-t border-gold/20 mt-auto text-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Layout 4 Kolom: Desktop 4 Kolom (Kolom 1 lebih lebar), Tablet 2 Kolom, Mobile 1 Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_1.1fr_1.1fr] gap-10">
          
          {/* KOLOM 1: Logo + Deskripsi + Sosial Media */}
          <Reveal variant="fade-up" delay={0}>
            <div>
              <div className="flex items-center gap-3 mb-4">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="COMPASS" className="h-11 w-auto" />
                ) : (
                  <div className="w-11 h-11 bg-primary border-2 border-gold flex items-center justify-center rounded-lg shadow-md shadow-black/50">
                    <span className="font-heading font-bold text-gold text-base tracking-wider">CP</span>
                  </div>
                )}
                <div>
                  <span className="font-heading font-black text-2xl text-white tracking-widest block leading-tight">
                    {settings?.site_name || 'COMPASS'}
                  </span>
                  <span className="text-[10px] text-gold uppercase tracking-[0.2em] font-semibold block">
                    Komunitas Suporter PSS Sleman
                  </span>
                </div>
              </div>
              <p className="text-white/65 text-sm leading-relaxed mb-6">
                Wadah independen dan persaudaraan pendukung PSS Sleman. Bergerak bersama dengan dedikasi, sportivitas, dan solidaritas sosial tanpa batas untuk kebanggaan Super Elja.
              </p>
              {/* Sosial Media: Lingkaran outline emas, hover berubah solid */}
              <div className="flex items-center gap-3">
                {settings?.instagram_url && (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border border-gold/50 text-gold flex items-center justify-center hover:bg-gold hover:text-dark hover:border-gold hover:scale-105 transition-all duration-300 shadow-sm"
                    aria-label="Instagram"
                  >
                    <InstagramIcon />
                  </a>
                )}
                {settings?.twitter_url && (
                  <a
                    href={settings.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border border-gold/50 text-gold flex items-center justify-center hover:bg-gold hover:text-dark hover:border-gold hover:scale-105 transition-all duration-300 shadow-sm"
                    aria-label="Twitter/X"
                  >
                    <TwitterIcon />
                  </a>
                )}
                {settings?.youtube_url && (
                  <a
                    href={settings.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border border-gold/50 text-gold flex items-center justify-center hover:bg-gold hover:text-dark hover:border-gold hover:scale-105 transition-all duration-300 shadow-sm"
                    aria-label="YouTube"
                  >
                    <YoutubeIcon />
                  </a>
                )}
              </div>
            </div>
          </Reveal>

          {/* KOLOM 2: Menu Navigasi */}
          <Reveal variant="fade-up" delay={100}>
            <div>
              <h4 className="font-heading font-bold text-white text-base uppercase tracking-wider mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold inline-block"></span>
                Menu
              </h4>
              <ul className="grid grid-cols-2 gap-y-2.5 gap-x-2">
                {navLinks.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-white/65 hover:text-gold hover:translate-x-1 inline-block transition-all duration-200 text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* KOLOM 3: Kontak Resmi */}
          <Reveal variant="fade-up" delay={200}>
            <div>
              <h4 className="font-heading font-bold text-white text-base uppercase tracking-wider mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold inline-block"></span>
                Kontak
              </h4>
              <div className="space-y-3.5 text-sm text-white/65">
                {settings?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} strokeWidth={1.5} className="text-gold shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{settings.address}</span>
                  </div>
                )}
                {settings?.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail size={18} strokeWidth={1.5} className="text-gold shrink-0" />
                    <a
                      href={`mailto:${settings.contact_email}`}
                      className="hover:text-gold transition-colors break-all"
                    >
                      {settings.contact_email}
                    </a>
                  </div>
                )}
                {settings?.contact_whatsapp && (
                  <div className="flex items-center gap-3">
                    <Phone size={18} strokeWidth={1.5} className="text-gold shrink-0" />
                    <a
                      href={`https://wa.me/${settings.contact_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gold transition-colors"
                    >
                      {settings.contact_whatsapp}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* KOLOM 4: Compass for Humanity / Sekretariat */}
          <Reveal variant="fade-up" delay={300}>
            <div>
              <h4 className="font-heading font-bold text-white text-base uppercase tracking-wider mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold inline-block"></span>
                Sekretariat & Aksi
              </h4>
              <div className="bg-primary/20 border border-gold/25 rounded-xl p-4.5 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gold font-semibold text-xs uppercase tracking-wider">
                  <HeartHandshake size={16} strokeWidth={1.5} />
                  <span>Compass for Humanity</span>
                </div>
                <p className="text-white/60 text-xs leading-relaxed">
                  Gerakan donasi dan kepedulian sosial untuk sesama dan suporter yang membutuhkan bantuan.
                </p>
                <div className="pt-2 border-t border-white/10 text-xs space-y-1.5 text-white/60">
                  <div className="flex items-center gap-2">
                    <Clock size={14} strokeWidth={1.5} className="text-gold" />
                    <span>Buka: Senin - Sabtu (15.00 - 21.00 WIB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} strokeWidth={1.5} className="text-gold" />
                    <span>Sekretariat Sleman, D.I. Yogyakarta</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

        </div>

        {/* Baris Copyright Terpisah di Bagian Paling Bawah dengan Garis Emas Tipis */}
        <div className="mt-12 pt-6 border-t border-gold/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/50 text-xs text-center sm:text-left">
            &copy; {year} <span className="text-gold font-semibold">{settings?.site_name || 'COMPASS'}</span>. Hak Cipta Dilindungi Undang-Undang.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span>Kebanggaan PSS Sleman</span>
            <span>•</span>
            <span>Est. 2024</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

