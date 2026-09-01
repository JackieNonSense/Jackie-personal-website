"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const DESIGN_W = 1600;
export const DESIGN_H = 1000;

type StageCtx = {
  scale: number;
  isCoarse: boolean;
};

const Ctx = createContext<StageCtx>({ scale: 1, isCoarse: false });
export const useStage = () => useContext(Ctx);

/**
 * Fixed 1600×1000 design space scaled to the viewport (contain, but never
 * below 0.4 so hotspots stay tap-safe on phones — slight crop instead).
 */
export default function RoomStage({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StageCtx>({ scale: 1, isCoarse: false });

  useEffect(() => {
    const measure = () => {
      const contain = Math.min(
        window.innerWidth / DESIGN_W,
        window.innerHeight / DESIGN_H
      );
      setState({
        scale: Math.max(contain, 0.4),
        isCoarse: window.matchMedia("(pointer: coarse)").matches,
      });
    };
    const t = setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <Ctx.Provider value={state}>
      <div className="fixed inset-0 overflow-hidden bg-night-deep flex items-center justify-center">
        <div
          className="relative shrink-0"
          style={{
            width: DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${state.scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </Ctx.Provider>
  );
}
