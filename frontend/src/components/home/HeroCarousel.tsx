import { useState, useEffect, useRef } from 'react'
import type { CarouselSlide } from '../../types'

interface HeroCarouselProps {
  slides: CarouselSlide[]
}

// Fallback image jika slide belum memiliki gambar upload
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

  // Auto slide 3 detik
  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % activeSlides.length)
    }, 3000)
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
      className="relative h-[75vh] min-h-[500px] max-h-[750px] w-full overflow-hidden bg-dark select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      {activeSlides.map((slide, index) => {
        const imageUrl = slide.image_url ? slide.image_url : defaultImages[index % defaultImages.length]
        const isActive = index === current

        return (
          <div
            key={slide.id || index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transform scale-105 transition-transform duration-7000 ease-out"
              style={{
                backgroundImage: `url('${imageUrl}')`,
                transform: isActive ? 'scale(1.0)' : 'scale(1.08)',
                transition: 'transform 6s ease-out',
              }}
            />

            {/* Dark & Green Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/70 to-primary-dark/50" />
            <div className="absolute inset-0 bg-black/40" />

            {/* Text Content */}
            <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-24 md:pb-32">
              <div className="max-w-3xl animate-slide-up">
                <span className="inline-block px-3 py-1 bg-gold/90 text-dark font-heading font-bold text-xs uppercase tracking-widest rounded mb-3">
                  COMPASS SLEMAN
                </span>
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black text-white tracking-wide uppercase leading-tight drop-shadow-lg">
                  {slide.title}
                </h1>
                <p className="mt-3 text-lg sm:text-xl text-white/90 font-normal drop-shadow max-w-2xl">
                  {slide.subtitle}
                </p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <a href="/tiket" className="btn-gold rounded text-sm px-6 py-3">
                    Beli Tiket Pertandingan
                  </a>
                  <a href="/about" className="btn-outline-gold rounded text-sm px-6 py-3 backdrop-blur-sm">
                    Tentang Kami
                  </a>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Prev / Next Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-gold text-white hover:text-dark transition-all duration-200 border border-white/10"
        aria-label="Slide sebelumnya"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/40 hover:bg-gold text-white hover:text-dark transition-all duration-200 border border-white/10"
        aria-label="Slide berikutnya"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
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
