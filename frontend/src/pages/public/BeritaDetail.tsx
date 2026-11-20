import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getNewsDetail } from '../../services/endpoints'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function BeritaDetail() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['news-detail', slug],
    queryFn: () => getNewsDetail(slug!),
    enabled: !!slug,
  })

  const news = data?.data?.data

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!news) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-4">
        <h2 className="font-heading text-2xl text-white">Berita Tidak Ditemukan</h2>
        <Link to="/berita" className="btn-gold mt-4 rounded text-sm px-6 py-2.5">
          Kembali ke Daftar Berita
        </Link>
      </div>
    )
  }

  return (
    <div className="py-12 md:py-16 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          <span>/</span>
          <Link to="/berita" className="hover:text-gold transition-colors">Berita</Link>
          <span>/</span>
          <span className="text-white font-medium truncate">{news.title}</span>
        </div>

        {/* Title & Metadata */}
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-white uppercase leading-tight">
            {news.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-white/50 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5">
              <span>✍️</span> Penulis: <strong className="text-white">{news.author}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span>📅</span> {news.published_at ? new Date(news.published_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Baru saja'}
            </span>
          </div>
        </div>

        {/* Hero Image */}
        {news.thumbnail_url && (
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-80 sm:h-[420px] bg-dark-surface">
            <img
              src={news.thumbnail_url}
              alt={news.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Rich Text Content */}
        <article
          className="prose prose-invert prose-gold max-w-none text-white/80 leading-relaxed text-base sm:text-lg space-y-4"
          dangerouslySetInnerHTML={{ __html: news.content }}
        />

        {/* Share & Back */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/berita" className="btn-outline-gold rounded-lg text-sm px-6 py-2.5">
            ← Kembali ke Semua Berita
          </Link>
          <div className="text-xs text-white/40">
            Diterbitkan resmi oleh redaksi COMPASS
          </div>
        </div>
      </div>
    </div>
  )
}
