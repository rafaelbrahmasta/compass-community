import api from './api'
import type {
  ApiResponse, PaginatedData,
  CarouselSlide, AboutContent, TeamMember, HistoryTimeline,
  HumanitySettings, Match, TicketCategory, ReminderRequest,
  MerchCategory, MerchProduct, MerchImage, GalleryAlbum, GalleryPhoto,
  Agenda, News, ContactMessageRequest, SiteSettings,
} from '../types'

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

// Health
export const healthCheck = () => api.get<ApiResponse<string>>('/health')

// Carousel
export const getCarouselSlides = () =>
  api.get<ApiResponse<CarouselSlide[]>>('/carousel')

// About
export const getAbout = () =>
  api.get<ApiResponse<{
    about: AboutContent | null
    visi_misi: AboutContent | null
    about_image: AboutContent | null
    team_members: TeamMember[]
    history: HistoryTimeline[]
  }>>('/about')

// Humanity
export const getHumanity = () =>
  api.get<ApiResponse<HumanitySettings>>('/humanity')

// Matches
export const getUpcomingMatches = () =>
  api.get<ApiResponse<Match[]>>('/matches/upcoming')

export const getMatches = (params?: { month?: string; status?: string }) =>
  api.get<ApiResponse<Match[]>>('/matches', { params })

export const getMatchTickets = (matchId: string) =>
  api.get<ApiResponse<TicketCategory[]>>(`/matches/${matchId}/tickets`)

// Reminder
export const createReminder = (data: ReminderRequest) =>
  api.post<ApiResponse<{ id: string }>>('/reminders', data)

// Merch
export const getMerchCategories = () =>
  api.get<ApiResponse<MerchCategory[]>>('/merch/categories')

export const getMerchProducts = (params?: { category_id?: string }) =>
  api.get<ApiResponse<MerchProduct[]>>('/merch/products', { params })

export const getMerchProductDetail = (id: string) =>
  api.get<ApiResponse<MerchProduct>>(`/merch/products/${id}`)

// Gallery
export const getGalleryAlbums = () =>
  api.get<ApiResponse<GalleryAlbum[]>>('/gallery/albums')

export const getAlbumPhotos = (albumId: string) =>
  api.get<ApiResponse<GalleryPhoto[]>>(`/gallery/albums/${albumId}/photos`)

// Agenda
export const getAgendas = (params?: { month?: string }) =>
  api.get<ApiResponse<Agenda[]>>('/agendas', { params })

// News
export const getNewsList = (params?: { page?: number; per_page?: number }) =>
  api.get<ApiResponse<PaginatedData<News>>>('/news', { params })

export const getNewsDetail = (slug: string) =>
  api.get<ApiResponse<News>>(`/news/${slug}`)

// Site Settings
export const getSiteSettings = () =>
  api.get<ApiResponse<SiteSettings>>('/settings')

// Contact
export const sendContactMessage = (data: ContactMessageRequest) =>
  api.post<ApiResponse<{ id: string }>>('/contact', data)

// Direct Ticket Purchase & Check
export const buyTicket = (data: import('../types').BuyTicketPayload) =>
  api.post<ApiResponse<import('../types').BuyTicketResult>>('/tickets/buy', data)

export const checkTicket = (params: { ticket_code?: string; member_code?: string; phone?: string }) =>
  api.get<ApiResponse<any>>('/tickets/check', { params })

