import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetHumanity,
  adminUpdateHumanity,
  adminUploadHumanityQR,
} from '../../services/endpoints'

export default function AdminHumanity() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-humanity-data'],
    queryFn: adminGetHumanity,
  })

  const humanity = data?.data?.data

  const [programText, setProgramText] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (humanity) {
      setTimeout(() => {
        setProgramText(humanity.program_text)
        setBankName(humanity.bank_name)
        setAccountName(humanity.account_name)
        setAccountNumber(humanity.account_number)
      }, 0)
    }
  }, [humanity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminUpdateHumanity({
        program_text: programText,
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
      })

      if (qrFile) {
        await adminUploadHumanityQR(qrFile)
      }

      toast.success('Pengaturan Compass for Humanity berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['admin-humanity-data'] })
      queryClient.invalidateQueries({ queryKey: ['public-humanity'] })
    } catch {
      toast.error('Gagal menyimpan pengaturan.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <LoadingSpinner size="md" />

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
          Kelola Compass for Humanity
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Pengaturan program sosial dan data rekening donasi resmi komunitas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-dark p-6 sm:p-8 rounded-xl space-y-6">
        <div>
          <label className="block text-white/70 text-xs font-semibold uppercase mb-2">
            Penjelasan Program Kemanusiaan
          </label>
          <textarea
            rows={5}
            required
            value={programText}
            onChange={e => setProgramText(e.target.value)}
            placeholder="Tuliskan visi dan kegiatan sosial yang dijalankan..."
            className="w-full bg-dark border border-white/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-gold"
          />
        </div>

        <div className="border-t border-white/10 pt-6">
          <h2 className="font-heading font-bold text-lg text-gold uppercase mb-4">
            Informasi Rekening Donasi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nama Bank</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="Contoh: Bank BCA / Mandiri"
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nomor Rekening</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="Contoh: 1234567890"
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold font-mono"
              />
            </div>

            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Atas Nama Pemilik</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="Contoh: COMPASS PSS Sleman"
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>
        </div>

        {/* QR Code Upload */}
        <div className="border-t border-white/10 pt-6 space-y-4">
          <h2 className="font-heading font-bold text-lg text-white uppercase">
            Gambar QR Code Donasi (QRIS)
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-40 h-40 bg-white p-2 rounded-xl shrink-0 flex items-center justify-center border">
              {humanity?.qr_image_url ? (
                <img src={humanity.qr_image_url} alt="QR Donasi" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-500 font-semibold text-center">Belum ada QR Code</span>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <label className="block text-white/70 text-xs font-semibold uppercase">
                Unggah QR Code Baru (PNG/JPG/WebP, Maks 5MB)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => setQrFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold cursor-pointer"
              />
              <p className="text-xs text-white/40">
                Pindai QR ini akan langsung muncul saat pengunjung mengklik tombol &apos;Donasi&apos; di halaman beranda.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="btn-gold py-2.5 px-6 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}
