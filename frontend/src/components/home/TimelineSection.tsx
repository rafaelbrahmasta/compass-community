import type { HistoryTimeline } from '../../types'

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
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-gold font-heading font-semibold tracking-widest uppercase text-sm">
            Perjalanan Kami
          </span>
          <h2 className="section-title mt-2">SEJARAH KOMUNITAS COMPASS</h2>
          <div className="gold-divider mx-auto mt-4" />
          <p className="mt-4 text-white/70 text-sm sm:text-base leading-relaxed">
            Dari segelintir suporter yang setia hingga menjadi wadah pergerakan Supercan yang solid dan berdampak.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="relative border-l-2 border-gold/40 ml-4 sm:ml-32 md:ml-40 space-y-12">
          {items.map((item, index) => (
            <div key={item.id || index} className="relative pl-8 sm:pl-10 group">
              {/* Dot */}
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-dark border-2 border-gold group-hover:bg-gold transition-colors duration-300" />

              {/* Year badge on left (for desktop) */}
              <div className="hidden sm:block absolute -left-36 top-0 w-24 text-right">
                <span className="font-heading font-black text-2xl text-gold group-hover:text-gold-light transition-colors">
                  {item.year}
                </span>
              </div>

              {/* Mobile Year Badge */}
              <div className="sm:hidden mb-1">
                <span className="inline-block px-2 py-0.5 bg-gold/20 text-gold font-heading font-bold text-xs rounded">
                  {item.year}
                </span>
              </div>

              {/* Content Card */}
              <div className="card-dark p-6 transition-all duration-300 group-hover:border-gold/50 group-hover:translate-x-1">
                <h3 className="font-heading font-bold text-xl text-white uppercase tracking-wide group-hover:text-gold transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-white/70 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
