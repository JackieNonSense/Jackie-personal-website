import { createElement } from "react";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
async function component(file: string) {
  const path = resolve(`components/portfolio/${file}`);
  expect(existsSync(path), `implemented ${file}`).toBe(true);
  return import(/* @vite-ignore */ path);
}
describe("front-facing objects", () => {
  it("uses the supplied cyan-black monitor artwork without swapping to a different 3D shell", async () => {
    const { default: MonitorEntry } = await component("MonitorEntry.tsx");
    const { container } = render(createElement(MonitorEntry, { still: true }));
    const poster = container.querySelector('img[data-device-fallback="monitor"]');
    expect(poster).toHaveAttribute("src", "/portfolio/monitor-cyan-cutout-v02.png");
    expect(container.querySelector('svg[data-device-fallback="monitor"]')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('[data-monitor-renderer]')).toHaveAttribute('data-monitor-renderer', 'artwork');
  });
  it("uses a dedicated monitor surface with a legible non-WebGL startup and no decorative detection label", async () => {
    const { default: Portfolio } = await component("Portfolio.tsx");
    const { container } = render(createElement(Portfolio));
    expect(screen.queryByText("SIGNAL DETECTED")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Open monitor" });
    fireEvent.focus(link);
    expect(container.querySelector('[data-monitor-fallback-screen]')?.textContent).toBe("JR\nENTER");
    expect(container.querySelector('[data-testid="monitor-entry"] [class*="enterWord"]')).toBeNull();
    expect(screen.getByRole("link", { name: "ENTER TERMINAL ↗" })).toHaveAttribute("href", "/terminal");
  });
  it("provides a silent music deck and accurate artist credits in About", async () => {
    const { default: Portfolio } = await component("Portfolio.tsx");
    const { container } = render(createElement(Portfolio));
    expect(screen.getByRole("button", { name: "播放音乐" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "音量加，当前 25%" })).toBeEnabled();
    expect(container.querySelector("#about [data-testid='music-deck']")).not.toBeNull();
    expect(container.querySelector("audio")).toBeNull();
    expect(screen.getByText("MUSIC CREDITS")).toBeInTheDocument();
    expect(container.textContent).toContain("浜崎あゆみ");
    expect(container.textContent).toContain("ilyhiryu");
    expect(container.textContent).toContain("2z2");
    expect(container.textContent).not.toContain("Kevin MacLeod");
    expect(container.textContent).not.toContain("Two licensed listening demos");
    expect(container.querySelectorAll('a[href="https://creativecommons.org/licenses/by/4.0/"]')).toHaveLength(0);
    expect(screen.queryByText("SIGNAL STUDY")).not.toBeInTheDocument();
  });
  it("monitor wakes on focus, returns to black on blur and retains a native link", async () => {
    const { default: MonitorEntry } = await component("MonitorEntry.tsx");
    render(createElement(MonitorEntry, { still: true }));
    const link = screen.getByRole("link", { name: "Open monitor" });
    expect(link).toHaveAttribute("href", "/terminal");
    expect(screen.getByTestId("monitor-entry")).toHaveAttribute("data-awake", "false");
    fireEvent.focus(link);
    expect(screen.getByTestId("monitor-entry")).toHaveAttribute("data-awake", "true");
    fireEvent.blur(link);
    expect(screen.getByTestId("monitor-entry")).toHaveAttribute("data-awake", "false");
  });
  it("first touch wakes the monitor without navigating and reveals an explicit entry", async () => {
    const { default: MonitorEntry } = await component("MonitorEntry.tsx");
    render(createElement(MonitorEntry, { still: false }));
    const link = screen.getByRole("link", { name: "Open monitor" });
    // JSDOM has no PointerEvent implementation, so the native pointer type
    // property is supplied at the browser boundary, not mocked in the component.
    const event = new Event("pointerdown", { bubbles: true });
    Object.defineProperty(event, "pointerType", { value: "touch" });
    fireEvent(link, event);
    fireEvent.click(link);
    expect(screen.getByRole("link", { name: "进入终端" })).toHaveAttribute("href", "/terminal");
    expect(screen.getByTestId("monitor-entry")).toHaveAttribute("data-awake", "true");
  });
  it("static geometry remains present without WebGL and motion pause is independent", async () => {
    const { default: Portfolio } = await component("Portfolio.tsx");
    const { container } = render(createElement(Portfolio));
    expect(container.querySelector('[data-testid="music-deck"] img[data-device-fallback]')).not.toBeNull();
    expect(container.querySelector('[data-testid="monitor-entry"] img[data-device-fallback]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "暂停动态效果" }));
    expect(screen.getByRole("button", { name: "播放音乐" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Open monitor" })).toBeInTheDocument();
  });
});
