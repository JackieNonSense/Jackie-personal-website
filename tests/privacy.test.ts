import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("removes birthday decoration from current and retained public components", () => {
  for (const file of ["components/proof/HeroProof.tsx", "components/narrative/NarrativeHeader.tsx", "components/narrative/SignalHero.tsx"]) {
    expect(readFileSync(resolve(file), "utf8")).not.toContain("1127");
  }
});
it("keeps the unredacted original out of the public directory", () => {
  expect(existsSync(resolve("public/proof/hero-00/reference.png"))).toBe(false);
  expect(readFileSync(resolve("components/proof/HeroProof.tsx"), "utf8")).not.toContain("/reference.png");
});
