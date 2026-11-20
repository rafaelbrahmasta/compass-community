import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getSiteSettings, sendContactMessage } from '../../services/endpoints'

export default function Contact() {
  const { data } = useQuery({
    queryKey: ['site-settings'],
    queryFn: getSiteSettings,
  })

  const settings = data?.data?.data

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await sendContactMessage({ name, email, message })
      toast.success('Pesan Anda berhasil dikirim! Admin kami akan segera merespons.')
      setName('')
      setEmail('')
      setMessage('')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Gagal mengirim pesan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const cleanWa = settings?.contact_whatsapp?.replace(/\D/g, '') || '6281234567890'

  return (
    <div className="py-12 md:py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
            Hubungi Kami
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
            KONTAK <span className="text-gold">COMPASS</span>
          </h1>
          <div className="gold-divider mx-auto mt-4" />
          <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
            Punya pertanyaan mengenai keanggotaan, tiket, donasi, atau ingin berkolaborasi? Jangan ragu untuk menghubungi sekretariat COMPASS.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Contact Info & Maps */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card-dark p-8 rounded-2xl border-gold/20 space-y-6">
              <h2 className="font-heading font-bold text-2xl text-white uppercase tracking-wide">
                Sekretariat Komunitas
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3 text-white/80">
                  <span className="text-xl text-gold shrink-0">📍</span>
                  <div>
                    <div className="font-semibold text-white">Alamat</div>
                    <div>{settings?.address || 'Yogyakarta, Daerah Istimewa Yogyakarta, Indonesia'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-white/80">
                  <span className="text-xl text-gold shrink-0">✉️</span>
                  <div>
                    <div className="font-semibold text-white">Email Resmi</div>
                    <a href={`mailto:${settings?.contact_email || 'compass@compass.id'}`} className="hover:text-gold transition-colors">
                      {settings?.contact_email || 'compass@compass.id'}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-white/80">
                  <span className="text-xl text-gold shrink-0">📱</span>
                  <div>
                    <div className="font-semibold text-white">WhatsApp & Telepon</div>
                    <a
                      href={`https://wa.me/${cleanWa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gold transition-colors inline-block text-gold font-semibold"
                    >
                      {settings?.contact_whatsapp || '+62 812-3456-7890'} (Kirim Pesan WhatsApp)
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Embedded Google Maps */}
            <div className="card-dark rounded-2xl overflow-hidden h-64 border-white/10 relative">
              <iframe
                title="Lokasi Komunitas COMPASS"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126497.0259837965!2d110.3344686!3d-7.7554906!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e7a599bd355e3d1%3A0x4027a76e352e4a0!2sStadion%20Maguwoharjo!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Right: Interactive Message Form */}
          <div className="lg:col-span-7">
            <div className="card-dark p-8 sm:p-10 rounded-2xl border-gold/30">
              <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white uppercase tracking-wide mb-2">
                Kirim Pesan Kepada Pengurus
              </h2>
              <p className="text-white/60 text-sm mb-8">
                Isi formulir di bawah ini dan pesan akan langsung masuk ke dashboard admin kami.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                    Nama Lengkap <span className="text-gold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Masukkan nama Anda"
                    className="w-full bg-dark border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                    Alamat Email <span className="text-gold">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full bg-dark border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-semibold uppercase tracking-wider mb-2">
                    Isi Pesan <span className="text-gold">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tuliskan pertanyaan, saran, atau keperluan Anda..."
                    className="w-full bg-dark border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-gold rounded-xl py-3.5 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Mengirimkan Pesan...</span>
                  ) : (
                    <>
                      <span>Kirim Pesan Sekarang</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
