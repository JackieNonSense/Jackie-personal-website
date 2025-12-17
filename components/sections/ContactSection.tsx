
import Link from "next/link";

export default function ContactSection() {
  return (
    <section id="contact" className="min-h-[50vh] py-24 px-6 md:px-12 flex flex-col justify-between bg-bg-secondary border-t border-white/5">
      <div className="max-w-7xl mx-auto w-full">
         <h2 className="font-display font-medium text-xs tracking-[0.2em] uppercase text-metal-steel mb-12 flex items-center gap-4">
          <span className="w-12 h-[1px] bg-metal-steel/50"></span>
          Contact
        </h2>

        <div className="space-y-3">
          <p className="font-mono text-xs text-metal-steel/70 tracking-wide">
            say hello →
          </p>
          <a
            href="mailto:whoisjackie1127@gmail.com"
            className="font-display text-xl md:text-2xl lg:text-3xl text-metal-chrome hover:text-white transition-colors tracking-wide inline-flex items-center gap-3 group"
          >
            whoisjackie1127@gmail.com
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">✉️</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full flex justify-between items-end mt-24 text-metal-steel text-sm font-mono">
        <div>
          © 2025 Yuchao Wang
        </div>
        <div className="flex gap-8">
          <a href="https://www.linkedin.com/in/yuchao-wang-4a014b198/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
          <a href="https://github.com/JackieNonSense" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          <Link
            href="/terminal"
            className="text-metal-steel/50 italic hover:text-[#33ff33] hover:drop-shadow-[0_0_8px_#33ff33] transition-all duration-300"
            aria-label="Access Terminal"
          >
            -????
          </Link>
        </div>
      </div>
    </section>
  );
}
