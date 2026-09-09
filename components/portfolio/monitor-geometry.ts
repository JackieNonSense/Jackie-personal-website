import { ExtrudeGeometry, Path, PlaneGeometry, Shape } from "three";
function rounded<T extends Path>(path: T, w: number, h: number, r: number, y = 0): T {
  const l = -w / 2, b = -h / 2 + y, t = h / 2 + y, right = w / 2;
  path.moveTo(l + r, b); path.lineTo(right - r, b); path.quadraticCurveTo(right, b, right, b + r);
  path.lineTo(right, t - r); path.quadraticCurveTo(right, t, right - r, t);
  path.lineTo(l + r, t); path.quadraticCurveTo(l, t, l, t - r);
  path.lineTo(l, b + r); path.quadraticCurveTo(l, b, l + r, b);
  return path;
}
export function frameGeometry(w: number, h: number, openingW: number, openingH: number, openingY: number) {
  const shape = rounded(new Shape(), w, h, .075);
  shape.holes.push(rounded(new Path(), openingW, openingH, .16, openingY));
  const geometry = new ExtrudeGeometry(shape, { depth: .22, bevelEnabled: true, bevelSize: .045, bevelThickness: .055, bevelSegments: 4, steps: 1, curveSegments: 16 });
  const uv = geometry.attributes.uv, p = geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, Math.max(0, Math.min(1, p.getX(i) / (w + .09) + .5)), Math.max(0, Math.min(1, p.getY(i) / (h + .09) + .5)));
  return geometry;
}
export function curvedScreen() {
  const geometry = new PlaneGeometry(3.17, 2.27, 48, 36);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) / 1.585, y = positions.getY(i) / 1.135;
    // Elliptical CRT cap: the center projects forward, the perimeter remains in its gasket.
    positions.setZ(i, .36 * (1 - .55 * x * x - .45 * y * y));
  }
  geometry.computeVertexNormals();
  return geometry;
}
