import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMerchProductDetail, getSiteSettings } from '../../services/endpoints'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function MerchandiseDetail() {
  const { id } = useParams<{ id: string }>()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['merch-detail', id],
    queryFn: () => getMerchProductDetail(id!),
    enabled: !!id,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: getSiteSettings,
  })

  const product = data?.data?.data
  const settings = settingsData?.data?.data

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-4">
        <h2 className="font-heading text-2xl text-white">Produk Tidak Ditemukan</h2>
        <Link to="/merchandise" className="btn-gold mt-4 rounded text-sm px-6 py-2.5">
          Kembali ke Katalog
        </Link>
      </div>
    )
  }

  const images = product.images || []
  const defaultImage = images.find(i => i.is_primary)?.image_url ||
    images[0]?.image_url ||
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80'

  const currentDisplayImage = selectedImage || defaultImage
  const sizes = Array.isArray(product.sizes) ? product.sizes : []
  const rawOrderUrl = product.order_form_url || settings?.merch_global_form_url || ''
  const isGenericForm = !rawOrderUrl || rawOrderUrl.includes('forms.google.com')

  // Buat link WhatsApp langsung dengan pesan otomatis membawa detail produk & ukuran
  const waNumber = (settings?.contact_whatsapp || '+6281234567890').replace(/\D/g, '')
  const sizeText = selectedSize ? `Ukuran: ${selectedSize}` : 'Ukuran: (Belum dipilih / All Size)'
  const waMessage = encodeURIComponent(
    `Halo Admin Official Merch COMPASS,\n` +
    `Saya ingin memesan merchandise:\n` +
    `• Produk: ${product.name}\n` +
    `• ${sizeText}\n` +
    `• Harga: Rp ${Number(product.price).toLocaleString('id-ID')}\n\n` +
    `Mohon informasi ketersediaan stok dan prosedur pembayarannya. Terima kasih!`
  )
  const waOrderUrl = `https://wa.me/${waNumber}?text=${waMessage}`

  // Jika admin mengisi Google Form spesifik produk, gunakan URL tersebut. Jika tidak, gunakan WhatsApp resmi.
  const finalOrderUrl = isGenericForm ? waOrderUrl : rawOrderUrl

  return (
    <div className="py-12 md:py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          <span>/</span>
          <Link to="/merchandise" className="hover:text-gold transition-colors">Merchandise</Link>
          <span>/</span>
          <span className="text-white font-medium truncate">{product.name}</span>
        </div>

        {/* Main Product Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: Gallery Images */}
          <div className="lg:col-span-6 space-y-4">
            {/* Primary Large Image */}
            <div className="card-dark rounded-2xl overflow-hidden h-96 sm:h-[460px] bg-dark-surface border-white/10 relative">
              <img
                src={currentDisplayImage}
                alt={product.name}
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute top-4 left-4">
                <span className={`text-xs font-heading font-bold uppercase tracking-wider px-3 py-1 rounded shadow ${
                  product.stock_status === 'available'
                    ? 'bg-emerald-600 text-white'
                    : product.stock_status === 'preorder'
                    ? 'bg-amber-600 text-white'
                    : 'bg-red-600 text-white'
                }`}>
                  {product.stock_status === 'available' ? 'Tersedia' : product.stock_status === 'preorder' ? 'Pre-Order' : 'Stok Habis'}
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map(img => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img.image_url)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      currentDisplayImage === img.image_url
                        ? 'border-gold shadow-md'
                        : 'border-white/20 hover:border-white/50'
                    }`}
                  >
                    <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Details & Order CTA */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-gold font-heading text-xs uppercase tracking-widest font-semibold">
                COMPASS Official Merch
              </span>
              <h1 className="text-3xl sm:text-4xl font-heading font-black text-white uppercase mt-1">
                {product.name}
              </h1>
              <div className="font-mono font-bold text-3xl text-gold mt-3">
                Rp {Number(product.price).toLocaleString('id-ID')}
              </div>
            </div>

            {/* Sizes Selection */}
            {sizes.length > 0 && (
              <div className="border-t border-b border-white/10 py-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">
                    Pilih Ukuran:
                  </span>
                  {selectedSize && (
                    <span className="text-gold text-xs font-semibold">Terpilih: {selectedSize}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {sizes.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-12 h-11 px-3 rounded-lg font-heading text-sm uppercase font-bold transition-all ${
                        selectedSize === s
                          ? 'bg-gold text-dark border-2 border-gold shadow'
                          : 'bg-white/5 border border-white/20 text-white/80 hover:border-gold hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-white/80 font-heading text-sm font-semibold uppercase tracking-wider">
                Deskripsi Produk
              </h3>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Note & Info */}
            <div className="p-4 bg-primary/20 border border-primary-light/40 rounded-xl text-xs text-white/80 space-y-1.5">
              <div className="font-semibold text-gold">ℹ️ Informasi Pemesanan</div>
              <div>Pemesanan diproses melalui formulir resmi COMPASS. Tidak memerlukan pembuatan akun atau registrasi kartu di website.</div>
            </div>

            {/* Order CTA Button */}
            <div className="pt-2">
              <a
                href={finalOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-gold rounded-xl py-4 flex items-center justify-center gap-3 text-base font-bold shadow-xl text-center"
              >
                <span>{isGenericForm ? 'Pesan Sekarang Lewat WhatsApp' : 'Pesan Sekarang Lewat Formulir'}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
