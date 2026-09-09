"use client";
import { Component, lazy, Suspense, useId, type ReactNode } from "react";
import styles from "./Devices.module.css";
const DeviceScene = lazy(() => import("./DeviceScene"));
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export type SurfaceProps = { kind: "deck" | "monitor"; near: boolean; active: boolean; still: boolean; awake?: boolean; phase?: "seated" | "out" | "in" };

/** Static vector material survives unsupported WebGL, lost contexts and lazy
 * chunk errors. It shares the exact front-elevation dimensions of the model. */
export default function DeviceSurface(props: SurfaceProps) {
  const id = useId().replace(/:/g, "");
  const monitor = props.kind === "monitor";
  return <div className={styles.surface} aria-hidden="true">
    <svg data-device-fallback={props.kind} viewBox={monitor ? "0 0 400 360" : "0 0 800 320"} preserveAspectRatio="none" className={styles.surfaceSvg}>
      <defs>
        <linearGradient id={`${id}-metal`} x2=".2" y2="1"><stop stopColor={monitor ? "#ddd4c1" : "#ddddda"} /><stop offset=".08" stopColor={monitor ? "#c9bfa9" : "#a9aaa7"} /><stop offset=".52" stopColor={monitor ? "#d4cbb8" : "#c2c3be"} /><stop offset="1" stopColor={monitor ? "#a89d88" : "#858782"} /></linearGradient>
        <linearGradient id={`${id}-rim`} x2="0" y2="1"><stop stopColor="#181b19" /><stop offset=".5" stopColor="#66655a" /><stop offset="1" stopColor="#ddd5c2" /></linearGradient>
        <radialGradient id={`${id}-glass`} cx=".16" cy=".03" r=".95"><stop stopColor="#353a3a" /><stop offset=".32" stopColor="#0d1112" /><stop offset="1" stopColor="#030606" /></radialGradient>
        <filter id={`${id}-grain`}><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="21" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".07" /></feComponentTransfer><feComposite in2="SourceAlpha" operator="in" /><feBlend in="SourceGraphic" mode="soft-light" /></filter>
      </defs>
      {monitor ? <>
        <rect x="35" y="333" width="48" height="14" rx="3" fill="#786f5a" /><rect x="317" y="333" width="48" height="14" rx="3" fill="#786f5a" />
        <rect x="15" y="15" width="370" height="320" rx="10" fill={`url(#${id}-metal)`} stroke="#e4ddcd" strokeWidth="1.2" filter={`url(#${id}-grain)`} />
        <rect x="45" y="43" width="310" height="247" rx="14" fill={`url(#${id}-rim)`} />
        <rect x="57" y="54" width="286" height="224" rx="22" fill={`url(#${id}-glass)`} stroke="#070a09" strokeWidth="5" />
        <path d="M17 298H383" stroke="#8d846f" /><path d="M17 299H383" stroke="#e0d8c6" />
        <circle cx="57" cy="316" r="2.5" fill="#637837" /><text x="69" y="319" fontSize="6" fill="#34372f" fontFamily="monospace">POWER</text>
        <rect x="287" y="307" width="24" height="15" rx="2" fill="#b9ae98" stroke="#6d6758" /><circle cx="340" cy="315" r="8" fill="#c6bba4" stroke="#6a6759" />
      </> : <>
        <rect x="10" y="12" width="780" height="293" rx="12" fill="#464944" />
        <rect x="10" y="6" width="780" height="291" rx="10" fill={`url(#${id}-metal)`} stroke="#e0e1d9" strokeWidth="1.4" filter={`url(#${id}-grain)`} />
        <path d="M12 71H788M12 242H788" stroke="#555953" /><path d="M12 73H788M12 244H788" stroke="#ecece5" />
        <rect x="127" y="30" width="546" height="21" rx="5" fill="#080c0a" stroke="#777d72" strokeWidth="3" />
        <rect x="134" y="89" width="534" height="135" rx="9" fill="#41453d" stroke="#f0f0e5" />
        <rect x="141" y="96" width="520" height="121" rx="6" fill={`url(#${id}-glass)`} stroke="#070b08" strokeWidth="3" />
      </>}
    </svg>
    {props.near && <SceneBoundary><Suspense fallback={null}><DeviceScene {...props} /></Suspense></SceneBoundary>}
  </div>;
}
