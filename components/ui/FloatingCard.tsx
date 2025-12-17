"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";

interface FloatingCardProps {
  imageSrc: string;
  alt?: string;
}

export default function FloatingCard({ imageSrc, alt = "Featured work" }: FloatingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      // Calculate rotation (max 15 degrees)
      const rotateY = (mouseX / (rect.width / 2)) * 15;
      const rotateX = -(mouseY / (rect.height / 2)) * 15;

      setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => {
      setIsHovering(false);
      setRotation({ x: 0, y: 0 });
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseenter", handleMouseEnter);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseenter", handleMouseEnter);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="relative w-full h-[400px] perspective-1000"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(${isHovering ? 30 : 0}px)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Card with glassmorphism */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm shadow-2xl">
          {/* Image */}
          <div className="relative w-full h-full">
            <Image
              src={imageSrc}
              alt={alt}
              fill
              className="object-cover opacity-80"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Shine effect on hover */}
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
            style={{
              opacity: isHovering ? 0.1 : 0,
              background: `linear-gradient(${105 + rotation.y}deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)`,
            }}
          />
        </div>

        {/* Floating shadow */}
        <div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 rounded-full bg-black/30 blur-xl transition-all duration-200"
          style={{
            transform: `translateX(-50%) scale(${isHovering ? 1.1 : 1})`,
            opacity: isHovering ? 0.5 : 0.3,
          }}
        />
      </div>
    </div>
  );
}
