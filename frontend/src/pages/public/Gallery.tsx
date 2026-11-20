import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { getGalleryAlbums, getAlbumPhotos } from '../../services/endpoints'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import type { GalleryAlbum, GalleryPhoto } from '../../types'

export default function Gallery() {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  // 1. Ambil daftar album
  const { data: albumsData, isLoading: albumsLoading } = useQuery({
    queryKey: ['gallery-albums'],
    queryFn: getGalleryAlbums,
  })

  const albums: GalleryAlbum[] = albumsData?.data?.data || []
  const currentAlbumId = selectedAlbumId || albums[0]?.id

  // 2. Ambil foto dalam album yang dipilih
  const { data: photosData, isLoading: photosLoading } = useQuery({
    queryKey: ['album-photos', currentAlbumId],
    queryFn: () => getAlbumPhotos(currentAlbumId!),
    enabled: !!currentAlbumId,
  })

  const photos: GalleryPhoto[] = photosData?.data?.data || []

  // Fallback demo photos jika album belum memiliki upload foto
  const displayPhotos = photos.length > 0 ? photos : [
    { id: '1', album_id: 'default', image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80', caption: 'Semangat Tribun Maguwoharjo', sort_order: 1, created_at: '' },
    { id: '2', album_id: 'default', image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80', caption: 'Koreografi Supercan 2027', sort_order: 2, created_at: '' },
    { id: '3', album_id: 'default', image_url: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1200&q=80', caption: 'Away Day Bersama Keluarga Besar COMPASS', sort_order: 3, created_at: '' },
    { id: '4', album_id: 'default', image_url: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80', caption: 'Aksi Nyata Compass for Humanity', sort_order: 4, created_at: '' },
    { id: '5', album_id: 'default', image_url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80', caption: 'Kopdar dan Diskusi Suporter', sort_order: 5, created_at: '' },
    { id: '6', album_id: 'default', image_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80', caption: 'Euforia Kemenangan Elang Jawa', sort_order: 6, created_at: '' },
  ]

  const slides = displayPhotos.map(p => ({
    src: p.image_url,
    title: p.caption || 'Dokumentasi COMPASS',
  }))

  const handleOpenPhoto = (index: number) => {
    setPhotoIndex(index)
    setLightboxOpen(true)
  }

  return (
    <div className="py-12 md:py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
            Galeri Dokumentasi
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
            GALERI <span className="text-gold">COMPASS</span>
          </h1>
          <div className="gold-divider mx-auto mt-4" />
          <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
            Momen-momen tak terlupakan dari tribun, perjalanan away day, kopdar, dan aksi kemanusiaan.
          </p>
        </div>

        {/* Album Tabs */}
        {albumsLoading ? (
          <div className="flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            {albums.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAlbumId(a.id)}
                className={`px-5 py-2.5 rounded-full font-heading text-sm uppercase tracking-wide transition-all ${
                  (currentAlbumId === a.id)
                    ? 'bg-gold text-dark font-bold shadow-lg shadow-gold/20'
                    : 'bg-dark-card border border-white/10 text-white/70 hover:text-white hover:border-gold/50'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        {/* Photos Grid (Masonry look with CSS columns) */}
        {photosLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {displayPhotos.map((photo, index) => (
              <div
                key={photo.id || index}
                onClick={() => handleOpenPhoto(index)}
                className="card-dark rounded-xl overflow-hidden group cursor-pointer break-inside-avoid transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={photo.image_url}
                    alt={photo.caption || 'Foto Galeri'}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                    {photo.caption && (
                      <p className="text-white font-medium text-sm drop-shadow line-clamp-2">
                        {photo.caption}
                      </p>
                    )}
                    <span className="text-gold text-xs font-heading font-semibold uppercase mt-1 flex items-center gap-1">
                      <span>Perbesar Foto</span> 🔍
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Viewer */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={photoIndex}
        slides={slides}
      />
    </div>
  )
}
