import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetCarousel,
  adminCreateSlide,
  adminUpdateSlide,
  adminUploadSlideImage,
  adminDeleteSlide,
} from '../../services/endpoints'
import type { CarouselSlide } from '../../types'

export default function AdminCarousel() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-carousel'],
    queryFn: adminGetCarousel,
  })

  const slides = data?.data?.data || []

  const handleOpenCreate = () => {
    setEditingSlide(null)
    setTitle('')
    setSubtitle('')
    setSortOrder(slides.length + 1)
    setIsActive(true)
    setImageFile(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (slide: CarouselSlide) => {
    setEditingSlide(slide)
    setTitle(slide.title)
    setSubtitle(slide.subtitle)
    setSortOrder(slide.sort_order)
    setIsActive(slide.is_active)
    setImageFile(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingSlide) {
        // Update slide info
        await adminUpdateSlide(editingSlide.id, {
          title,
          subtitle,
          sort_order: sortOrder,
          is_active: isActive,
        })
        // Upload image jika dipilih
        if (imageFile) {
          await adminUploadSlideImage(editingSlide.id, imageFile)
        }
        toast.success('Slide carousel berhasil diperbarui!')
      } else {
        // Create slide
        const form = new FormData()
        form.append('title', title)
        form.append('subtitle', subtitle)
        form.append('sort_order', String(sortOrder))
        form.append('is_active', String(isActive))
        const res = await adminCreateSlide(form)
        const newSlide = res.data.data
        if (imageFile) {
          await adminUploadSlideImage(newSlide.id, imageFile)
        }
        toast.success('Slide carousel baru berhasil ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] })
      queryClient.invalidateQueries({ queryKey: ['public-carousel'] })
      setModalOpen(false)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Gagal menyimpan slide.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus slide carousel ini?')) return
    try {
      await adminDeleteSlide(id)
      toast.success('Slide berhasil dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-carousel'] })
      queryClient.invalidateQueries({ queryKey: ['public-carousel'] })
    } catch {
      toast.error('Gagal menghapus slide.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
            Kelola Hero Carousel
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Atur gambar, judul, dan urutan slide carousel yang tampil di halaman beranda.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn-gold rounded-lg py-2.5 px-4 text-xs font-bold uppercase">
          + Tambah Slide Baru
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {slides.map(slide => (
            <div key={slide.id} className="card-dark rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-44 bg-dark-surface relative overflow-hidden">
                  {slide.image_url ? (
                    <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                      (Belum ada gambar)
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-dark/80 px-2 py-0.5 rounded text-[10px] font-bold text-gold">
                      Urutan: {slide.sort_order}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${slide.is_active ? 'bg-emerald-600 text-white' : 'bg-white/20 text-white/70'}`}>
                      {slide.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-heading font-bold text-lg text-white uppercase line-clamp-1">
                    {slide.title}
                  </h3>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">
                    {slide.subtitle}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(slide)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(slide.id)}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSlide ? 'Edit Slide Carousel' : 'Tambah Slide Carousel'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Judul Utama</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: BERSAMA KITA KUAT"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Subjudul / Deskripsi</label>
            <input
              type="text"
              required
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="Contoh: Satu hati, satu jiwa, satu PSS Sleman"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Urutan Tampil</label>
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Status Slide</label>
              <select
                value={isActive ? 'true' : 'false'}
                onChange={e => setIsActive(e.target.value === 'true')}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              >
                <option value="true">Aktif (Ditampilkan)</option>
                <option value="false">Nonaktif (Disembunyikan)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
              File Gambar Slide (JPG/PNG/WebP, Maks 5MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={e => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold hover:file:bg-primary-light cursor-pointer"
            />
            {editingSlide?.image_url && !imageFile && (
              <p className="text-[10px] text-white/40 mt-1">Biarkan kosong jika tidak ingin mengubah gambar.</p>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline-gold py-2 px-4 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-5 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan Slide'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
