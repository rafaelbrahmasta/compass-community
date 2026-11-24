import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Camera, Upload } from 'lucide-react'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetAlbums,
  adminCreateAlbum,
  adminUpdateAlbum,
  adminDeleteAlbum,
  getAlbumPhotos,
  adminUploadPhotos,
  adminDeletePhoto,
} from '../../services/endpoints'
import { getAssetUrl } from '../../services/api'
import type { GalleryAlbum, GalleryPhoto } from '../../types'

export default function AdminGallery() {
  const queryClient = useQueryClient()
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [albumModalOpen, setAlbumModalOpen] = useState(false)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null)

  // Album Form State
  const [albumName, setAlbumName] = useState('')
  const [albumDesc, setAlbumDesc] = useState('')

  // Photos Upload State
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Queries
  const { data: albumsData, isLoading: albumsLoading } = useQuery({
    queryKey: ['admin-gallery-albums'],
    queryFn: adminGetAlbums,
  })
  const albums: GalleryAlbum[] = albumsData?.data?.data || []
  const activeAlbumId = selectedAlbumId || albums[0]?.id
  const currentAlbum = albums.find(a => a.id === activeAlbumId)

  const { data: photosData, isLoading: photosLoading } = useQuery({
    queryKey: ['admin-album-photos', activeAlbumId],
    queryFn: () => getAlbumPhotos(activeAlbumId),
    enabled: !!activeAlbumId,
  })
  const photos: GalleryPhoto[] = photosData?.data?.data || []

  const handleOpenCreateAlbum = () => {
    setEditingAlbum(null)
    setAlbumName('')
    setAlbumDesc('')
    setAlbumModalOpen(true)
  }

  const handleOpenEditAlbum = (album: GalleryAlbum) => {
    setEditingAlbum(album)
    setAlbumName(album.name)
    setAlbumDesc(album.description)
    setAlbumModalOpen(true)
  }

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingAlbum) {
        await adminUpdateAlbum(editingAlbum.id, {
          name: albumName,
          description: albumDesc,
          sort_order: editingAlbum.sort_order,
        })
        toast.success('Album berhasil diperbarui!')
      } else {
        await adminCreateAlbum({
          name: albumName,
          description: albumDesc,
          sort_order: albums.length + 1,
        })
        toast.success('Album baru berhasil dibuat!')
      }
      setAlbumName('')
      setAlbumDesc('')
      queryClient.invalidateQueries({ queryKey: ['admin-gallery-albums'] })
      queryClient.invalidateQueries({ queryKey: ['gallery-albums'] })
      setAlbumModalOpen(false)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || 'Gagal menyimpan album.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAlbum = async (id: string) => {
    if (!confirm('Hapus album ini beserta seluruh foto di dalamnya?')) return
    try {
      await adminDeleteAlbum(id)
      toast.success('Album berhasil dihapus.')
      if (selectedAlbumId === id) setSelectedAlbumId('')
      queryClient.invalidateQueries({ queryKey: ['admin-gallery-albums'] })
      queryClient.invalidateQueries({ queryKey: ['gallery-albums'] })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || 'Gagal menghapus album.')
    }
  }

  const handleUploadPhotos = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAlbumId || !selectedFiles || selectedFiles.length === 0) return
    setSubmitting(true)
    try {
      const filesArray = Array.from(selectedFiles)
      await adminUploadPhotos(activeAlbumId, filesArray)
      toast.success(`${filesArray.length} foto berhasil diunggah!`)
      queryClient.invalidateQueries({ queryKey: ['admin-album-photos', activeAlbumId] })
      queryClient.invalidateQueries({ queryKey: ['album-photos', activeAlbumId] })
      setSelectedFiles(null)
      setPhotoModalOpen(false)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || 'Gagal mengunggah foto. Pastikan ukuran file total di bawah 50MB.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Hapus foto ini?')) return
    try {
      await adminDeletePhoto(photoId)
      toast.success('Foto dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-album-photos', activeAlbumId] })
      queryClient.invalidateQueries({ queryKey: ['album-photos', activeAlbumId] })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || 'Gagal menghapus foto.')
    }
  }

  if (albumsLoading) return <LoadingSpinner size="md" />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
            Kelola Galeri & Album Foto
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Buat album dokumentasi dan unggah banyak foto dokumentasi komunitas sekaligus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleOpenCreateAlbum}
            className="btn-outline-gold py-2 px-3.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Buat Album Baru</span>
          </button>
          {currentAlbum && (
            <button
              onClick={() => handleOpenEditAlbum(currentAlbum)}
              className="py-2 px-3.5 rounded-lg text-xs font-bold uppercase border border-white/20 text-white/80 hover:bg-white/10 flex items-center gap-1.5 transition-colors"
            >
              <Edit2 size={13} />
              <span>Edit Nama/Deskripsi Album</span>
            </button>
          )}
          <button
            onClick={() => setPhotoModalOpen(true)}
            disabled={!activeAlbumId}
            className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase disabled:opacity-50 flex items-center gap-1.5"
          >
            <Camera size={14} />
            <span>Upload Foto Sekaligus</span>
          </button>
        </div>
      </div>

      {/* Album Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {albums.map(a => (
          <div key={a.id} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setSelectedAlbumId(a.id)}
              className={`px-4 py-2 rounded-lg font-heading text-xs uppercase tracking-wider transition-all ${
                activeAlbumId === a.id
                  ? 'bg-gold text-dark font-bold'
                  : 'bg-dark-card border border-white/10 text-white/70 hover:text-white'
              }`}
            >
              {a.name}
            </button>
            <button
              onClick={() => handleDeleteAlbum(a.id)}
              className="text-white/30 hover:text-red-400 p-1 text-xs"
              title="Hapus Album"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Photos in Album */}
      {photosLoading ? (
        <LoadingSpinner size="md" />
      ) : photos.length === 0 ? (
        <div className="card-dark p-12 text-center rounded-xl max-w-md mx-auto">
          <span className="text-4xl mb-3 block">🖼️</span>
          <p className="text-white/60 text-sm">Belum ada foto dalam album ini.</p>
          <button
            onClick={() => setPhotoModalOpen(true)}
            className="btn-gold py-2 px-4 rounded text-xs mt-4 uppercase font-bold"
          >
            Upload Foto Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map(p => (
            <div key={p.id} className="card-dark rounded-xl overflow-hidden group relative">
              <div className="h-44 bg-dark-surface overflow-hidden">
                <img src={getAssetUrl(p.image_url)} alt="Foto" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDeletePhoto(p.id)}
                  className="p-1.5 bg-red-600 text-white rounded-md shadow hover:bg-red-700 text-xs"
                  title="Hapus Foto"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Buat / Edit Album */}
      <Modal
        isOpen={albumModalOpen}
        onClose={() => setAlbumModalOpen(false)}
        title={editingAlbum ? 'Edit Album Foto' : 'Buat Album Baru'}
        size="sm"
      >
        <form onSubmit={handleSaveAlbum} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nama Album</label>
            <input
              type="text"
              required
              value={albumName}
              onChange={e => setAlbumName(e.target.value)}
              placeholder="Contoh: Away Day Malang 2027"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Deskripsi Singkat</label>
            <textarea
              rows={3}
              value={albumDesc}
              onChange={e => setAlbumDesc(e.target.value)}
              placeholder="Catatan tentang rangkaian kegiatan..."
              className="w-full bg-dark border border-white/20 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setAlbumModalOpen(false)} className="btn-outline-gold py-2 px-3 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-4 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Menyimpan...' : editingAlbum ? 'Simpan Perubahan' : 'Buat Album'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Upload Banyak Foto */}
      <Modal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        title="Upload Banyak Foto Sekaligus"
        size="md"
      >
        <form onSubmit={handleUploadPhotos} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-2">
              Pilih Beberapa Foto (Bisa pilih sekaligus banyak)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              required
              onChange={e => setSelectedFiles(e.target.files)}
              className="w-full text-xs text-white/70 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold cursor-pointer border border-dashed border-white/20 p-4 rounded-xl text-center"
            />
            {selectedFiles && (
              <p className="text-xs text-gold mt-2 font-semibold">
                {selectedFiles.length} foto terpilih untuk diunggah.
              </p>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setPhotoModalOpen(false)} className="btn-outline-gold py-2 px-3 rounded text-xs">
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedFiles || selectedFiles.length === 0}
              className="btn-gold py-2 px-5 rounded text-xs font-bold disabled:opacity-50"
            >
              {submitting ? 'Mengunggah...' : 'Unggah Sekarang'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
