import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getNewsList } from '../../services/endpoints'
import { getAssetUrl } from '../../services/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Berita() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['public-news-list', page],
    queryFn: () => getNewsList({ page, per_page: 6 }),
  })

  const newsData = data?.data?.data
  const items = newsData?.items || []
  const totalPages = newsData?.total_pages || 1

  return (
    <div className="py-12 md:py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
            Warta Elang Jawa
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
            BERITA <span className="text-gold">COMPASS</span>
          </h1>
          <div className="gold-divider mx-auto mt-4" />
          <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
            Informasi terkini seputar persiapan pertandingan, kabar tim PSS Sleman, serta liputan kegiatan komunitas.
          </p>
        </div>

        {/* News Grid */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="card-dark p-12 text-center max-w-md mx-auto rounded-2xl">
            <span className="text-4xl mb-3 block">📰</span>
            <p className="text-white/60 text-sm">Belum ada berita yang diterbitkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map(news => (
              <Link
                key={news.id}
                to={`/berita/${news.slug}`}
                className="card-dark group flex flex-col h-full rounded-2xl overflow-hidden hover:border-gold/50 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="h-52 overflow-hidden relative bg-dark-surface">
                  <img
                    src={news.thumbnail_url ? getAssetUrl(news.thumbnail_url) : 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80'}
                    alt={news.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-dark/80 backdrop-blur-md px-2.5 py-1 rounded text-xs font-semibold text-gold">
                    {news.author}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-white/40 block mb-2">
                      {news.published_at ? new Date(news.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Terbaru'}
                    </span>
                    <h3 className="font-heading font-bold text-xl text-white group-hover:text-gold transition-colors line-clamp-2 leading-snug">
                      {news.title}
                    </h3>
                    <p className="mt-3 text-white/60 text-sm line-clamp-3 leading-relaxed">
                      {news.summary}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-gold uppercase tracking-wider">
                    <span>Baca Selengkapnya</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-dark-card border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-gold text-sm"
            >
              Sebelumnya
            </button>
            <span className="px-4 text-sm text-white/60">
              Halaman <span className="text-gold font-bold">{page}</span> dari {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-dark-card border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-gold text-sm"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
