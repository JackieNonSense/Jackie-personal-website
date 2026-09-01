"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const text = textRef.current;
    const card = cardRef.current;

    if (!section || !text || !card) return;

    // Text animation - fade in and slide up
    gsap.fromTo(
      text.children,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      }
    );

    // Card animation - fade in and scale
    gsap.fromTo(
      card,
      { opacity: 0, scale: 0.9, y: 30 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 60%",
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
      id="about"
      className="relative min-h-screen py-24 px-6 md:px-12 flex flex-col justify-center max-w-7xl mx-auto"
    >
      {/* Darker backdrop overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/50 pointer-events-none" />

      <h2 className="relative z-10 font-display font-medium text-xs tracking-[0.2em] uppercase text-metal-steel mb-12 flex items-center gap-4">
        <span className="w-12 h-[1px] bg-metal-steel/50"></span>
        About Me
      </h2>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div ref={textRef} className="space-y-8 font-body text-metal-silver text-lg md:text-xl leading-relaxed">
          <p>
            A  <span className="text-white font-medium">UNSW graduate</span> with an insatiable curiosity for technology and all things interesting.
          </p>
          <p>
            From crafting immersive web experiences to exploring the intersection of design and code, I'm driven by the joy of building things that feel alive and meaningful.
          </p>
          <p>
            Based in <span className="text-white font-medium">Sydney, Australia</span>
          </p>
          <p className="text-sm font-mono text-metal-steel pt-4">
            // CURRENT_STATUS: OPEN_TO_WORK
          </p>
        </div>

        {/* 3D Floating Card */}
        <div ref={cardRef}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/about-avatar.jpg" alt="Jackie - Pixel Art Avatar" className="rounded-2xl" />
        </div>
      </div>
    </section>
  );
}
