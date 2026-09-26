import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
vi.mock("../components/portfolio/y2k-deck/Y2kScene", () => ({ default: () => null }));
import { describe, expect, it } from "vitest";

describe("static A review milestone", () => {
  it("replaces the old deck illustration while keeping genuine accessible music controls", async () => {
    const { default: Portfolio } = await import("../components/portfolio/Portfolio");
    const { container } = render(createElement(Portfolio));
    const deck = container.querySelector('[data-testid="music-deck"]')!;
    expect(deck.querySelector('img[data-device-fallback="deck"]')).toHaveAttribute("src", "/portfolio/y2k-deck/closed.webp");
    expect(deck).toHaveAttribute('data-power','off');
    expect(screen.getByRole('button',{name:'开启音乐台'})).toBeEnabled();
    const surface=deck.querySelector('[data-deck-renderer]')!;
    expect(surface).not.toHaveAttribute('aria-hidden','true');
    const panel=surface.querySelector('[data-deck-controls="integrated"]')!;
    expect(panel).not.toBeNull();
    expect(panel.querySelectorAll('button')).toHaveLength(9);
    expect(deck.querySelectorAll('button')).toHaveLength(9);
    expect(deck.querySelector('svg[data-device-fallback="deck"]')).toBeNull();
    expect(deck.querySelector('[data-deck-renderer]')).toHaveAttribute("data-deck-renderer", "fallback");
    expect(screen.getByRole("button", { name: "播放音乐" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "音量加，当前 25%" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "暂停动态效果" }));
    expect(screen.getByRole("button", { name: "播放音乐" })).toBeEnabled();
    expect(container.querySelector("audio")).toBeNull();
  });
});
