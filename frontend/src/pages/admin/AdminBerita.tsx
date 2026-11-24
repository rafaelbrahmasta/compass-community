import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import RichTextEditor from '../../components/common/RichTextEditor'
import {
  adminGetNews,
  adminCreateNews,
  adminUpdateNews,
  adminDeleteNews,
  adminUploadNewsThumbnail,
} from '../../services/endpoints'
import type { News, NewsStatus } from '../../types'

export default function AdminBerita() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-news-list'], queryFn: adminGetNews })
  const newsList = data?.data?.data || []

  const [modalOpen, setModalOpen] = useState(false)
  const [editingNews, setEditingNews] = useState<News | null>(null)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [author, setAuthor] = useState('Redaksi COMPASS')
  const [status, setStatus] = useState<NewsStatus>('draft')
  const [content, setContent] = useState('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleOpenCreate = () => {
    setEditingNews(null)
    setTitle('')
    setSummary('')
    setAuthor('Redaksi COMPASS')
    setStatus('draft')
    setContent('')
    setThumbnailFile(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (n: News) => {
    setEditingNews(n)
    setTitle(n.title)
    setSummary(n.summary)
    setAuthor(n.author)
    setStatus(n.status)
    setContent(n.content)
    setThumbnailFile(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingNews) {
        await adminUpdateNews(editingNews.id, {
          title,
          summary,
          author,
          status,
          content,
        })
        if (thumbnailFile) {
          try {
            await adminUploadNewsThumbnail(editingNews.id, thumbnailFile)
          } catch {
            toast.error('Berita diperbarui, namun thumbnail gagal diunggah.')
          }
        }
        toast.success('Berita berhasil diperbarui!')
      } else {
        const res = await adminCreateNews({
          title,
          summary,
          author,
          status,
          content,
        })
        const newNews = res.data.data
        if (thumbnailFile) {
          try {
            await adminUploadNewsThumbnail(newNews.id, thumbnailFile)
          } catch {
            toast.error('Berita dibuat, namun thumbnail gagal diunggah.')
          }
        }
        toast.success(status === 'published' ? 'Berita baru berhasil diterbitkan!' : 'Konsep berita (draft) berhasil disimpan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-news-list'] })
      queryClient.invalidateQueries({ queryKey: ['public-news-list'] })
      queryClient.invalidateQueries({ queryKey: ['public-news-home'] })
      setModalOpen(false)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan berita.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus artikel berita ini?')) return
    try {
      await adminDeleteNews(id)
      toast.success('Berita dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-news-list'] })
      queryClient.invalidateQueries({ queryKey: ['public-news-list'] })
      queryClient.invalidateQueries({ queryKey: ['public-news-home'] })
    } catch {
      toast.error('Gagal menghapus berita.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
            Kelola Warta & Berita
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Publikasikan artikel, kabar klub PSS Sleman, serta liputan suporter.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase"
        >
          + Tulis Berita Baru
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : newsList.length === 0 ? (
        <div className="card-dark p-12 text-center rounded-xl max-w-md mx-auto">
          <span className="text-4xl mb-3 block">📰</span>
          <p className="text-white/60 text-sm">Belum ada berita yang ditulis.</p>
        </div>
      ) : (
        <div className="card-dark rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-heading text-white">
                <tr>
                  <th className="p-4">Thumbnail</th>
                  <th className="p-4">Judul Berita</th>
                  <th className="p-4">Penulis</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {newsList.map(n => (
                  <tr key={n.id} className="hover:bg-white/5">
                    <td className="p-4 w-20">
                      <div className="w-14 h-10 rounded overflow-hidden bg-dark-surface">
                        {n.thumbnail_url ? (
                          <img src={n.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs">📷</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white max-w-md line-clamp-1">{n.title}</div>
                      <div className="text-xs text-white/40 line-clamp-1">{n.summary}</div>
                    </td>
                    <td className="p-4 text-xs text-gold">
                      {n.author}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        n.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {n.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(n)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingNews ? 'Edit Berita' : 'Tulis Berita Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Judul Berita</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Masukkan judul artikel yang menarik..."
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Penulis</label>
              <input
                type="text"
                required
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Status Publikasi</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as NewsStatus)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              >
                <option value="published">Langsung Tayang (Published)</option>
                <option value="draft">Simpan Konsep (Draft)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Ringkasan Singkat (Lead Paragraph)</label>
            <textarea
              rows={2}
              required
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Ringkasan 1-2 kalimat untuk preview di kartu berita..."
              className="w-full bg-dark border border-white/20 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
              Foto Thumbnail (JPG/PNG/WebP, Maks 5MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
              Konten Lengkap Berita (Editor TipTap)
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Tulis naskah berita secara lengkap dengan format heading, list, quote..."
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline-gold py-2 px-3 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-5 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan Berita'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
