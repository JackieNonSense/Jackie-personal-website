import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

const plannedComponents = [
  "components/narrative/NarrativeHeader.tsx",
  "components/narrative/SignalHero.tsx",
  "components/narrative/MegacityAbout.tsx",
  "components/narrative/SignalWave.tsx",
];

describe("first redesign slice", () => {
  it.each(plannedComponents)("provides %s as a named component boundary", (file) => {
    const absolutePath = resolve(root, file);

    expect(existsSync(absolutePath), `${file} should exist`).toBe(true);

    if (existsSync(absolutePath)) {
      const source = readFileSync(absolutePath, "utf8");
      expect(source).toMatch(/export default function|export function/);
    }
  });

  it("removes the always-on Three.js scene from the homepage", () => {
    const source = readFileSync(resolve(root, "app/page.tsx"), "utf8");

    expect(source).not.toContain("DynamicScene");
    expect(source).not.toContain("ThreeProvider");
  });

  it("provides a reduced-motion fallback in the global styles", () => {
    const source = readFileSync(resolve(root, "app/globals.css"), "utf8");

    expect(source).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps production builds independent from remote font downloads", () => {
    const source = readFileSync(resolve(root, "app/layout.tsx"), "utf8");

    expect(source).not.toContain("next/font/google");
  });

  it("keeps the primary signal composition readable on the first painted frame", () => {
    const source = readFileSync(
      resolve(root, "components/narrative/SignalHero.tsx"),
      "utf8",
    );

    expect(source).not.toContain('clipPath: "inset(0 50% 0 50%)"');
    expect(source).not.toMatch(
      /className="hero-meta"[\s\S]{0,180}initial=\{shouldReduceMotion \? false : "hidden"\}/,
    );
  });
});
