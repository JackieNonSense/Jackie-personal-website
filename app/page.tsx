"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Header from "@/components/layout/Header";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ContactSection from "@/components/sections/ContactSection";
import ThreeProvider from "@/components/three/ThreeProvider";
import DynamicScene from "@/components/three/DynamicScene";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  useEffect(() => {
    // Dispatch scroll progress for water background
    const updateScrollProgress = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      const progress = Math.min(scrollY / heroHeight, 1);

      // Dispatch custom event for Scene to use
      window.dispatchEvent(new CustomEvent('scrollProgress', { detail: progress }));
    };

    window.addEventListener('scroll', updateScrollProgress);
    updateScrollProgress();

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
    };
  }, []);

  return (
    <main className="relative min-h-screen bg-void text-white selection:bg-crt-green selection:text-black">
      {/* Full-page 3D Water Background */}
      <div className="fixed inset-0 z-0">
        <ThreeProvider>
          <DynamicScene />
        </ThreeProvider>
      </div>

      {/* Blur overlay that activates on scroll */}
      <div id="blur-overlay" className="fixed inset-0 z-[1] pointer-events-none backdrop-blur-0 bg-black/0 transition-all duration-300" />

      <div className="relative z-10">
        <Header />
        <HeroSection />
        <AboutSection />
        <SkillsSection />
        <ContactSection />
      </div>
    </main>
  );
}
