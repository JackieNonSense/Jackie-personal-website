import { createElement } from "react";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

async function renderProof() {
  const componentPath = resolve("components/proof/HeroProof.tsx");
  expect(existsSync(componentPath), "isolated hero proof component exists").toBe(true);
  const { default: HeroProof } = await import(/* @vite-ignore */ componentPath);
  return render(createElement(HeroProof));
}

describe("isolated static hero proof", () => {
  it("announces the limited scope and exposes one semantic name", async () => {
    await renderProof();
    expect(screen.getByRole("heading", { level: 1, name: "Yuchao Wang" })).toBeInTheDocument();
    expect(screen.getByText(/不是完整首页/)).toBeInTheDocument();
    expect(screen.getByTestId("proof-stage")).toHaveAttribute("data-type", "artwork");
  });

  it("keeps the reference out of the default composition", async () => {
    await renderProof();
    expect(screen.queryByAltText("已认可的完整概念图")).not.toBeInTheDocument();
    expect(screen.getByTestId("paper-layer")).toBeInTheDocument();
    expect(screen.getByTestId("artwork-layer")).toBeInTheDocument();
  });

  it("switches to live font lettering without retaining the artwork image", async () => {
    await renderProof();
    fireEvent.click(screen.getByRole("button", { name: "Six Caps" }));
    expect(screen.getByTestId("proof-stage")).toHaveAttribute("data-type", "six-caps");
    expect(screen.queryByTestId("artwork-layer")).not.toBeInTheDocument();
    expect(screen.getByTestId("native-lettering")).toHaveTextContent("YUCHAO");
    fireEvent.click(screen.getByRole("button", { name: "League Gothic" }));
    expect(screen.getByTestId("proof-stage")).toHaveAttribute("data-type", "league-gothic");
  });

  it("can inspect lettering independently of the paper plate", async () => {
    await renderProof();
    fireEvent.click(screen.getByRole("checkbox", { name: "纸张材料" }));
    expect(screen.queryByTestId("paper-layer")).not.toBeInTheDocument();
    expect(screen.getByTestId("artwork-layer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "姓名图层" }));
    expect(screen.queryByTestId("artwork-layer")).not.toBeInTheDocument();
  });

  it("compares with the reference and returns without losing the type choice", async () => {
    await renderProof();
    fireEvent.click(screen.getByRole("button", { name: "Six Caps" }));
    fireEvent.click(screen.getByRole("button", { name: "查看原图" }));
    expect(screen.getByAltText("已认可的完整概念图")).toBeInTheDocument();
    expect(screen.queryByTestId("paper-layer")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看组合" }));
    expect(screen.getByTestId("proof-stage")).toHaveAttribute("data-type", "six-caps");
    expect(screen.getByTestId("paper-layer")).toBeInTheDocument();
  });

  it("supports an explicitly labelled reference overlay", async () => {
    await renderProof();
    fireEvent.change(screen.getByRole("slider", { name: "原图叠加透明度" }), { target: { value: "50" } });
    expect(screen.getByTestId("reference-overlay")).toHaveStyle({ opacity: "0.5" });
    fireEvent.change(screen.getByRole("slider", { name: "原图叠加透明度" }), { target: { value: "0" } });
    expect(screen.queryByTestId("reference-overlay")).not.toBeInTheDocument();
  });

  it("does not disguise static navigation labels as working links or drag controls", async () => {
    await renderProof();
    expect(screen.queryByRole("link", { name: /^(work|about|contact)$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /drag the signal/i })).not.toBeInTheDocument();
  });
});
