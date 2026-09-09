"use client";
import { useEffect, useRef, useState } from "react";
export function useObjectVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(false);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    let disposed = false;
    let frame: number | null = null;
    const check = () => {
      frame = null;
      if (disposed || !node.isConnected) return;
      // Observer entries are historical and can contain several transitions
      // for this same node. Reconcile once against its current layout instead
      // of allowing an older offscreen entry to freeze an on-screen object.
      const rect = node.getBoundingClientRect();
      const intersects = (margin: number) => rect.width > 0 && rect.height > 0
        && rect.right > -margin && rect.left < window.innerWidth + margin
        && rect.bottom > -margin && rect.top < window.innerHeight + margin;
      setVisible(intersects(0));
      if (intersects(250)) setNear(true);
    };
    const scheduleCheck = () => {
      if (!disposed && frame === null) frame = requestAnimationFrame(check);
    };
    const preload = new IntersectionObserver(scheduleCheck, { rootMargin: "250px" });
    const visibility = new IntersectionObserver(scheduleCheck);
    const size = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(scheduleCheck);
    preload.observe(node); visibility.observe(node);
    size?.observe(node);
    const updateTab = () => {
      if (disposed) return;
      // Stop drawing synchronously: background tabs can suspend the RAF that
      // performs geometry reconciliation until the tab becomes visible again.
      setTabVisible(!document.hidden);
      scheduleCheck();
    };
    updateTab();
    window.addEventListener("resize", scheduleCheck);
    document.addEventListener("visibilitychange", updateTab);
    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      preload.disconnect(); visibility.disconnect(); size?.disconnect();
      window.removeEventListener("resize", scheduleCheck);
      document.removeEventListener("visibilitychange", updateTab);
    };
  }, []);
  return { ref, near, visible, drawing: visible && tabVisible };
}
