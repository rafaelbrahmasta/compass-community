import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Ticket, Users } from 'lucide-react'
import type { CarouselSlide } from '../../types'
import { getAssetUrl } from '../../services/api'

interface HeroCarouselProps {
  slides: CarouselSlide[]
}

const defaultImages = [
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1920&q=80',
]

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const activeSlides = slides.length > 0 ? slides : [
    { id: '1', title: 'BERSAMA KITA KUAT', subtitle: 'Satu hati, satu jiwa, satu PSS Sleman', image_url: defaultImages[0], sort_order: 1, is_active: true, created_at: '' },
    { id: '2', title: 'SUPERCAN FOREVER', subtitle: 'Komunitas yang solid, dukungan yang tak pernah padam', image_url: defaultImages[1], sort_order: 2, is_active: true, created_at: '' },
    { id: '3', title: 'KANDANG KEBANGGAAN', subtitle: 'Maguwoharjo bergemuruh untuk Elang Jawa', image_url: defaultImages[2], sort_order: 3, is_active: true, created_at: '' },
    { id: '4', title: 'COMPASS FOR HUMANITY', subtitle: 'Karena sepak bola lebih dari sekadar 90 menit di lapangan', image_url: defaultImages[3], sort_order: 4, is_active: true, created_at: '' },
  ]

  // Auto slide 6 detik (aksesibel dan nyaman dibaca)
  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % activeSlides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [isPaused, activeSlides.length])

  const prevSlide = () => {
    setCurrent(prev => (prev === 0 ? activeSlides.length - 1 : prev - 1))
  }

  const nextSlide = () => {
    setCurrent(prev => (prev + 1) % activeSlides.length)
  }

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    if (diff > 50) nextSlide()
    if (diff < -50) prevSlide()
    touchStartX.current = null
    touchEndX.current = null
  }

  return (
    <div
      className="relative h-[78vh] min-h-[520px] max-h-[780px] w-full overflow-hidden bg-dark select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      {activeSlides.map((slide, index) => {
        const imageUrl = slide.image_url ? getAssetUrl(slide.image_url) : defaultImages[index % defaultImages.length]
        const isActive = index === current

        return (
          <div
            key={slide.id || index}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${imageUrl}')`,
                transform: isActive ? 'scale(1.0)' : 'scale(1.08)',
                transition: 'transform 6s ease-out',
              }}
            />

            {/* Dark & Green Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/75 to-primary/40" />
            <div className="absolute inset-0 bg-black/40" />

            {/* Text Content */}
            <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-24 md:pb-32">
              <div className="max-w-3xl animate-slide-up">
                <span className="inline-block px-3.5 py-1 bg-gold text-dark font-heading font-black text-xs uppercase tracking-widest rounded-md mb-3 shadow-md">
                  COMPASS SLEMAN
                </span>
                {index === 0 ? (
                  <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black text-white tracking-wide uppercase leading-tight drop-shadow-lg">
                    {slide.title}
                  </h1>
                ) : (
                  <h2 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black text-white tracking-wide uppercase leading-tight drop-shadow-lg">
                    {slide.title}
                  </h2>
                )}
                <p className="mt-3 text-lg sm:text-xl text-white/90 font-normal drop-shadow max-w-2xl leading-relaxed">
                  {slide.subtitle}
                </p>
                <div className="mt-7 flex flex-wrap gap-4">
                  <Link
                    to="/tiket"
                    tabIndex={isActive ? 0 : -1}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 shadow-lg shadow-gold/20 transition-all duration-300"
                  >
                    <Ticket size={18} strokeWidth={1.5} />
                    <span>Beli Tiket Pertandingan</span>
                  </Link>
                  <Link
                    to="/about"
                    tabIndex={isActive ? 0 : -1}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gold/60 text-gold hover:bg-gold hover:text-dark font-heading font-black uppercase tracking-wider text-sm backdrop-blur-sm transition-all duration-300"
                  >
                    <Users size={18} strokeWidth={1.5} />
                    <span>Tentang Kami</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Prev / Next Buttons with Lucide Icons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 hover:bg-gold text-white hover:text-dark transition-all duration-300 border border-white/10 hover:border-gold hover:scale-110 shadow-lg"
        aria-label="Slide sebelumnya"
      >
        <ChevronLeft size={22} strokeWidth={1.5} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 hover:bg-gold text-white hover:text-dark transition-all duration-300 border border-white/10 hover:border-gold hover:scale-110 shadow-lg"
        aria-label="Slide berikutnya"
      >
        <ChevronRight size={22} strokeWidth={1.5} />
      </button>

      {/* Indicator Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5">
        {activeSlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`transition-all duration-300 rounded-full ${
              idx === current ? 'w-8 h-2.5 bg-gold' : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
            }`}
            aria-label={`Ke slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
