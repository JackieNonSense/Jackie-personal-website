"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ElementType,
} from "react";
import { prefersReducedMotion } from "@/lib/motion";

const CHARSET = "!<>-_\\/[]{}—=+*^?#01";

type ScrambleProps = {
  text: string;
  as?: ElementType;
  className?: string;
  /** ms per frame */
  speed?: number;
};

/** Decrypt-style text scramble, triggered once on scroll into view. */
export default function Scramble({
  text,
  as = "span",
  className,
  speed = 35,
}: ScrambleProps) {
  const ref = useRef<HTMLElement>(null);
  const [display, setDisplay] = useState(() =>
    prefersReducedMotion() ? text : ""
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setDisplay(text);
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    const run = () => {
      let frame = 0;
      interval = setInterval(() => {
        // lock one char every 2 frames, scramble the rest
        const locked = Math.floor(frame / 2);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          if (i < locked || text[i] === " ") {
            out += text[i];
          } else {
            out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
          }
        }
        setDisplay(out);
        frame++;
        if (locked >= text.length && interval) {
          clearInterval(interval);
          setDisplay(text);
        }
      }, speed);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [text, speed]);

  return createElement(as, { ref, className, "aria-label": text }, display || " ");
}
