import { useQuery } from '@tanstack/react-query'
import { Target, Zap, Users, User } from 'lucide-react'
import { getAbout } from '../../services/endpoints'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Reveal from '../../components/common/Reveal'

const DEFAULT_ABOUT_PAGE_IMAGE =
  'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1000&q=80'

export default function About() {
  const { data, isLoading } = useQuery({
    queryKey: ['about-page'],
    queryFn: getAbout,
  })

  const aboutData = data?.data?.data
  const about = aboutData?.about
  const visiMisi = aboutData?.visi_misi
  const aboutImage = aboutData?.about_image?.content || DEFAULT_ABOUT_PAGE_IMAGE
  const teamMembers = aboutData?.team_members || []

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header Banner */}
        <Reveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
              Profil Resmi
            </span>
            <h1 className="text-4xl md:text-5xl font-heading font-black text-white uppercase mt-2 tracking-wide">
              TENTANG <span className="text-gold">COMPASS</span>
            </h1>
            <div className="gold-divider mx-auto mt-4" />
            <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed">
              Mengenal lebih dekat identitas, arah perjuangan, serta jajaran pengurus komunitas suporter PSS Sleman.
            </p>
          </div>
        </Reveal>

        {/* 1. Profil & Sejarah Singkat */}
        <Reveal variant="fade-up">
          <div className="card-dark p-8 md:p-12 border-gold/20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="font-heading font-bold text-2xl md:text-3xl text-white uppercase mb-4">
                  Identitas Komunitas
                </h2>
                <div className="w-12 h-1 bg-gold rounded mb-6" />
                <div className="prose prose-invert text-white/80 leading-relaxed space-y-4">
                  <p>
                    {about?.content ||
                      'COMPASS (Komunitas Pendukung PSS Sleman) didirikan sebagai rumah bersama bagi para pecinta sepak bola Sleman yang mengedepankan kreativitas, sportivitas, dan loyalitas tanpa batas.'}
                  </p>
                  <p>
                    Kami meyakini bahwa suporter adalah jiwa dari sebuah klub sepak bola. Dukungan kami tidak hanya bergema selama 90 menit di tribun Maguwoharjo, melainkan juga tercermin dalam berbagai aksi nyata bagi masyarakat Sleman dan Yogyakarta.
                  </p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl h-80 bg-dark-surface">
                <img
                  src={aboutImage}
                  alt="Tentang Komunitas COMPASS PSS Sleman"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </Reveal>

        {/* 2. Visi & Misi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Reveal variant="slide-left">
            <div className="card-dark p-8 border-gold/20 flex flex-col h-full">
              <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold flex items-center justify-center mb-6">
                <Target size={24} className="text-gold" />
              </div>
              <h3 className="font-heading font-bold text-2xl text-white uppercase tracking-wide mb-3">
                Visi Komunitas
              </h3>
              <div className="text-white/80 leading-relaxed text-sm md:text-base">
                Menjadi wadah suporter PSS Sleman yang profesional, mandiri, berintegritas tinggi, dan membawa nama baik Sleman di kancah sepak bola nasional maupun internasional.
              </div>
            </div>
          </Reveal>

          <Reveal variant="slide-right">
            <div className="card-dark p-8 border-gold/20 flex flex-col h-full">
              <div className="w-12 h-12 rounded-xl bg-primary/40 border border-primary-light flex items-center justify-center mb-6">
                <Zap size={24} className="text-gold" />
              </div>
              <h3 className="font-heading font-bold text-2xl text-white uppercase tracking-wide mb-3">
                Misi Komunitas
              </h3>
              <ul className="text-white/80 leading-relaxed text-sm md:text-base space-y-2 list-disc list-inside">
                <li>Mendampingi dan mendukung penuh perjuangan PSS Sleman secara sportif.</li>
                <li>Membangun solidaritas dan persaudaraan antar anggota di seluruh wilayah.</li>
                <li>Menghadirkan program sosial dan kemanusiaan bagi masyarakat luas.</li>
                <li>Mengembangkan kreativitas tribun yang positif, atraktif, dan beretika.</li>
              </ul>
            </div>
          </Reveal>
        </div>

        {/* 3. Struktur Pengurus */}
        <div>
          <Reveal variant="fade-up">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
                Organisasi
              </span>
              <h2 className="section-title mt-2">STRUKTUR PENGURUS COMPASS</h2>
              <div className="gold-divider mx-auto mt-4" />
              <p className="mt-3 text-white/60 text-sm">
                Jajaran pengurus yang berdedikasi menggerakkan roda organisasi komunitas.
              </p>
            </div>
          </Reveal>

          {teamMembers.length === 0 ? (
            <div className="card-dark p-12 text-center max-w-md mx-auto">
              <Users size={40} className="text-gold/40 mx-auto mb-3" />
              <p className="text-white/60 text-sm">Data pengurus belum ditambahkan oleh administrator.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.map(member => (
                <Reveal key={member.id} variant="fade-up">
                  <div className="card-dark rounded-xl overflow-hidden group text-center h-full flex flex-col justify-between">
                    <div className="h-64 overflow-hidden bg-dark-surface relative">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-t from-dark to-primary/30">
                          <User size={48} className="text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-transparent opacity-80" />
                    </div>
                    <div className="p-5 relative -mt-6">
                      <div className="inline-block px-3 py-1 bg-gold text-dark font-heading font-bold text-xs uppercase tracking-wider rounded mb-2 shadow">
                        {member.position}
                      </div>
                      <h4 className="font-heading font-bold text-lg text-white group-hover:text-gold transition-colors">
                        {member.name}
                      </h4>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
