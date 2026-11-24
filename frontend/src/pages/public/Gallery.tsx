import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { getGalleryAlbums, getAlbumPhotos } from '../../services/endpoints'
import { getAssetUrl } from '../../services/api'
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

  const slides = photos.map(p => ({
    src: getAssetUrl(p.image_url),
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
        ) : photos.length === 0 ? (
          <div className="card-dark p-12 text-center max-w-md mx-auto rounded-2xl border-white/10">
            <span className="text-4xl mb-3 block">📸</span>
            <h3 className="font-heading font-bold text-lg text-white">Album Belum Memiliki Foto</h3>
            <p className="text-white/60 text-sm mt-1">Dokumentasi kegiatan akan segera diunggah oleh tim media COMPASS.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {photos.map((photo, index) => (
              <div
                key={photo.id || index}
                onClick={() => handleOpenPhoto(index)}
                className="card-dark rounded-xl overflow-hidden group cursor-pointer break-inside-avoid transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={getAssetUrl(photo.image_url)}
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
