import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  adminGetSettings,
  adminUpdateSettings,
  adminUploadLogo,
} from '../../services/endpoints'

export default function AdminSettings() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: adminGetSettings,
  })

  const settings = data?.data?.data as Record<string, string> | undefined

  const [siteName, setSiteName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [address, setAddress] = useState('')
  const [mapsEmbedUrl, setMapsEmbedUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [merchGlobalFormUrl, setMerchGlobalFormUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (settings) {
      setTimeout(() => {
        setSiteName(settings.site_name || 'COMPASS')
        setContactName(settings.contact_name || '')
        setContactEmail(settings.contact_email || '')
        setContactPhone(settings.contact_phone || '')
        setContactWhatsapp(settings.contact_whatsapp || '')
        setAddress(settings.address || '')
        setMapsEmbedUrl(settings.maps_embed_url || '')
        setInstagramUrl(settings.instagram_url || '')
        setTwitterUrl(settings.twitter_url || '')
        setYoutubeUrl(settings.youtube_url || '')
        setMerchGlobalFormUrl(settings.merch_global_form_url || '')
      }, 0)
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminUpdateSettings({
        site_name: siteName,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        contact_whatsapp: contactWhatsapp,
        address,
        maps_embed_url: mapsEmbedUrl,
        instagram_url: instagramUrl,
        twitter_url: twitterUrl,
        youtube_url: youtubeUrl,
        merch_global_form_url: merchGlobalFormUrl,
      })

      if (logoFile) {
        await adminUploadLogo(logoFile)
      }

      toast.success('Pengaturan website berhasil disimpan!')
      queryClient.invalidateQueries({ queryKey: ['admin-site-settings'] })
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
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
          Pengaturan Situs
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Konfigurasi identitas situs, logo, kontak resmi, alamat sekretariat, dan link media sosial.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-dark p-6 sm:p-8 rounded-xl space-y-6">
        {/* Identitas & Logo */}
        <div className="space-y-4">
          <h2 className="font-heading font-bold text-lg text-gold uppercase">Identitas & Logo</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nama Website</label>
              <input
                type="text"
                required
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Upload Logo Baru</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-gold"
              />
            </div>
          </div>
        </div>

        {/* Kontak Sekretariat */}
        <div className="border-t border-white/10 pt-6 space-y-4">
          <h2 className="font-heading font-bold text-lg text-gold uppercase">Kontak Sekretariat</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Email Resmi</label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Nomor WhatsApp</label>
              <input
                type="text"
                value={contactWhatsapp}
                onChange={e => setContactWhatsapp(e.target.value)}
                placeholder="+62 812-3456-7890"
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Alamat Sekretariat</label>
            <textarea
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-dark border border-white/20 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* Global Merch Form & Sosmed */}
        <div className="border-t border-white/10 pt-6 space-y-4">
          <h2 className="font-heading font-bold text-lg text-gold uppercase">Formulir Global & Media Sosial</h2>

          <div>
            <label className="block text-white/70 text-xs font-semibold uppercase mb-1">
              Link Global Google Form Pemesanan Merchandise
            </label>
            <input
              type="url"
              value={merchGlobalFormUrl}
              onChange={e => setMerchGlobalFormUrl(e.target.value)}
              placeholder="https://forms.google.com/..."
              className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Instagram URL</label>
              <input
                type="url"
                value={instagramUrl}
                onChange={e => setInstagramUrl(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold text-xs"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">Twitter / X URL</label>
              <input
                type="url"
                value={twitterUrl}
                onChange={e => setTwitterUrl(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold text-xs"
              />
            </div>
            <div>
              <label className="block text-white/70 text-xs font-semibold uppercase mb-1">YouTube URL</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                className="w-full bg-dark border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold text-xs"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="btn-gold py-2.5 px-6 rounded-lg text-xs font-bold uppercase disabled:opacity-50"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  )
}
