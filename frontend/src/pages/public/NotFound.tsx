import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="font-heading text-6xl font-bold text-gold">404</h1>
      <p className="text-white/70 text-xl">Halaman tidak ditemukan</p>
      <Link to="/" className="btn-gold px-8 py-3 inline-block rounded">Kembali ke Beranda</Link>
    </div>
  )
}
