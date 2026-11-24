import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMerchCategories, getMerchProducts } from '../../services/endpoints'
import { getAssetUrl } from '../../services/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Merchandise() {
  const [selectedCat, setSelectedCat] = useState<string | undefined>(undefined)

  const { data: catData } = useQuery({
    queryKey: ['merch-categories'],
    queryFn: getMerchCategories,
  })

  const { data: prodData, isLoading } = useQuery({
    queryKey: ['merch-products', selectedCat],
    queryFn: () => getMerchProducts({ category_id: selectedCat }),
  })

  const categories = catData?.data?.data || []
  const products = prodData?.data?.data || []

  return (
    <div className="py-12 md:py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
            Official Store
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
            MERCHANDISE <span className="text-gold">COMPASS</span>
          </h1>
          <div className="gold-divider mx-auto mt-4" />
          <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
            Dukung klub dan komunitas dengan merchandise resmi berkualitas tinggi. Seluruh hasil penjualan digunakan untuk operasional suporter & program sosial.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setSelectedCat(undefined)}
            className={`px-5 py-2 rounded-full font-heading text-sm uppercase tracking-wide transition-all ${
              selectedCat === undefined
                ? 'bg-gold text-dark font-bold shadow-lg shadow-gold/20'
                : 'bg-dark-card border border-white/10 text-white/70 hover:text-white hover:border-gold/50'
            }`}
          >
            Semua Produk
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-5 py-2 rounded-full font-heading text-sm uppercase tracking-wide transition-all ${
                selectedCat === c.id
                  ? 'bg-gold text-dark font-bold shadow-lg shadow-gold/20'
                  : 'bg-dark-card border border-white/10 text-white/70 hover:text-white hover:border-gold/50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div className="card-dark p-12 text-center max-w-md mx-auto rounded-2xl">
            <span className="text-4xl mb-3 block">👕</span>
            <p className="text-white/60 text-sm">Belum ada produk untuk kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {products.map(p => {
              const primaryImg = p.images?.find(img => img.is_primary)?.image_url ||
                p.images?.[0]?.image_url ||
                'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80'

              const sizes = Array.isArray(p.sizes) ? p.sizes : []

              return (
                <Link
                  key={p.id}
                  to={`/merchandise/${p.id}`}
                  className="card-dark rounded-xl overflow-hidden group flex flex-col justify-between"
                >
                  <div>
                    {/* Image */}
                    <div className="h-64 overflow-hidden relative bg-dark-surface">
                      <img
                        src={getAssetUrl(primaryImg)}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Stock Badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`text-[10px] font-heading font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow ${
                          p.stock_status === 'available'
                            ? 'bg-emerald-600 text-white'
                            : p.stock_status === 'preorder'
                            ? 'bg-amber-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}>
                          {p.stock_status === 'available' ? 'Tersedia' : p.stock_status === 'preorder' ? 'Pre-Order' : 'Habis'}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-5">
                      <h3 className="font-heading font-bold text-lg text-white group-hover:text-gold transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      <div className="font-mono font-bold text-gold text-lg mt-1">
                        Rp {Number(p.price).toLocaleString('id-ID')}
                      </div>

                      {/* Sizes badges */}
                      {sizes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {sizes.map((s, i) => (
                            <span key={i} className="text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded text-white/70">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <span className="w-full btn-outline-gold py-2 rounded text-xs flex items-center justify-center font-bold">
                      Lihat Detail Produk
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
