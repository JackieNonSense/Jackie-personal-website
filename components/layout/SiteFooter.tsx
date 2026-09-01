"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Footer: access log line + copyright + the original hidden terminal link. */
export default function SiteFooter() {
  const [visitor, setVisitor] = useState("0000");
  const [stamp, setStamp] = useState("--------");

  useEffect(() => {
    setVisitor(String(Math.floor(Math.random() * 9000) + 1000));
    const d = new Date();
    setStamp(d.toISOString().replace("T", " ").slice(0, 19));
  }, []);

  return (
    <footer className="relative border-t border-line px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto flex flex-wrap items-end justify-between gap-6 font-mono text-xs text-phos-dim">
        <div className="space-y-1">
          <p>
            ACCESS LOG: [{stamp}] VISITOR #{visitor}{" "}
            <span lang="zh" className="font-cjk">
              访客记录
            </span>
          </p>
          <p>© 2025 Yuchao Wang — ALL FILES RECOVERED FROM LAB 7</p>
        </div>

        <div className="flex gap-8 items-baseline">
          <Link
            href="/terminal"
            className="text-phos-dim/50 italic hover:text-[#33ff33] hover:drop-shadow-[0_0_8px_#33ff33] transition-all duration-300"
            aria-label="Access Terminal"
          >
            -????
          </Link>
        </div>
      </div>
    </footer>
  );
}
