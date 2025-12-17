"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Dynamic import to avoid SSR issues with Three.js
const SecretKeyScene = dynamic(() => import("@/components/three/SecretKeyScene"), {
  ssr: false,
});

gsap.registerPlugin(ScrollTrigger);

// Tech stack with icons/emojis for visual interest
const skillCategories = [
  {
    title: "Languages",
    skills: ["JavaScript", "TypeScript", "Python", "Java", "C++", "SQL"],
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Frontend",
    skills: ["React", "Next.js", "Three.js", "TailwindCSS", "GSAP", "HTML/CSS"],
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    title: "Backend & Cloud",
    skills: ["Node.js", "AWS", "PostgreSQL", "MongoDB", "REST APIs", "Docker"],
    color: "from-orange-500/20 to-yellow-500/20",
  },
  {
    title: "Creative & AI",
    skills: ["Unreal Engine 5", "Figma", "AI Workflows", "MCP", "Photoshop"],
    color: "from-green-500/20 to-emerald-500/20",
  },
];

// Floating skill tag component
function SkillTag({ skill, delay }: { skill: string; delay: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        inline-block px-3 py-1.5 rounded-full text-sm font-mono
        bg-white/[0.03] border border-white/[0.08]
        hover:bg-white/[0.08] hover:border-white/[0.2] hover:scale-105
        transition-all duration-300 cursor-default
        ${isHovered ? 'text-white shadow-lg shadow-white/10' : 'text-metal-silver'}
      `}
      style={{
        animationDelay: `${delay * 100}ms`,
      }}
    >
      {skill}
    </span>
  );
}

export default function SkillsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const grid = gridRef.current;

    if (!section || !grid) return;

    // Staggered animation for cards
    gsap.fromTo(
      grid.children,
      { opacity: 0, y: 60, rotateX: -15 },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="skills"
      className="relative min-h-screen py-24 px-6 md:px-12 flex flex-col justify-center max-w-7xl mx-auto"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 mb-16">
        <h2 className="font-display font-medium text-xs tracking-[0.2em] uppercase text-metal-steel mb-4 flex items-center gap-4">
          <span className="w-12 h-[1px] bg-metal-steel/50"></span>
          Tech Stack
        </h2>
        <p className="font-body text-metal-silver text-lg max-w-xl">
          The tools and technologies I use to bring ideas to life.
        </p>
      </div>

      {/* Creative Grid Layout */}
      <div
        ref={gridRef}
        className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6"
        style={{ perspective: "1000px" }}
      >
        {skillCategories.map((category, catIndex) => (
          <div
            key={category.title}
            className={`
              group relative p-8 rounded-2xl overflow-hidden
              bg-gradient-to-br ${category.color}
              border border-white/[0.05]
              hover:border-white/[0.15]
              transition-all duration-500
              hover:shadow-2xl hover:shadow-white/5
            `}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Glowing orb background effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />

            {/* Category Header */}
            <div className="flex items-center gap-3 mb-6">
              <h3 className="font-display text-lg tracking-wide text-white/90">
                {category.title}
              </h3>
            </div>

            {/* Skills as floating tags */}
            <div className="flex flex-wrap gap-2">
              {category.skills.map((skill, skillIndex) => (
                <SkillTag
                  key={skill}
                  skill={skill}
                  delay={catIndex * 3 + skillIndex}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Decorative element with hidden easter egg */}
      <div className="relative z-10 mt-16 flex items-center justify-center gap-4">
        <p className="font-mono text-xs text-metal-steel/60">
          // always learning, always building
        </p>
        {/* Secret Key Easter Egg */}
        <div className="relative w-12 h-12">
          <SecretKeyScene />
        </div>
      </div>
    </section>
  );
}
