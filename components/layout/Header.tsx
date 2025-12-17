
"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [projectOpen, setProjectOpen] = useState(false);

  return (
    <header className="relative p-6 md:p-12 flex justify-between items-center z-50 mix-blend-difference text-white">
      <div className="flex items-center gap-12">
        <Link href="/" className="font-display font-bold tracking-widest text-sm uppercase hover:text-metal-chrome transition-colors">
          Yuchao Wang
        </Link>
      </div>

      <nav className="hidden md:flex gap-8 list-none ml-24">
        <Link href="#about" className="text-sm font-medium tracking-wider uppercase text-white/60 hover:text-metal-chrome transition-colors">
          About
        </Link>
        <Link href="#skills" className="text-sm font-medium tracking-wider uppercase text-white/60 hover:text-metal-chrome transition-colors">
          Skills
        </Link>
        <Link href="#contact" className="text-sm font-medium tracking-wider uppercase text-white/60 hover:text-metal-chrome transition-colors">
          Contact
        </Link>

        {/* Project dropdown - last */}
        <div className="relative">
          <button
            onClick={() => setProjectOpen(!projectOpen)}
            className="text-sm font-medium tracking-wider uppercase text-white/60 hover:text-metal-chrome transition-colors flex items-center gap-1"
          >
            Project
            <span className={`transition-transform ${projectOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {projectOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg whitespace-nowrap">
              <p className="text-xs text-white/50 font-mono">🚧 Under Construction 🚧</p>
            </div>
          )}
        </div>
      </nav>

      <div className="flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-metal-chrome">
        <span className="w-2 h-2 rounded-full bg-metal-chrome shadow-[0_0_10px_rgba(232,232,232,0.5)] animate-pulse" />
        Available for Internship & Job · Sydney
      </div>
    </header>
  );
}
