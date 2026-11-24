// ============================================================
// Global Types untuk COMPASS Frontend
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// --- Auth ---
export type AdminRole = 'super_admin' | 'admin_1' | 'admin_2'

export interface Admin {
  id: string
  email: string
  name: string
  role: AdminRole
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Member {
  id: string
  member_code: string
  full_name: string
  phone: string
  email: string | null
  is_active: boolean
  ticket_count?: number
  created_at: string
  updated_at: string
}

export type TicketPurchaseStatus = 'menunggu_pembayaran' | 'lunas' | 'dibatalkan' | 'sudah_checkin'

export interface TicketPurchase {
  id: string
  ticket_code: string
  status: TicketPurchaseStatus
  price: string | number
  unique_code?: number
  total_price?: string | number
  qr_payload: string
  notes: string | null
  payment_proof_url?: string | null
  created_at: string
  paid_at: string | null
  checked_in_at: string | null
  expires_at: string
  member_id?: string
  member_code: string
  full_name: string
  phone: string
  email?: string | null
  match_id?: string
  opponent_name: string
  opponent_logo_url?: string | null
  match_date: string
  match_time: string
  stadium: string
  home_away?: string
  competition?: string
  category_id?: string
  category_name: string
}

export interface BuyTicketPayload {
  match_id: string
  category_id: string
  member_code: string
  phone: string
  pin?: string
  notes?: string
}

export interface BuyTicketResult {
  ticket_code: string
  qr_payload: string
  status: string
  price: string | number
  unique_code: number
  total_price: string | number
  expires_at: string
  member: {
    member_code: string
    full_name: string
    phone: string
  }
  match_info: {
    opponent_name: string
    match_date: string
    match_time: string
    stadium: string
    home_away: string
  }
  category_name: string
  bank_info: {
    bank_name: string
    account_name: string
    account_number: string
    qr_image_url?: string | null
  }
  instructions?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  admin: Admin
}

// --- Carousel ---
export interface CarouselSlide {
  id: string
  image_url: string
  title: string
  subtitle: string
  sort_order: number
  is_active: boolean
  created_at: string
}

// --- About ---
export interface AboutContent {
  id: string
  section: string
  content: string
  updated_at: string
}

export interface TeamMember {
  id: string
  name: string
  position: string
  photo_url: string | null
  sort_order: number
}

export interface HistoryTimeline {
  id: string
  year: number
  title: string
  description: string
  sort_order: number
}

export interface HumanitySettings {
  id: string
  program_text: string
  qr_image_url: string | null
  bank_name: string
  account_name: string
  account_number: string
}

// --- Matches ---
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'postponed'
export type HomeAway = 'home' | 'away'

export interface Match {
  id: string
  opponent_name: string
  opponent_logo_url: string | null
  match_date: string
  match_time: string
  stadium: string
  home_away: HomeAway
  competition: string
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  ticket_form_url: string | null
  created_at: string
}

export interface TicketCategory {
  id: string
  match_id: string
  name: string
  price: string
  quota: number
  sold: number
}

// --- Reminder ---
export type RemindBefore = 'h_minus_1_day' | 'h_minus_3_hours'

export interface ReminderRequest {
  match_id: string
  email: string
  whatsapp?: string
  remind_before: RemindBefore
}

export interface Reminder {
  id: string
  match_id: string
  email: string
  whatsapp: string | null
  remind_before: RemindBefore
  email_sent: boolean
  scheduled_at: string
  sent_at: string | null
  created_at: string
}

// --- Merchandise ---
export interface MerchCategory {
  id: string
  name: string
  sort_order: number
}

export interface MerchProduct {
  id: string
  category_id: string
  category_name?: string
  name: string
  description: string
  price: string
  sizes: string[] // JSON array
  stock_status: 'available' | 'out_of_stock' | 'preorder'
  order_form_url: string | null
  sort_order: number
  images: MerchImage[]
  created_at: string
}

export interface MerchImage {
  id: string
  product_id: string
  image_url: string
  is_primary: boolean
  sort_order: number
}

// --- Gallery ---
export interface GalleryAlbum {
  id: string
  name: string
  description: string
  cover_url: string | null
  sort_order: number
  photo_count?: number
  created_at: string
}

export interface GalleryPhoto {
  id: string
  album_id: string
  image_url: string
  caption: string
  sort_order: number
  created_at: string
}

// --- Agenda ---
export type AgendaStatus = 'upcoming' | 'done'

export interface Agenda {
  id: string
  title: string
  agenda_date: string
  agenda_time: string
  location: string
  description: string
  status: AgendaStatus
  created_at: string
}

// --- News ---
export type NewsStatus = 'draft' | 'published'

export interface News {
  id: string
  title: string
  slug: string
  content: string
  thumbnail_url: string | null
  summary: string
  author: string
  status: NewsStatus
  published_at: string | null
  created_at: string
  updated_at: string
}

// --- Contact ---
export interface ContactMessageRequest {
  name: string
  email: string
  message: string
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  message: string
  is_read: boolean
  created_at: string
}

// --- Site Settings ---
export interface SiteSettings {
  site_name: string
  logo_url: string | null
  contact_name: string
  contact_email: string
  contact_phone: string
  contact_whatsapp: string
  address: string
  maps_embed_url: string
  instagram_url: string
  twitter_url: string
  facebook_url: string
  youtube_url: string
  tiktok_url: string
  merch_global_form_url: string
}

// --- Dashboard Stats ---
export interface DashboardStats {
  total_news: number
  total_products: number
  active_reminders: number
  unread_messages: number
  next_match: Match | null
}
