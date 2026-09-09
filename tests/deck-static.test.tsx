import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("static A review milestone", () => {
  it("replaces the old deck illustration while keeping genuine accessible music controls", async () => {
    const { default: Portfolio } = await import("../components/portfolio/Portfolio");
    const { container } = render(createElement(Portfolio));
    const deck = container.querySelector('[data-testid="music-deck"]')!;
    expect(deck.querySelector('img[data-device-fallback="deck"]')).toHaveAttribute("src", "/portfolio/deploy-standby-v03.png");
    expect(deck).toHaveAttribute('data-power','off');
    expect(screen.getByRole('button',{name:'开启音乐台'})).toBeEnabled();
    const surface=deck.querySelector('[data-deck-renderer]')!;
    expect(surface).not.toHaveAttribute('aria-hidden','true');
    const panel=surface.querySelector('[data-deck-controls="integrated"]')!;
    expect(panel).not.toBeNull();
    expect(panel.querySelectorAll('button')).toHaveLength(5);
    expect(panel.querySelector('input[type="range"]')).toBeInTheDocument();
    expect(deck.querySelectorAll('button')).toHaveLength(5);
    expect(deck.querySelector('svg[data-device-fallback="deck"]')).toBeNull();
    expect(deck.querySelector('[data-deck-renderer]')).toHaveAttribute("data-deck-renderer", "fallback");
    expect(screen.getByRole("button", { name: "播放音乐" })).toBeEnabled();
    expect(screen.getByRole("slider", { name: "音乐音量" })).toHaveValue("25");
    const display=screen.getByRole("button",{name:"切换显示模式"});
    expect(display).toHaveAttribute('aria-pressed','false');fireEvent.click(display);
    expect(display).toHaveAttribute('aria-pressed','true');
    fireEvent.click(screen.getByRole("button", { name: "暂停动态效果" }));
    expect(screen.getByRole("button", { name: "播放音乐" })).toBeEnabled();
    expect(container.querySelector("audio")).toBeNull();
  });
});
