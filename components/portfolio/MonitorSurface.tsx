"use client";
/* The poster is a transparent render of this exact Three.js model, not a second design. */
/* eslint-disable @next/next/no-img-element */
import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { bootLines } from "./monitor-boot";
import styles from "./Monitor.module.css";
const MonitorScene = lazy(() => import("./MonitorScene"));
export type MonitorProps = { near: boolean; active: boolean; awake: boolean; still: boolean };
class Boundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function MonitorSurface(props: MonitorProps) {
  const [ready, setReady] = useState(false);
  return <div className={styles.surface} data-monitor-renderer={ready ? "three" : "fallback"} aria-hidden="true">
    <div className={styles.fallback} hidden={ready}>
      <img className={styles.poster} src="/portfolio/monitor-standby-v04.png" width={760} height={684} data-device-fallback="monitor" alt="" draggable={false} />
      <div className={styles.fallbackScreen} data-monitor-fallback-screen data-awake={props.awake}>{props.awake && bootLines.map(line => <div key={line}>{line}</div>)}</div>
    </div>
    <div className={styles.stage} data-ready={ready} style={{ visibility: ready ? "visible" : "hidden" }}>
      {props.near && <Boundary onFailure={() => setReady(false)}><Suspense fallback={null}><MonitorScene {...props} onReady={() => setReady(true)} onFailure={() => setReady(false)} /></Suspense></Boundary>}
    </div>
  </div>;
}
