import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetMerchCategories,
  adminCreateMerchCategory,
  adminDeleteMerchCategory,
  adminGetMerchProducts,
  adminCreateMerchProduct,
  adminUpdateMerchProduct,
  adminDeleteMerchProduct,
  adminUploadMerchImage,
  adminDeleteMerchImage,
} from '../../services/endpoints'
import type { MerchProduct, MerchCategory } from '../../types'

const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL']

export default function AdminMerch() {
  const queryClient = useQueryClient()

  // Queries
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['admin-merch-cats'],
    queryFn: adminGetMerchCategories,
  })
  const { data: prodData, isLoading: prodLoading } = useQuery({
    queryKey: ['admin-merch-products'],
    queryFn: adminGetMerchProducts,
  })

  const categories: MerchCategory[] = catData?.data?.data || []
  const products: MerchProduct[] = prodData?.data?.data || []

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<MerchProduct | null>(null)
  const [selectedProductForImages, setSelectedProductForImages] = useState<MerchProduct | null>(null)

  // Product Form State
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number>(100000)
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S', 'M', 'L', 'XL'])
  const [stockStatus, setStockStatus] = useState<'available' | 'preorder' | 'out_of_stock'>('available')
  const [orderFormUrl, setOrderFormUrl] = useState('')
  const [sortOrder, setSortOrder] = useState(0)

  // Category Form State
  const [newCatName, setNewCatName] = useState('')

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleOpenCreateProduct = () => {
    setEditingProduct(null)
    setName('')
    setCategoryId(categories[0]?.id || '')
    setDescription('')
    setPrice(150000)
    setSelectedSizes(['S', 'M', 'L', 'XL'])
    setStockStatus('available')
    setOrderFormUrl('')
    setSortOrder(products.length + 1)
    setProductModalOpen(true)
  }

  const handleOpenEditProduct = (p: MerchProduct) => {
    setEditingProduct(p)
    setName(p.name)
    setCategoryId(p.category_id)
    setDescription(p.description)
    setPrice(Number(p.price))
    setSelectedSizes(Array.isArray(p.sizes) ? p.sizes : [])
    setStockStatus(p.stock_status as any)
    setOrderFormUrl(p.order_form_url || '')
    setSortOrder(p.sort_order)
    setProductModalOpen(true)
  }

  const handleToggleSize = (s: string) => {
    if (selectedSizes.includes(s)) {
      setSelectedSizes(selectedSizes.filter(x => x !== s))
    } else {
      setSelectedSizes([...selectedSizes, s])
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingProduct) {
        await adminUpdateMerchProduct(editingProduct.id, {
          name,
          category_id: categoryId,
          description,
          price: String(price) as any,
          sizes: selectedSizes,
          stock_status: stockStatus,
          order_form_url: orderFormUrl || null,
          sort_order: sortOrder,
        })
        toast.success('Produk berhasil diperbarui!')
      } else {
        await adminCreateMerchProduct({
          name,
          category_id: categoryId,
          description,
          price: String(price) as any,
          sizes: selectedSizes,
          stock_status: stockStatus,
          order_form_url: orderFormUrl || null,
          sort_order: sortOrder,
        })
        toast.success('Produk baru ditambahkan!')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-merch-products'] })
      queryClient.invalidateQueries({ queryKey: ['merch-products'] })
      setProductModalOpen(false)
    } catch {
      toast.error('Gagal menyimpan produk.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Hapus produk merchandise ini?')) return
    try {
      await adminDeleteMerchProduct(id)
      toast.success('Produk dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-merch-products'] })
      queryClient.invalidateQueries({ queryKey: ['merch-products'] })
    } catch {
      toast.error('Gagal menghapus produk.')
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName) return
    try {
      await adminCreateMerchCategory({ name: newCatName, sort_order: categories.length + 1 })
      toast.success('Kategori baru ditambahkan!')
      setNewCatName('')
      queryClient.invalidateQueries({ queryKey: ['admin-merch-cats'] })
      queryClient.invalidateQueries({ queryKey: ['merch-categories'] })
      setCatModalOpen(false)
    } catch {
      toast.error('Gagal menambahkan kategori.')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return
    try {
      await adminDeleteMerchCategory(id)
      toast.success('Kategori dihapus.')
      queryClient.invalidateQueries({ queryKey: ['admin-merch-cats'] })
      queryClient.invalidateQueries({ queryKey: ['merch-categories'] })
    } catch {
      toast.error('Gagal menghapus kategori. Pastikan tidak ada produk di dalamnya.')
    }
  }

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductForImages || !imageFile) return
    setSubmitting(true)
    try {
      await adminUploadMerchImage(selectedProductForImages.id, imageFile)
      toast.success('Foto produk berhasil diunggah!')
      queryClient.invalidateQueries({ queryKey: ['admin-merch-products'] })
      queryClient.invalidateQueries({ queryKey: ['merch-products'] })
      setImageFile(null)
      setImageModalOpen(false)
    } catch {
      toast.error('Gagal mengunggah foto produk.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
            Kelola Merchandise
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Katalog produk suporter, kategori, ukuran, foto produk, dan form pemesanan Google Form.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setCatModalOpen(true)}
            className="btn-outline-gold py-2 px-3.5 rounded-lg text-xs font-bold uppercase"
          >
            🏷️ Kelola Kategori
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase"
          >
            + Tambah Produk
          </button>
        </div>
      </div>

      {/* Products List */}
      {prodLoading ? (
        <LoadingSpinner size="md" />
      ) : products.length === 0 ? (
        <div className="card-dark p-12 text-center rounded-xl max-w-md mx-auto">
          <span className="text-4xl mb-3 block">👕</span>
          <p className="text-white/60 text-sm">Belum ada produk merchandise.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => {
            const cat = categories.find(c => c.id === p.category_id)
            return (
              <div key={p.id} className="card-dark rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-heading font-bold text-gold uppercase">
                      {cat?.name || 'Kategori'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      p.stock_status === 'available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {p.stock_status === 'available' ? 'Tersedia' : p.stock_status === 'preorder' ? 'Pre-Order' : 'Habis'}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-xl text-white uppercase mt-1">{p.name}</h3>
                  <div className="font-mono font-bold text-lg text-gold mt-1">
                    Rp {Number(p.price).toLocaleString('id-ID')}
                  </div>
                  <p className="text-white/60 text-xs mt-2 line-clamp-2">{p.description}</p>
                </div>

                <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedProductForImages(p)
                      setImageModalOpen(true)
                    }}
                    className="text-xs text-gold hover:underline font-semibold"
                  >
                    📷 Upload Foto
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditProduct(p)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Product Form */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Edit Produk Merchandise' : 'Tambah Produk Baru'}
        size="md"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nama Produk</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Jersey Home PSS Sleman 2027"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Kategori</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Harga (Rupiah)</label>
              <input
                type="number"
                min="0"
                step="5000"
                required
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold font-mono"
              />
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-2">Ukuran Tersedia</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SIZES.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => handleToggleSize(s)}
                  className={`px-3 py-1 rounded text-xs font-heading font-bold uppercase transition-all ${
                    selectedSizes.includes(s)
                      ? 'bg-gold text-dark border border-gold'
                      : 'bg-white/5 border border-white/20 text-white/60 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Status Stok</label>
              <select
                value={stockStatus}
                onChange={e => setStockStatus(e.target.value as any)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              >
                <option value="available">Tersedia (Ready Stock)</option>
                <option value="preorder">Pre-Order</option>
                <option value="out_of_stock">Stok Habis</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Urutan</label>
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Link Google Form Pemesanan Khusus</label>
            <input
              type="url"
              value={orderFormUrl}
              onChange={e => setOrderFormUrl(e.target.value)}
              placeholder="Kosongkan jika menggunakan form merchandise global"
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Deskripsi Produk</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Bahan, kualitas sablon, panduan ukuran..."
              className="w-full bg-dark border border-white/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setProductModalOpen(false)} className="btn-outline-gold py-2 px-3 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-gold py-2 px-4 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Kelola Kategori */}
      <Modal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title="Kelola Kategori Merchandise"
        size="md"
      >
        <div className="space-y-6">
          <form onSubmit={handleCreateCategory} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nama Kategori Baru</label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Contoh: Jaket / Syal / Topi"
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <button type="submit" className="btn-gold py-2 px-4 rounded-lg text-xs font-bold uppercase whitespace-nowrap">
              Tambah
            </button>
          </form>

          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="text-white/60 text-xs uppercase font-semibold mb-2">Daftar Kategori:</div>
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2.5 bg-dark rounded border border-white/5 text-sm">
                <span className="text-white font-medium">{c.name}</span>
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal Upload Image */}
      <Modal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title={`Upload Foto: ${selectedProductForImages?.name}`}
        size="sm"
      >
        <form onSubmit={handleUploadImage} className="space-y-4">
          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Pilih Gambar Produk</label>
            <input
              type="file"
              accept="image/*"
              required
              onChange={e => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold cursor-pointer"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setImageModalOpen(false)} className="btn-outline-gold py-2 px-3 rounded text-xs">
              Batal
            </button>
            <button type="submit" disabled={submitting || !imageFile} className="btn-gold py-2 px-4 rounded text-xs font-bold disabled:opacity-50">
              {submitting ? 'Mengunggah...' : 'Unggah Foto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
