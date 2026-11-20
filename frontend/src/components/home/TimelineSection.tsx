import { Calendar, ChevronRight } from 'lucide-react'
import type { HistoryTimeline } from '../../types'
import Reveal from '../common/Reveal'

interface TimelineSectionProps {
  items: HistoryTimeline[]
}

export default function TimelineSection({ items }: TimelineSectionProps) {
  if (!items || items.length === 0) return null

  return (
    <section className="py-20 bg-dark-surface relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal variant="fade-up">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-gold font-heading font-semibold tracking-widest uppercase text-xs">
              Perjalanan Kami
            </span>
            <h2 className="section-title mt-2">SEJARAH KOMUNITAS COMPASS</h2>
            <div className="w-16 h-1 bg-gold mx-auto mt-4 rounded-full" />
            <p className="mt-4 text-white/70 text-sm sm:text-base leading-relaxed">
              Dari segelintir suporter setia hingga menjadi wadah pergerakan suporter PSS Sleman yang solid, mandiri, dan berdedikasi.
            </p>
          </div>
        </Reveal>

        {/* Vertical Timeline */}
        <div className="relative border-l-2 border-gold/40 ml-4 sm:ml-32 md:ml-40 space-y-12">
          {items.map((item, index) => (
            <Reveal
              key={item.id || index}
              variant="slide-left"
              delay={index * 120}
              className="relative pl-8 sm:pl-10 group"
            >
              {/* Dot */}
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-dark border-2 border-gold group-hover:bg-gold transition-colors duration-300 shadow-md shadow-gold/30" />

              {/* Year badge on left (for desktop) */}
              <div className="hidden sm:block absolute -left-36 top-0 w-24 text-right">
                <span className="font-heading font-black text-2xl text-gold group-hover:text-gold-light transition-colors">
                  {item.year}
                </span>
              </div>

              {/* Mobile Year Badge */}
              <div className="sm:hidden mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gold/20 text-gold font-heading font-bold text-xs rounded-md border border-gold/30">
                  <Calendar size={12} strokeWidth={1.5} />
                  <span>{item.year}</span>
                </span>
              </div>

              {/* Content Card */}
              <div className="bg-[#0b120e] border border-white/10 p-6 rounded-2xl transition-all duration-300 group-hover:border-gold/50 group-hover:translate-x-1 shadow-lg shadow-black/40">
                <h3 className="font-heading font-bold text-xl text-white uppercase tracking-wide group-hover:text-gold transition-colors flex items-center justify-between">
                  <span>{item.title}</span>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-gold/40 group-hover:text-gold transition-colors" />
                </h3>
                <p className="mt-2.5 text-white/70 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
