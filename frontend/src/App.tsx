import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import LoadingSpinner from './components/common/LoadingSpinner'

// === Public Pages (Lazy) ===
const Home = lazy(() => import('./pages/public/Home'))
const About = lazy(() => import('./pages/public/About'))
const Tiket = lazy(() => import('./pages/public/Tiket'))
const Merchandise = lazy(() => import('./pages/public/Merchandise'))
const MerchandiseDetail = lazy(() => import('./pages/public/MerchandiseDetail'))
const Gallery = lazy(() => import('./pages/public/Gallery'))
const Agenda = lazy(() => import('./pages/public/Agenda'))
const Jadwal = lazy(() => import('./pages/public/Jadwal'))
const Berita = lazy(() => import('./pages/public/Berita'))
const BeritaDetail = lazy(() => import('./pages/public/BeritaDetail'))
const Contact = lazy(() => import('./pages/public/Contact'))
const NotFound = lazy(() => import('./pages/public/NotFound'))

// === Admin Pages (Lazy) ===
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminCarousel = lazy(() => import('./pages/admin/AdminCarousel'))
const AdminAbout = lazy(() => import('./pages/admin/AdminAbout'))
const AdminTimeline = lazy(() => import('./pages/admin/AdminTimeline'))
const AdminHumanity = lazy(() => import('./pages/admin/AdminHumanity'))
const AdminJadwal = lazy(() => import('./pages/admin/AdminJadwal'))
const AdminTiket = lazy(() => import('./pages/admin/AdminTiket'))
const AdminReminder = lazy(() => import('./pages/admin/AdminReminder'))
const AdminMerch = lazy(() => import('./pages/admin/AdminMerch'))
const AdminGallery = lazy(() => import('./pages/admin/AdminGallery'))
const AdminAgenda = lazy(() => import('./pages/admin/AdminAgenda'))
const AdminBerita = lazy(() => import('./pages/admin/AdminBerita'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'))
const AdminAccount = lazy(() => import('./pages/admin/AdminAccount'))

const SuspenseFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-dark">
    <LoadingSpinner size="lg" />
  </div>
)

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/tiket" element={<Tiket />} />
            <Route path="/merchandise" element={<Merchandise />} />
            <Route path="/merchandise/:id" element={<MerchandiseDetail />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/jadwal" element={<Jadwal />} />
            <Route path="/berita" element={<Berita />} />
            <Route path="/berita/:slug" element={<BeritaDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin Login (no layout) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/carousel" element={<AdminCarousel />} />
              <Route path="/admin/about" element={<AdminAbout />} />
              <Route path="/admin/timeline" element={<AdminTimeline />} />
              <Route path="/admin/humanity" element={<AdminHumanity />} />
              <Route path="/admin/jadwal" element={<AdminJadwal />} />
              <Route path="/admin/tiket" element={<AdminTiket />} />
              <Route path="/admin/reminder" element={<AdminReminder />} />
              <Route path="/admin/merch" element={<AdminMerch />} />
              <Route path="/admin/gallery" element={<AdminGallery />} />
              <Route path="/admin/agenda" element={<AdminAgenda />} />
              <Route path="/admin/berita" element={<AdminBerita />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/messages" element={<AdminMessages />} />
              <Route path="/admin/account" element={<AdminAccount />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
