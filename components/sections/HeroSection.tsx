"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    const blurOverlay = document.getElementById('blur-overlay');

    if (!section || !content) return;

    // Hero content fades out and moves up on scroll
    gsap.to(content, {
      opacity: 0,
      y: -50,
      ease: "power2.in",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom top",
        scrub: 1,
      },
    });

    // Blur overlay activates on scroll
    if (blurOverlay) {
      gsap.to(blurOverlay, {
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "center top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen min-h-[800px] flex flex-col justify-center items-center overflow-hidden pointer-events-none"
    >
      <div ref={contentRef} className="relative z-10 text-center select-none pointer-events-auto">
        <div className="h-[200px]" />
        <p className="mt-8 font-body font-normal text-metal-steel tracking-[0.3em] uppercase text-sm md:text-base">
          Making stuff that works
        </p>
      </div>
    </section>
  );
}
