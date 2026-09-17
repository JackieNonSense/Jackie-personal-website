import { createElement } from "react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

async function moduleAt(name: string) {
  const path = resolve(`components/portfolio/${name}`);
  expect(existsSync(path), `planned implementation ${name} exists`).toBe(true);
  return import(/* @vite-ignore */ path);
}

describe("signal behavior", () => {
  it("creates deterministic sparse three-speed characters", async () => {
    const { createGlyphs } = await moduleAt("signal-model.ts");
    const glyphs = createGlyphs(1440);
    expect(glyphs).toEqual(createGlyphs(1440));
    expect(new Set(glyphs.map((g: { speed: number }) => g.speed))).toEqual(new Set([12, 20, 30]));
    expect(glyphs.length).toBeLessThan(400);
  });
  it("caps time after background suspension and wraps movement", async () => {
    const { advanceX } = await moduleAt("signal-model.ts");
    expect(advanceX(100, 20, 1 / 60, 1000)).toBeCloseTo(99.6667, 3);
    expect(advanceX(100, 20, 100, 1000)).toBeCloseTo(99, 3);
    expect(advanceX(-79.9, 20, .05, 1000)).toBeGreaterThan(900);
  });
  it("limits scroll depth inside the stationary aperture to twenty pixels", async () => {
    const { scrollDisplacement } = await moduleAt("signal-model.ts");
    expect(typeof scrollDisplacement).toBe("function");
    expect(scrollDisplacement(-.5)).toBe(0);
    expect(scrollDisplacement(.5)).toBe(10);
    expect(scrollDisplacement(3)).toBe(20);
  });
  it("opens the paper on activation without turning symbols into a project name", async () => {
    const { default: SignalRift } = await moduleAt("SignalRift.tsx");
    render(createElement(SignalRift, { paused: false, reducedMotion: true }));
    const button = screen.getByRole("button", { name: "探索裂隙" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/INKTRACE/i)).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
  it("a second activation closes the opening with a persistent backing and two paper layers", async () => {
    const { default: SignalRift } = await moduleAt("SignalRift.tsx");
    const { container } = render(createElement(SignalRift, { paused: true, reducedMotion: true }));
    const button = screen.getByRole("button", { name: "探索裂隙" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector('[data-rift-backing]')).not.toBeNull();
    expect(container.querySelector('[data-rift-bed] img')).not.toBeNull();
    expect(screen.getByTestId('rift-canvas')).toHaveAttribute('data-paper-layers','upper lower');
  });
});

describe("complete local portfolio", () => {
  it("uses the approved Hero art and retains a readable asset fallback", async () => {
    const { default: Portfolio } = await moduleAt("Portfolio.tsx");
    const { container } = render(createElement(Portfolio));
    const artwork = container.querySelector('img[src="/studies/hero-ink-signal/approved-hero.png"]');
    expect(artwork).not.toBeNull();
    fireEvent.error(artwork!);
    expect(screen.getByRole('heading', {name:'Yuchao Wang'})).toHaveAttribute('data-artwork-fallback','true');
  });
  it("has real ordered chapters and no public birthday beyond approved email", async () => {
    const { default: Portfolio } = await moduleAt("Portfolio.tsx");
    const { container } = render(createElement(Portfolio));
    expect(screen.getByRole("heading", { level: 1, name: "Yuchao Wang" })).toBeInTheDocument();
    expect([...container.querySelectorAll("section[id]")].map(s => s.id)).toEqual(["signal", "about", "work", "experiments", "contact"]);
    for (const id of ["work", "about", "experiments", "contact"]) {
      expect(container.querySelector(`a[href="#${id}"]`)).not.toBeNull();
    }
    expect(container.textContent?.replaceAll("whoisjackie1127@gmail.com", "")).not.toContain("1127");
    expect(screen.getByRole("link", { name: /Visit Inktrace/ })).toHaveAttribute("href", "https://inktrace.app");
    expect(screen.getByRole("link", { name: /Open monitor/ })).toHaveAttribute("href", "/terminal");
    expect(container.textContent).not.toMatch(/Project [123]|OPEN_TO_WORK|DRAG THE SIGNAL/);
  });
  it("provides a global pause switch without removing content", async () => {
    const { default: Portfolio } = await moduleAt("Portfolio.tsx");
    render(createElement(Portfolio));
    const pause = screen.getByRole("button", { name: "暂停动态效果" });
    fireEvent.click(pause);
    expect(screen.getByRole("button", { name: "恢复动态效果" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /Visit Inktrace/ })).toBeVisible();
  });
  it("serves the approved portfolio in production and preserves the terminal route", async () => {
    const { default: Home } = await import("../app/page");
    const { default: Portfolio } = await import("../components/portfolio/Portfolio");
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(Home().type).toBe(Portfolio);
    } finally {
      vi.unstubAllEnvs();
    }
    const source = readFileSync(resolve("app/page.tsx"), "utf8");
    expect(source).not.toContain("process.env.NODE_ENV");
    expect(source).not.toContain("return <HeroProof");
    expect(readFileSync(resolve("app/terminal/page.tsx"), "utf8")).toContain("<TerminalScene />");
  });
});
