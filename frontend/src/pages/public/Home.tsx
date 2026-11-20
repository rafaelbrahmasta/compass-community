import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import HeroCarousel from '../../components/home/HeroCarousel'
import TimelineSection from '../../components/home/TimelineSection'
import HumanitySection from '../../components/home/HumanitySection'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  getCarouselSlides,
  getAbout,
  getHumanity,
  getUpcomingMatches,
  getNewsList,
} from '../../services/endpoints'

export default function Home() {
  const { data: slidesData, isLoading: slidesLoading } = useQuery({
    queryKey: ['public-carousel'],
    queryFn: getCarouselSlides,
  })

  const { data: aboutData } = useQuery({
    queryKey: ['public-about'],
    queryFn: getAbout,
  })

  const { data: humanityData } = useQuery({
    queryKey: ['public-humanity'],
    queryFn: getHumanity,
  })

  const { data: upcomingData } = useQuery({
    queryKey: ['public-upcoming'],
    queryFn: getUpcomingMatches,
  })

  const { data: newsData } = useQuery({
    queryKey: ['public-news-home'],
    queryFn: () => getNewsList({ page: 1, per_page: 3 }),
  })

  const slides = slidesData?.data?.data || []
  const about = aboutData?.data?.data?.about
  const history = aboutData?.data?.data?.history || []
  const humanity = humanityData?.data?.data || null
  const upcomingMatches = upcomingData?.data?.data || []
  const latestNews = newsData?.data?.data?.items || []

  return (
    <div className="animate-fade-in space-y-0">
      {/* 1. Hero Carousel */}
      {slidesLoading ? (
        <div className="h-[70vh] flex items-center justify-center bg-dark">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <HeroCarousel slides={slides} />
      )}

      {/* Quick Upcoming Match Banner (Jika ada match 4 hari ke depan) */}
      {upcomingMatches.length > 0 && (
        <div className="bg-primary-dark border-y border-gold/30 py-4 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="font-heading font-bold text-white uppercase tracking-wider text-sm">
                PERTANDINGAN TERDEKAT:
              </span>
              <span className="text-gold font-semibold text-sm">
                PSS Sleman vs {upcomingMatches[0].opponent_name} ({upcomingMatches[0].match_date})
              </span>
            </div>
            <Link to="/tiket" className="btn-gold py-1.5 px-4 text-xs rounded uppercase">
              Beli Tiket Sekarang
            </Link>
          </div>
        </div>
      )}

      {/* 2. Section About Us Singkat */}
      <section className="py-20 bg-dark relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border-2 border-gold/30 shadow-2xl relative">
                  <img
                    src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80"
                    alt="Komunitas COMPASS PSS Sleman"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-transparent" />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-primary border-2 border-gold p-4 rounded-xl shadow-xl hidden sm:block">
                  <div className="font-heading text-3xl font-black text-gold">100%</div>
                  <div className="text-xs uppercase font-bold text-white tracking-wider">Supercan Sleman</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
                Mengenal Lebih Dekat
              </span>
              <h2 className="section-title mt-2">
                TENTANG <span className="text-gold">COMPASS</span>
              </h2>
              <div className="gold-divider mt-4 mb-6" />
              <p className="text-white/80 text-base sm:text-lg leading-relaxed">
                {about?.content ||
                  'COMPASS (Komunitas Pendukung PSS Sleman) adalah organisasi suporter resmi yang berdiri dengan dedikasi penuh mendukung Elang Jawa. Kami menyatukan suporter dari berbagai penjuru dengan semangat persaudaraan, sportivitas, dan kecintaan abadi kepada PSS Sleman.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/about" className="btn-gold rounded text-sm px-6 py-3">
                  Profil & Pengurus Lengkap
                </Link>
                <Link to="/agenda" className="btn-outline-gold rounded text-sm px-6 py-3">
                  Agenda Komunitas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section Sejarah Komunitas (Timeline) */}
      <TimelineSection items={history} />

      {/* 4. Section Compass for Humanity */}
      <HumanitySection settings={humanity} />

      {/* 5. Section Berita Terbaru Singkat */}
      {latestNews.length > 0 && (
        <section className="py-20 bg-dark-surface border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
              <div>
                <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
                  Kabar Terbaru
                </span>
                <h2 className="section-title mt-1">BERITA SEPUTAR PSS & COMPASS</h2>
                <div className="gold-divider mt-3" />
              </div>
              <Link to="/berita" className="mt-4 sm:mt-0 text-gold hover:text-gold-light font-heading font-semibold text-sm uppercase flex items-center gap-1 group">
                Lihat Semua Berita
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {latestNews.map(item => (
                <Link
                  key={item.id}
                  to={`/berita/${item.slug}`}
                  className="card-dark group flex flex-col h-full rounded-xl"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={item.thumbnail_url || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-dark/80 backdrop-blur-md px-2.5 py-1 rounded text-xs font-semibold text-gold">
                      {item.author}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-xl text-white group-hover:text-gold transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-white/60 text-sm line-clamp-3 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
                      <span>{item.published_at ? new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Baru saja'}</span>
                      <span className="text-gold group-hover:underline">Baca Selengkapnya</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
