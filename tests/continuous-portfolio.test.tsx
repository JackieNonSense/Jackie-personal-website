import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Portfolio from "../components/portfolio/Portfolio";

describe("approved continuous print composition", () => {
  it("keeps the approved display titles as accessible selectable page content", () => {
    render(<Portfolio />);
    for (const name of ["ABOUT ME", "PROJECTS", "STILL EXPLORING", "LET’S CONNECT"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeVisible();
    }
  });

  it("introduces the monitor in words, not just a bare device", () => {
    render(<Portfolio />);
    const experiments = screen.getByRole("region", { name: "STILL EXPLORING" });
    expect(experiments).toHaveAttribute("id", "experiments");
    // The section used to carry only a screen-reader-only title, leaving the CRT
    // standing alone with no explanation of what it is or how to get in.
    expect(within(experiments).getByText(/A small experiment/)).toBeVisible();
    expect(within(experiments).getByText(/Find the password/)).toBeVisible();
    expect(within(experiments).getByRole("link", { name: "ENTER TERMINAL ↗" })).toBeInTheDocument();
  });

  it("uses one noninteractive continuous paper fault behind all chapters", () => {
    const { container } = render(<Portfolio />);
    const faults = container.querySelectorAll('[data-testid="paper-fault"]');
    expect(faults).toHaveLength(1);
    expect(faults[0]).toHaveAttribute("aria-hidden", "true");
    expect(faults[0].closest("section")).toBeNull();
  });

  it("keeps the exterior concise, with a real external product link", () => {
    render(<Portfolio />);
    expect(screen.queryByText(/A playable interpretation|A small archive, waiting/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Visit Inktrace/ })).toHaveAttribute("href", "https://inktrace.app");
  });

  it("keeps material artwork decorative rather than flattening the approved mockup", () => {
    const { container } = render(<Portfolio />);
    expect(screen.getByRole('button', {name:'Open the Living Archive'})).toBeVisible();
    expect(container.querySelector('img[src*="concept"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Explore experiments ↓" })).toHaveAttribute("href", "#experiments");
  });
});
