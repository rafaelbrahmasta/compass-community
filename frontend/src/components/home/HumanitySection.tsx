import { useState } from 'react'
import Modal from '../common/Modal'
import type { HumanitySettings } from '../../types'

interface HumanitySectionProps {
  settings: HumanitySettings | null
}

export default function HumanitySection({ settings }: HumanitySectionProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const programText = settings?.program_text ||
    'Compass for Humanity adalah inisiatif sosial dari keluarga besar COMPASS yang berfokus pada aksi kemanusiaan, bakti sosial, dan pemberdayaan masyarakat. Kami percaya cinta pada sepak bola harus berbanding lurus dengan kepedulian terhadap sesama.'

  const qrImageUrl = settings?.qr_image_url
  const bankName = settings?.bank_name || 'BCA'
  const accountName = settings?.account_name || 'COMPASS PSS Sleman'
  const accountNumber = settings?.account_number || '123-456-7890'

  return (
    <section className="py-20 bg-gradient-to-b from-dark to-primary-dark relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 font-heading text-xs uppercase tracking-wider rounded-full mb-4">
              <span>❤️</span> Gerakan Kemanusiaan
            </div>
            <h2 className="section-title text-3xl sm:text-4xl text-white">
              COMPASS FOR <span className="text-gold">HUMANITY</span>
            </h2>
            <div className="gold-divider mt-4 mb-6" />
            <p className="text-white/80 text-base sm:text-lg leading-relaxed">
              {programText}
            </p>

            <div className="mt-8 flex flex-wrap gap-4 items-center">
              <button
                onClick={() => setModalOpen(true)}
                className="btn-gold rounded-lg flex items-center gap-2 shadow-lg hover:shadow-gold/20"
              >
                <span>Salurkan Donasi</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <span className="text-white/50 text-sm">
                100% donasi disalurkan untuk program sosial
              </span>
            </div>
          </div>

          {/* Right Visual Card */}
          <div className="card-dark p-8 border-gold/30 bg-dark/80 relative">
            <h3 className="font-heading font-bold text-lg text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gold animate-pulse" /> Rekening Donasi Resmi
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-white/50 text-xs uppercase">Nama Bank</div>
                  <div className="font-heading font-bold text-white text-lg">{bankName}</div>
                </div>
                <span className="text-2xl">🏦</span>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-white/50 text-xs uppercase">Nomor Rekening</div>
                  <div className="font-mono font-bold text-gold text-lg tracking-wider">{accountNumber}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(accountNumber)
                    alert('Nomor rekening berhasil disalin!')
                  }}
                  className="text-xs text-white/60 hover:text-gold border border-white/20 hover:border-gold px-2.5 py-1 rounded transition-colors"
                >
                  Salin
                </button>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-white/50 text-xs uppercase">Atas Nama</div>
                <div className="font-semibold text-white">{accountName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Donation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Donasi Compass for Humanity"
        size="md"
      >
        <div className="text-center space-y-5">
          <p className="text-white/70 text-sm">
            Pindai kode QRIS di bawah ini dengan aplikasi mobile banking atau e-wallet Anda:
          </p>

          {/* QR Code Container */}
          <div className="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto max-w-[260px]">
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="QR Code Donasi" className="w-full h-auto rounded" />
            ) : (
              // Default QR Placeholder
              <div className="w-56 h-56 bg-dark border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-4 text-center rounded">
                <span className="text-4xl mb-2">📱</span>
                <span className="text-xs text-white/80 font-mono font-semibold">QR CODE RESMI</span>
                <span className="text-[10px] text-white/60 mt-1">Scan via BCA / Mandiri / GoPay / OVO</span>
              </div>
            )}
          </div>

          {/* Bank Account Info inside modal */}
          <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-white/50">Bank:</span>
              <span className="text-white font-semibold">{bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">No. Rekening:</span>
              <span className="text-gold font-mono font-bold">{accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Atas Nama:</span>
              <span className="text-white font-semibold">{accountName}</span>
            </div>
          </div>

          <div className="text-xs text-white/50 italic">
            *Mohon konfirmasi transfer melalui menu Kontak bila memerlukan bukti donasi.
          </div>

          <button
            onClick={() => setModalOpen(false)}
            className="w-full btn-outline-gold py-2.5 rounded text-sm"
          >
            Tutup
          </button>
        </div>
      </Modal>
    </section>
  )
}
