import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const file = resolve("public/portfolio/deck-a-v02.glb");
function asset() {
  expect(existsSync(file), "the independent A model must be exported, not substituted with an SVG").toBe(true);
  const buffer = readFileSync(file);
  expect(buffer.readUInt32LE(0)).toBe(0x46546c67);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString("utf8"));
}
describe("A deck model contract", () => {
  it("provides real geometric function symbols attached to each moving key",()=>{
    const gltf=asset();
    for(const name of ['KeyPlay','KeyNext','KeyDisplay','KeyMute']){
      const key=gltf.nodes.find((node:{name:string})=>node.name===name);
      const icon=gltf.nodes.findIndex((node:{name:string})=>node.name===name+'Icon');
      expect(icon).toBeGreaterThanOrEqual(0);expect(key.children).toContain(icon);
      expect(gltf.nodes[icon].children.length).toBeGreaterThan(0);
    }
  });
  it("exports articulated components under a single rigid face pivot", () => {
    const gltf = asset();
    const nodes = gltf.nodes as { name: string; children?: number[] }[];
    const names = nodes.map(node => node.name);
    for (const name of ["Chassis", "FacePivot", "VolumePivot", "KeyPlay", "KeyNext", "KeyDisplay", "KeyMute", "DiscCarrier", "Screen", "Glass"])
      expect(names).toContain(name);
    const descendants = (index: number): string[] => [nodes[index].name, ...(nodes[index].children ?? []).flatMap(descendants)];
    const face = descendants(names.indexOf("FacePivot"));
    for (const name of ["VolumePivot", "KeyPlay", "KeyNext", "KeyDisplay", "KeyMute", "Screen", "Glass"]) expect(face).toContain(name);
    expect(face).not.toContain("Chassis");
    expect(face).not.toContain("DiscCarrier");
  });
  it("has real mesh detail within the static asset budget and no device signature", () => {
    const gltf = asset();
    const triangles = gltf.meshes.flatMap((mesh: { primitives: { indices: number }[] }) => mesh.primitives)
      .reduce((sum: number, primitive: { indices: number }) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    expect(triangles).toBeGreaterThan(5000);
    expect(triangles).toBeLessThan(80000);
    expect(statSync(file).size).toBeLessThan(5 * 1024 * 1024);
    expect(gltf.nodes.map((node: { name: string }) => node.name).join(" ")).not.toMatch(/jackie|1127/i);
  });
});
