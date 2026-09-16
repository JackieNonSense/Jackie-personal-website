import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Portfolio from "../components/portfolio/Portfolio";

describe("approved continuous print composition", () => {
  it("keeps the approved display titles as accessible selectable page content", () => {
    render(<Portfolio />);
    for (const name of ["INKTRACE", "JACKIE", "STILL EXPLORING", "LET’S CONNECT"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeVisible();
    }
  });

  it("uses one noninteractive continuous paper fault behind all chapters", () => {
    const { container } = render(<Portfolio />);
    const faults = container.querySelectorAll('[data-testid="paper-fault"]');
    expect(faults).toHaveLength(1);
    expect(faults[0]).toHaveAttribute("aria-hidden", "true");
    expect(faults[0].closest("section")).toBeNull();
  });

  it("identifies the playable example honestly, with a real external link", () => {
    render(<Portfolio />);
    expect(screen.getByText(/Independent example content — not a product recording/)).toBeVisible();
    expect(screen.getByRole("link", { name: /Visit Inktrace/ })).toHaveAttribute("href", "https://inktrace.app");
  });

  it("keeps material artwork decorative rather than flattening the approved mockup", () => {
    const { container } = render(<Portfolio />);
    expect(screen.getByRole('button', {name:'Open the Living Archive'})).toBeVisible();
    expect(container.querySelector('img[src*="concept"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Explore experiments ↓" })).toHaveAttribute("href", "#experiments");
  });
});
