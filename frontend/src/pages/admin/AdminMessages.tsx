import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { adminGetMessages, adminMarkMessageRead } from '../../services/endpoints'
import type { ContactMessage } from '../../types'

export default function AdminMessages() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-contact-messages'],
    queryFn: adminGetMessages,
  })

  const messages: ContactMessage[] = data?.data?.data || []

  const handleMarkRead = async (id: string) => {
    try {
      await adminMarkMessageRead(id)
      toast.success('Pesan ditandai sudah dibaca.')
      queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch {
      toast.error('Gagal memperbarui status pesan.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white uppercase tracking-wide">
          Pesan Masuk (Inbox Kontak)
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Daftar pesan, pertanyaan, dan masukan yang dikirim pengunjung melalui formulir kontak publik.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : messages.length === 0 ? (
        <div className="card-dark p-12 text-center rounded-xl max-w-md mx-auto">
          <span className="text-4xl mb-3 block">✉️</span>
          <p className="text-white/60 text-sm">Tidak ada pesan masuk.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`card-dark p-6 rounded-xl transition-all ${
                msg.is_read ? 'opacity-70 border-white/5' : 'border-gold/40 bg-dark-card'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${msg.is_read ? 'bg-white/20' : 'bg-gold animate-pulse'}`} />
                  <span className="font-heading font-bold text-lg text-white">{msg.name}</span>
                  <a href={`mailto:${msg.email}`} className="text-xs text-gold hover:underline font-mono">
                    ({msg.email})
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">
                    {new Date(msg.created_at).toLocaleString('id-ID')}
                  </span>
                  {!msg.is_read && (
                    <button
                      onClick={() => handleMarkRead(msg.id)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-gold hover:text-dark text-white rounded text-xs transition-colors"
                    >
                      Tandai Dibaca
                    </button>
                  )}
                </div>
              </div>

              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
                {msg.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
