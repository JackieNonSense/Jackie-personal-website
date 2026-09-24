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

  it("lights the fault rather than moving it, and holds that light still for reduced motion", () => {
    const { container } = render(<Portfolio />);
    const fault = container.querySelector('[data-testid="paper-fault"]')!;
    // Still one decorative element: the light is a second stroke on the same crack,
    // not a new overlay. A crack in paper does not move; the light across it does.
    expect(container.querySelectorAll('[data-testid="paper-fault"]')).toHaveLength(1);
    const paths = fault.querySelectorAll("path");
    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute("d")).toBe(paths[1].getAttribute("d"));
    // The light is the stroke paint, so the crack itself never has to move.
    expect(paths[1].getAttribute("stroke")).toBe("url(#fault-light)");
    // The test environment reports prefers-reduced-motion, so the travelling
    // highlight must be parked rather than tracking scroll.
    expect(fault.querySelector("linearGradient")!.getAttribute("gradientTransform")).toBe("translate(0 -0.0800)");
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
    expect(screen.getByRole('img', {name:/printed zine/})).toBeVisible();
    expect(container.querySelector('img[src*="concept"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Explore experiments ↓" })).toHaveAttribute("href", "#experiments");
  });
});
