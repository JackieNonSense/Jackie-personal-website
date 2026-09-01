"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useGsap, ScrollTrigger } from "@/lib/motion";
import TabBar from "@/components/layout/TabBar";
import HeroSection from "@/components/sections/HeroSection";
import SubjectSection from "@/components/sections/SubjectSection";
import AssessmentSection from "@/components/sections/AssessmentSection";
import ContactSection from "@/components/sections/ContactSection";
import CrtOverlay from "@/components/fx/CrtOverlay";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
});

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);
  const scrollRef = useRef(0);

  useGsap(() => {
    // Single source of truth for hero scroll progress, read by the shader.
    ScrollTrigger.create({
      start: 0,
      end: () => window.innerHeight,
      onUpdate: (self) => {
        scrollRef.current = self.progress;
      },
    });
  }, mainRef);

  return (
    <main ref={mainRef} className="relative min-h-screen bg-ink text-phos-500 crt-flicker">
      {/* Phosphor dot-matrix background */}
      <div className="fixed inset-0 z-0" aria-hidden>
        <HeroScene scrollRef={scrollRef} />
      </div>

      <div className="relative z-10">
        <TabBar />
        <HeroSection />
        <SubjectSection />
        <AssessmentSection />
        <ContactSection />
      </div>

      <CrtOverlay />
    </main>
  );
}
