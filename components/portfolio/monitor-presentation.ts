export type Presentation = "unprepared" | "prepared" | "drawn" | "ready";
export function presentationStep(state: Presentation, event: "prepare" | "draw" | "after-render"): Presentation {
  if (state === "ready") return state;
  if (event === "prepare") return "prepared";
  if (event === "draw" && state === "prepared") return "drawn";
  if (event === "after-render" && state === "drawn") return "ready";
  return state;
}
