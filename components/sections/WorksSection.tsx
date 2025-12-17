
import Link from 'next/link';

export default function WorksSection() {
  return (
    <section id="works" className="min-h-screen py-24 px-6 md:px-12 max-w-7xl mx-auto">
       <h2 className="font-display font-medium text-xs tracking-[0.2em] uppercase text-metal-steel mb-24 flex items-center gap-4">
        <span className="w-12 h-[1px] bg-metal-steel/50"></span>
        Selected Works
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((item) => (
          <div key={item} className="group relative h-[300px] bg-bg-secondary border border-white/5 rounded-2xl p-8 transition-all hover:-translate-y-2 hover:border-white/10">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-12 h-12 bg-metal-chrome/10 rounded-lg flex items-center justify-center text-metal-chrome">
                {/* Icon Placeholder */}
                <div className="w-6 h-6 bg-current opacity-50" />
              </div>

              <div>
                <h3 className="font-display text-xl mb-2 text-white group-hover:text-metal-chrome transition-colors">Project {item}</h3>
                <p className="font-body text-sm text-metal-steel">A digital exploration of space and time.</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
