"use client";

import { useRef, useState } from "react";
import RoomStage, { DESIGN_W, DESIGN_H } from "./RoomStage";
import Hotspot from "./Hotspot";
import Desk from "./objects/Desk";
import DeskComputer from "./objects/DeskComputer";
import Notebook from "./objects/Notebook";
import InkBottle from "./objects/InkBottle";
import Corkboard from "./objects/Corkboard";
import DeskLamp from "./objects/DeskLamp";
import RoomWindow from "./objects/RoomWindow";
import Plant from "./objects/Plant";
import NotebookOverlay from "./overlays/NotebookOverlay";
import { roomLabels, INKTRACE_URL } from "@/lib/content";
import { sfx } from "@/lib/sfx";
import { useParallax } from "@/lib/useParallax";
import { gsap } from "@/lib/motion";

type Overlay = null | "notebook";

/** The study room: layered parallax scene with interactive hotspots. */
export default function RoomScene() {
  const [lampOn, setLampOn] = useState(true);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const layer = useParallax();
  const drawerRef = useRef<HTMLDivElement>(null);

  const toggleLamp = () => {
    setLampOn((v) => {
      if (v) sfx.lampOff();
      else sfx.lampOn();
      return !v;
    });
  };

  const rattleDrawer = () => {
    sfx.drawer();
    if (drawerRef.current) {
      gsap.fromTo(
        drawerRef.current,
        { x: 0 },
        { x: 4, duration: 0.05, repeat: 5, yoyo: true, clearProps: "x" }
      );
    }
  };

  return (
    <main data-lit={lampOn ? "on" : "off"} className="room-lit-transition">
      <RoomStage>
        {/* ── wall layer (deep) ── */}
        <div ref={layer(0.25)} className="absolute inset-0">
          <div
            className="absolute"
            style={{
              inset: -40,
              background:
                "linear-gradient(to bottom, var(--room-wall) 0 72%, var(--room-floor) 72% 100%)",
            }}
          />
          {/* faint wall texture doodles */}
          <div
            aria-hidden
            className="absolute opacity-[0.05]"
            style={{
              inset: -40,
              backgroundImage:
                "radial-gradient(circle at 20% 30%, var(--paper) 1px, transparent 1.5px), radial-gradient(circle at 70% 60%, var(--paper) 1px, transparent 1.5px)",
              backgroundSize: "220px 180px",
            }}
          />

          <Hotspot
            x={1040}
            y={56}
            width={480}
            height={560}
            labelEn={roomLabels.window.en}
            labelCn={roomLabels.window.cn}
            labelSide="bottom"
            onClick={() => sfx.windowOpen()}
          >
            <RoomWindow />
          </Hotspot>

          <Hotspot
            x={110}
            y={110}
            width={460}
            height={340}
            labelEn={roomLabels.corkboard.en}
            labelCn={roomLabels.corkboard.cn}
            labelSide="bottom"
            onClick={() => sfx.paper() /* CorkboardOverlay lands in CP3 */}
          >
            <Corkboard />
          </Hotspot>
        </div>

        {/* ── desk layer ── */}
        <div ref={layer(1)} className="absolute inset-0">
          <div className="absolute" style={{ left: 100, top: 580 }}>
            <Desk />
          </div>

          {/* drawer hotspot (over the desk's drawer graphic) */}
          <div ref={drawerRef} className="absolute" style={{ left: 1120, top: 736 }}>
            <Hotspot
              x={0}
              y={0}
              width={280}
              height={110}
              labelEn={roomLabels.drawer.en}
              labelCn={roomLabels.drawer.cn}
              labelSide="bottom"
              onClick={rattleDrawer}
            >
              <div className="w-full h-full" />
            </Hotspot>
          </div>

          <Hotspot
            x={740}
            y={296}
            width={380}
            height={360}
            labelEn={roomLabels.computer.en}
            labelCn={roomLabels.computer.cn}
            onClick={() => sfx.bootChime() /* EnterOs lands in CP2 */}
          >
            <DeskComputer />
          </Hotspot>

          <Hotspot
            x={1200}
            y={236}
            width={260}
            height={420}
            labelEn={roomLabels.lamp.en}
            labelCn={roomLabels.lamp.cn}
            onClick={toggleLamp}
          >
            <DeskLamp lit={lampOn} />
          </Hotspot>

          <Hotspot
            x={490}
            y={556}
            width={220}
            height={160}
            labelEn={roomLabels.notebook.en}
            labelCn={roomLabels.notebook.cn}
            onClick={() => {
              sfx.paper();
              setOverlay("notebook");
            }}
          >
            <Notebook />
          </Hotspot>

          <Hotspot
            x={286}
            y={430}
            width={200}
            height={220}
            labelEn={roomLabels.ink.en}
            labelCn={roomLabels.ink.cn}
            onClick={() => window.open(INKTRACE_URL, "_blank", "noopener")}
          >
            <InkBottle />
          </Hotspot>

          {/* lamp light pool over the desk */}
          <div
            aria-hidden
            className="lamp-pool pointer-events-none absolute"
            style={{
              left: 560,
              top: 60,
              width: 900,
              height: 760,
              opacity: lampOn ? 1 : 0,
            }}
          />
        </div>

        {/* ── foreground layer ── */}
        <div ref={layer(1.4)} className="absolute inset-0 pointer-events-none">
          <div className="absolute" style={{ left: -30, top: 520 }}>
            <Plant />
          </div>
          {/* soft floor shadow vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 50% 45%, transparent 60%, rgba(0,0,0,0.35) 100%)",
            }}
          />
        </div>

        {/* handwritten site title, taped to the top-left of the "photo" */}
        <div
          className="absolute select-none"
          style={{ left: 620, top: 40, transform: "rotate(-2deg)" }}
        >
          <p
            className="text-5xl text-paper"
            style={{ fontFamily: "var(--font-hand-display)", textShadow: "2px 3px 0 rgba(0,0,0,0.4)" }}
          >
            jackie&apos;s room
          </p>
          <p
            lang="zh"
            className="mt-1 text-2xl text-paper-dim text-center"
            style={{ fontFamily: "var(--font-hand-cn)" }}
          >
            深夜书房 · 请随便看看
          </p>
        </div>

        {/* hint, bottom center */}
        <p
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rotate-1 text-2xl text-paper-dim/80 select-none"
          style={{ fontFamily: "var(--font-hand-display)", width: DESIGN_W * 0.5, textAlign: "center" }}
        >
          things in this room respond to clicks. explore.
        </p>
      </RoomStage>

      {overlay === "notebook" && <NotebookOverlay onClose={() => setOverlay(null)} />}

      {/* keep design-space constants referenced (letterbox math lives in RoomStage) */}
      <span className="hidden">{DESIGN_H}</span>
    </main>
  );
}