export const uploadTicketPaymentProof = (formData: FormData) =>
  api.post<ApiResponse<{ ticket_code: string; payment_proof_url: string }>>('/tickets/upload-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

// Auth
export const adminLogin = (email: string, password: string) =>
  api.post<ApiResponse<{ token: string; admin: import('../types').Admin }>>('/auth/login', { email, password })

export const getAdminProfile = () =>
  api.get<ApiResponse<import('../types').Admin>>('/auth/me')

export const changePassword = (data: { current_password: string; new_password: string }) =>
  api.put<ApiResponse<null>>('/auth/password', data)

// Dashboard
export const getDashboardStats = () =>
  api.get<ApiResponse<import('../types').DashboardStats>>('/admin/dashboard')

// Admin Carousel
export const adminGetCarousel = () =>
  api.get<ApiResponse<CarouselSlide[]>>('/admin/carousel')
export const adminCreateSlide = (data: { title: string; subtitle: string; sort_order?: number; is_active?: boolean }) =>
  api.post<ApiResponse<CarouselSlide>>('/admin/carousel', data)
export const adminUpdateSlide = (id: string, data: Partial<CarouselSlide>) =>
  api.put<ApiResponse<CarouselSlide>>(`/admin/carousel/${id}`, data)
export const adminUploadSlideImage = (id: string, file: File) => {
  const form = new FormData(); form.append('image', file)
  return api.post<ApiResponse<{ image_url: string }>>(`/admin/carousel/${id}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const adminDeleteSlide = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/carousel/${id}`)

// Admin About
export const adminUpdateAbout = (section: string, content: string) =>
  api.put<ApiResponse<AboutContent>>('/admin/about', { section, content })
export const adminUploadAboutImage = (file: File) => {
  const form = new FormData()
  form.append('image', file)
  return api.post<ApiResponse<AboutContent>>('/admin/about/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const adminGetTeamMembers = () =>
  api.get<ApiResponse<TeamMember[]>>('/admin/team-members')
export const adminCreateTeamMember = (data: FormData) =>
  api.post<ApiResponse<TeamMember>>('/admin/team-members', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const adminUpdateTeamMember = (id: string, data: Partial<TeamMember>) =>
  api.put<ApiResponse<TeamMember>>(`/admin/team-members/${id}`, data)
export const adminDeleteTeamMember = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/team-members/${id}`)

// Admin History
export const adminGetHistory = () =>
  api.get<ApiResponse<HistoryTimeline[]>>('/admin/history')
export const adminCreateHistory = (data: Omit<HistoryTimeline, 'id'>) =>
  api.post<ApiResponse<HistoryTimeline>>('/admin/history', data)
export const adminUpdateHistory = (id: string, data: Partial<HistoryTimeline>) =>
  api.put<ApiResponse<HistoryTimeline>>(`/admin/history/${id}`, data)
export const adminDeleteHistory = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/history/${id}`)

// Admin Humanity
export const adminGetHumanity = () =>
  api.get<ApiResponse<HumanitySettings>>('/admin/humanity')
export const adminUpdateHumanity = (data: Partial<HumanitySettings>) =>
  api.put<ApiResponse<HumanitySettings>>('/admin/humanity', data)
export const adminUploadHumanityQR = (file: File) => {
  const form = new FormData(); form.append('image', file)
  return api.post<ApiResponse<{ qr_image_url: string }>>('/admin/humanity/qr', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// Admin Matches
export const adminGetMatches = () =>
  api.get<ApiResponse<Match[]>>('/admin/matches')
export const adminCreateMatch = (data: Partial<Match>) =>
  api.post<ApiResponse<Match>>('/admin/matches', data)
export const adminUpdateMatch = (id: string, data: Partial<Match>) =>
  api.put<ApiResponse<Match>>(`/admin/matches/${id}`, data)
export const adminDeleteMatch = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/matches/${id}`)
export const adminImportMatchesCsv = (file: File) => {
  const form = new FormData(); form.append('file', file)
  return api.post<ApiResponse<{ imported: number }>>('/admin/matches/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// Admin Ticket Categories
export const adminGetTickets = (matchId: string) =>
  api.get<ApiResponse<TicketCategory[]>>(`/admin/matches/${matchId}/tickets`)
export const adminCreateTicket = (matchId: string, data: Partial<TicketCategory>) =>
  api.post<ApiResponse<TicketCategory>>(`/admin/matches/${matchId}/tickets`, data)
export const adminUpdateTicket = (matchId: string, ticketId: string, data: Partial<TicketCategory>) =>
  api.put<ApiResponse<TicketCategory>>(`/admin/matches/${matchId}/tickets/${ticketId}`, data)
export const adminDeleteTicket = (matchId: string, ticketId: string) =>
  api.delete<ApiResponse<null>>(`/admin/matches/${matchId}/tickets/${ticketId}`)

// Admin Reminders
export const adminGetReminders = () =>
  api.get<ApiResponse<import('../types').Reminder[]>>('/admin/reminders')

// Admin Merch Categories
export const adminGetMerchCategories = () =>
  api.get<ApiResponse<MerchCategory[]>>('/admin/merch/categories')
export const adminCreateMerchCategory = (data: { name: string; sort_order: number }) =>
  api.post<ApiResponse<MerchCategory>>('/admin/merch/categories', data)
export const adminUpdateMerchCategory = (id: string, data: Partial<MerchCategory>) =>
  api.put<ApiResponse<MerchCategory>>(`/admin/merch/categories/${id}`, data)
export const adminDeleteMerchCategory = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/merch/categories/${id}`)

// Admin Merch Products
export const adminGetMerchProducts = () =>
  api.get<ApiResponse<MerchProduct[]>>('/admin/merch/products')
export const adminCreateMerchProduct = (data: Partial<MerchProduct>) =>
  api.post<ApiResponse<MerchProduct>>('/admin/merch/products', data)
export const adminUpdateMerchProduct = (id: string, data: Partial<MerchProduct>) =>
  api.put<ApiResponse<MerchProduct>>(`/admin/merch/products/${id}`, data)
export const adminDeleteMerchProduct = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/merch/products/${id}`)
export const adminUploadMerchImage = (productId: string, file: File) => {
  const form = new FormData(); form.append('image', file)
  return api.post<ApiResponse<MerchImage>>(`/admin/merch/products/${productId}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const adminDeleteMerchImage = (imageId: string) =>
  api.delete<ApiResponse<null>>(`/admin/merch/images/${imageId}`)

// Admin Gallery
export const adminGetAlbums = () =>
  api.get<ApiResponse<GalleryAlbum[]>>('/admin/gallery/albums')
export const adminCreateAlbum = (data: Partial<GalleryAlbum>) =>
  api.post<ApiResponse<GalleryAlbum>>('/admin/gallery/albums', data)
export const adminUpdateAlbum = (id: string, data: Partial<GalleryAlbum>) =>
  api.put<ApiResponse<GalleryAlbum>>(`/admin/gallery/albums/${id}`, data)
export const adminDeleteAlbum = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/gallery/albums/${id}`)
export const adminUploadPhotos = (albumId: string, files: File[]) => {
  const form = new FormData()
  files.forEach(f => form.append('photos', f))
  return api.post<ApiResponse<GalleryPhoto[]>>(`/admin/gallery/albums/${albumId}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const adminDeletePhoto = (photoId: string) =>
  api.delete<ApiResponse<null>>(`/admin/gallery/photos/${photoId}`)

// Admin Agendas
export const adminGetAgendas = () =>
  api.get<ApiResponse<Agenda[]>>('/admin/agendas')
export const adminCreateAgenda = (data: Partial<Agenda>) =>
  api.post<ApiResponse<Agenda>>('/admin/agendas', data)
export const adminUpdateAgenda = (id: string, data: Partial<Agenda>) =>
  api.put<ApiResponse<Agenda>>(`/admin/agendas/${id}`, data)
export const adminDeleteAgenda = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/agendas/${id}`)

// Admin News
export const adminGetNews = () =>
  api.get<ApiResponse<News[]>>('/admin/news')
export const adminCreateNews = (data: Partial<News>) =>
  api.post<ApiResponse<News>>('/admin/news', data)
export const adminUpdateNews = (id: string, data: Partial<News>) =>
  api.put<ApiResponse<News>>(`/admin/news/${id}`, data)
export const adminDeleteNews = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/news/${id}`)
export const adminUploadNewsThumbnail = (newsId: string, file: File) => {
  const form = new FormData(); form.append('image', file)
  return api.post<ApiResponse<{ thumbnail_url: string }>>(`/admin/news/${newsId}/thumbnail`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// Admin Contact Messages
export const adminGetMessages = () =>
  api.get<ApiResponse<import('../types').ContactMessage[]>>('/admin/contact-messages')
export const adminMarkMessageRead = (id: string) =>
  api.put<ApiResponse<null>>(`/admin/contact-messages/${id}/read`, {})

// Admin Settings
export const adminGetSettings = () =>
  api.get<ApiResponse<SiteSettings>>('/admin/settings')
export const adminUpdateSettings = (data: Partial<SiteSettings>) =>
  api.put<ApiResponse<SiteSettings>>('/admin/settings', data)
export const adminUploadLogo = (file: File) => {
  const form = new FormData(); form.append('image', file)
  return api.post<ApiResponse<{ logo_url: string }>>('/admin/settings/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// ============================================================
// ADMIN: MEMBERS, TICKET ORDERS & ADMINS MANAGEMENT (SUPER_ADMIN)
// ============================================================

// Admin Members
export const adminGetMembers = (params?: { q?: string; page?: number; per_page?: number }) =>
  api.get<ApiResponse<PaginatedData<import('../types').Member>>>('/admin/members', { params })

export const adminGetMemberById = (id: string) =>
  api.get<ApiResponse<import('../types').Member>>(`/admin/members/${id}`)

export const adminCreateMember = (data: { full_name: string; phone: string; email?: string; is_active?: boolean }) =>
  api.post<ApiResponse<import('../types').Member>>('/admin/members', data)

export const adminUpdateMember = (id: string, data: { full_name: string; phone: string; email?: string; is_active: boolean }) =>
  api.put<ApiResponse<import('../types').Member>>(`/admin/members/${id}`, data)

export const adminDeleteMember = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/members/${id}`)

export const adminImportMembersCsv = (csv_content: string) =>
  api.post<ApiResponse<{ success_count: number; error_count: number; errors: string[] }>>('/admin/members/import-csv', { csv_content })

// Admin Tickets (Purchases & Check-in)
export const adminGetTicketPurchases = (params?: { match_id?: string; status?: string; q?: string; page?: number; per_page?: number }) =>
  api.get<ApiResponse<PaginatedData<import('../types').TicketPurchase>>>('/admin/tickets', { params })

export const adminUpdateTicketStatus = (id: string, data: { status: string; notes?: string }) =>
  api.put<ApiResponse<import('../types').TicketPurchase>>(`/admin/tickets/${id}/status`, data)

export const adminCheckinTicket = (data: { code_or_payload: string; match_id?: string }) =>
  api.post<ApiResponse<{ ticket_code: string; full_name: string; member_code: string; opponent_name: string; category_name: string; stadium: string }>>('/admin/tickets/checkin', data)

export const adminGetTicketBankSettings = () =>
  api.get<ApiResponse<{ bank_name: string; account_name: string; account_number: string; qr_image_url?: string; instructions?: string }>>('/admin/ticket-bank-settings')

export const adminUpdateTicketBankSettings = (data: { bank_name: string; account_name: string; account_number: string; qr_image_url?: string; instructions?: string }) =>
  api.put<ApiResponse<unknown>>('/admin/ticket-bank-settings', data)

// Admin Admins Management
export const adminGetAdmins = () =>
  api.get<ApiResponse<import('../types').Admin[]>>('/admin/admins')

export const adminCreateAdmin = (data: { email: string; password: string; name: string; role: string }) =>
  api.post<ApiResponse<import('../types').Admin>>('/admin/admins', data)

export const adminUpdateAdmin = (id: string, data: { name: string; role: string; is_active: boolean }) =>
  api.put<ApiResponse<import('../types').Admin>>(`/admin/admins/${id}`, data)

export const adminResetAdminPassword = (id: string, new_password: string) =>
  api.put<ApiResponse<null>>(`/admin/admins/${id}/reset-password`, { new_password })

export const adminDeleteAdmin = (id: string) =>
  api.delete<ApiResponse<null>>(`/admin/admins/${id}`)
