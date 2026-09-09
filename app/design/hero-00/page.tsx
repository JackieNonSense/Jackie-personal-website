import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroProof from "@/components/proof/HeroProof";

export const metadata: Metadata = {
  title: "Hero 00 — 静态字形对照",
  robots: { index: false, follow: false },
};

export default function HeroProofPage() {
  // Review tooling is deliberately unavailable in production builds.
  if (process.env.NODE_ENV === "production") notFound();
  return <HeroProof />;
}
