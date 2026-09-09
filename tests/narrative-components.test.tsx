import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MegacityAbout from "../components/narrative/MegacityAbout";
import NarrativeHeader from "../components/narrative/NarrativeHeader";
import SignalHero from "../components/narrative/SignalHero";
import SignalWave from "../components/narrative/SignalWave";

describe("NarrativeHeader", () => {
  it("offers working anchors for the visible story chapters", () => {
    render(<NarrativeHeader />);

    expect(screen.getByRole("link", { name: /jackie home/i })).toHaveAttribute(
      "href",
      "#signal",
    );
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute(
      "href",
      "#about",
    );
    expect(screen.getByRole("link", { name: /work/i })).toHaveAttribute(
      "href",
      "#work",
    );
    expect(screen.getByRole("link", { name: /contact/i })).toHaveAttribute(
      "href",
      "#contact",
    );
    expect(screen.getByRole("link", { name: /terminal/i })).toHaveAttribute(
      "href",
      "/terminal",
    );
  });
});

describe("SignalHero", () => {
  it("introduces Yuchao and exposes the next chapter", () => {
    render(<SignalHero />);

    expect(
      screen.getByRole("heading", { level: 1, name: /yuchao wang/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/frontend\s*\/\s*creative technology/i)).toBeInTheDocument();
    expect(screen.getByText(/signal detected/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /follow signal/i })).toHaveAttribute(
      "href",
      "#about",
    );
    expect(
      screen.getByRole("button", { name: /drag the signal/i }),
    ).toBeInTheDocument();
  });
});

describe("SignalWave", () => {
  it("renders a labelled signal visual without hiding core content", () => {
    render(<SignalWave />);

    expect(screen.getByRole("img", { name: /live signal waveform/i })).toBeInTheDocument();
  });
});

describe("MegacityAbout", () => {
  it("presents the identity dossier and a semantic city visual", () => {
    render(<MegacityAbout />);

    expect(screen.getByRole("heading", { level: 2, name: /designing systems/i })).toBeInTheDocument();
    expect(screen.getByText(/sydney, australia/i)).toBeInTheDocument();
    expect(screen.getByText(/creative developer/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /megacity sector map/i })).toBeInTheDocument();
    expect(screen.getByText(/chapter 02/i)).toBeInTheDocument();
  });
});
