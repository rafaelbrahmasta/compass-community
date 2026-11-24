import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSiteSettings } from '../services/endpoints'
import { getAssetUrl } from '../services/api'
import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'

export default function PublicLayout() {
  const { pathname } = useLocation()
  const { data: settingsData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: getSiteSettings,
    staleTime: 1000 * 60 * 10,
  })

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  // Update favicon dynamically if logo is configured
  useEffect(() => {
    const logoUrl = settingsData?.data?.data?.logo_url
    if (logoUrl) {
      const fullUrl = getAssetUrl(logoUrl)
      const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link')
      link.rel = 'icon'
      link.href = fullUrl
      if (!document.querySelector("link[rel*='icon']")) {
        document.head.appendChild(link)
      }
    }
  }, [settingsData])

  return (
    <div className="flex flex-col min-h-screen bg-dark">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
