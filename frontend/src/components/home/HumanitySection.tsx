import { useState } from 'react'
import toast from 'react-hot-toast'
import { Heart, Landmark, Copy, ArrowRight, QrCode } from 'lucide-react'
import Modal from '../common/Modal'
import Reveal from '../common/Reveal'
import type { HumanitySettings } from '../../types'

interface HumanitySectionProps {
  settings: HumanitySettings | null
}

export default function HumanitySection({ settings }: HumanitySectionProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const programText = settings?.program_text ||
    'Compass for Humanity adalah inisiatif sosial dari keluarga besar COMPASS yang berfokus pada aksi kemanusiaan, bakti sosial, dan pemberdayaan masyarakat. Kami percaya cinta pada sepak bola harus berbanding lurus dengan kepedulian terhadap sesama.'

  const qrImageUrl = settings?.qr_image_url
  const bankName = settings?.bank_name || 'Bank Rekening Resmi'
  const accountName = settings?.account_name || 'COMPASS PSS Sleman'
  const rawAccountNumber = settings?.account_number
  const isDummyAccount = !rawAccountNumber || rawAccountNumber === '123-456-7890'
  const accountNumber = isDummyAccount ? null : rawAccountNumber

  const copyAccountNumber = () => {
    if (!accountNumber) return
    navigator.clipboard.writeText(accountNumber)
    toast.success('Nomor rekening berhasil disalin!')
  }

  return (
    <section className="py-20 bg-gradient-to-b from-dark via-primary-dark/80 to-dark relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Text */}
          <Reveal variant="fade-up">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-500/15 border border-red-500/30 text-red-400 font-heading text-xs uppercase tracking-wider rounded-full mb-4">
                <Heart size={14} strokeWidth={1.5} className="fill-red-400/40 text-red-400" />
                <span>Gerakan Kemanusiaan Suporter</span>
              </div>
              <h2 className="section-title text-3xl sm:text-4xl text-white">
                COMPASS FOR <span className="text-gold">HUMANITY</span>
              </h2>
              <div className="w-16 h-1 bg-gold mt-4 mb-6 rounded-full" />
              <p className="text-white/80 text-base sm:text-lg leading-relaxed">
                {programText}
              </p>

              <div className="mt-8 flex flex-wrap gap-4 items-center">
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-6 py-3.5 rounded-xl bg-gold text-dark font-heading font-black uppercase tracking-wider text-sm hover:brightness-110 flex items-center gap-2 shadow-lg shadow-gold/20 transition-all duration-300"
                >
                  <span>Salurkan Donasi</span>
                  <ArrowRight size={16} strokeWidth={1.5} />
                </button>
                <span className="text-white/50 text-xs sm:text-sm">
                  Laporan pertanggungjawaban donasi dirilis berkala oleh pengurus COMPASS
                </span>
              </div>
            </div>
          </Reveal>

          {/* Right Visual Card */}
          <Reveal variant="scale-in" delay={150}>
            <div className="bg-[#0b120e] p-8 border border-gold/30 rounded-2xl shadow-xl shadow-black/50 relative">
              <h3 className="font-heading font-bold text-lg text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
                <span>Rekening Donasi Resmi</span>
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                  <div>
                    <div className="text-white/50 text-xs uppercase font-medium">Nama Bank</div>
                    <div className="font-heading font-black text-white text-lg tracking-wide">{bankName}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                    <Landmark size={20} strokeWidth={1.5} />
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                  <div>
                    <div className="text-white/50 text-xs uppercase font-medium">Nomor Rekening</div>
                    {accountNumber ? (
                      <div className="font-mono font-black text-gold text-lg tracking-wider">{accountNumber}</div>
                    ) : (
                      <div className="text-white/70 text-xs mt-1 italic">Hubungi kontak resmi sekretariat untuk penyaluran</div>
                    )}
                  </div>
                  {accountNumber && (
                    <button
                      onClick={copyAccountNumber}
                      className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-dark hover:bg-gold border border-white/20 hover:border-gold px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Copy size={13} strokeWidth={1.5} />
                      <span>Salin</span>
                    </button>
                  )}
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-white/50 text-xs uppercase font-medium">Atas Nama</div>
                  <div className="font-semibold text-white text-sm mt-0.5">{accountName}</div>
                </div>
              </div>
            </div>
          </Reveal>

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
          <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto max-w-[260px]">
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="QR Code Donasi" className="w-full h-auto rounded-xl" />
            ) : (
              <div className="w-56 h-56 bg-dark border-2 border-dashed border-gray-400 flex flex-col items-center justify-center p-4 text-center rounded-xl">
                <QrCode size={36} strokeWidth={1.5} className="text-gold mb-2" />
                <span className="text-xs text-white/90 font-mono font-bold">QR CODE RESMI COMPASS</span>
                <span className="text-[10px] text-white/60 mt-1">BCA • Mandiri • GoPay • OVO</span>
              </div>
            )}
          </div>

          {/* Bank Account Info inside modal */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-left text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-xs">Bank:</span>
              <span className="text-white font-semibold">{bankName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-xs">No. Rekening:</span>
              <div className="flex items-center gap-2">
                {accountNumber ? (
                  <>
                    <span className="text-gold font-mono font-bold">{accountNumber}</span>
                    <button
                      type="button"
                      onClick={copyAccountNumber}
                      className="text-white/60 hover:text-gold"
                      title="Salin"
                    >
                      <Copy size={13} strokeWidth={1.5} />
                    </button>
                  </>
                ) : (
                  <span className="text-white/60 text-xs italic">Menghubungi Sekretariat</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-xs">Atas Nama:</span>
              <span className="text-white font-semibold">{accountName}</span>
            </div>
          </div>

          <div className="text-xs text-white/50 italic">
            *Konfirmasi donasi dapat dilakukan melalui halaman Kontak bila membutuhkan pencatatan.
          </div>

          <button
            onClick={() => setModalOpen(false)}
            className="w-full py-2.5 rounded-xl border border-gold/40 text-gold hover:bg-gold hover:text-dark text-sm font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </Modal>
    </section>
  )
}
