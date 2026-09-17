import { BufferGeometry, Float32BufferAttribute, ExtrudeGeometry, Shape, Path, PlaneGeometry } from 'three';
function rounded<T extends Path>(p: T, w: number, h: number, r: number, y = 0): T {
  const l = -w / 2, b = -h / 2 + y, t = h / 2 + y, q = w / 2;
  p.moveTo(l + r, b); p.lineTo(q - r, b); p.quadraticCurveTo(q, b, q, b + r);
  p.lineTo(q, t - r); p.quadraticCurveTo(q, t, q - r, t); p.lineTo(l + r, t);
  p.quadraticCurveTo(l, t, l, t - r); p.lineTo(l, b + r); p.quadraticCurveTo(l, b, l + r, b);
  return p;
}
export function housingGeometry() {
  const shape = rounded(new Shape(), 4.8, 3.24, .055);
  shape.holes.push(rounded(new Path(), 3.96, 2.72, .12, .16));
  const g = new ExtrudeGeometry(shape, { depth: .56, bevelEnabled: true, bevelSize: .018, bevelThickness: .018, bevelSegments: 3, curveSegments: 16 });
  g.translate(0, 0, -.12);
  return g;
}
export function bezelGeometry() {
  const outer = rounded(new Shape(), 3.96, 2.72, .12).getPoints(16);
  const inner = rounded(new Shape(), 3.44, 2.38, .14).getPoints(16);
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  for (let i = 0; i < outer.length; i++) {
    for (const [p, z] of [[outer[i], .43], [inner[i], .15]] as const) { positions.push(p.x, p.y + .16, z); uvs.push(p.x / 4 + .5, p.y / 3 + .5); }
    if (i < outer.length - 1) { const a = i * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new Float32BufferAttribute(uvs, 2)); g.setIndex(index); g.computeVertexNormals(); return g;
}
export function screenGeometry() {
  const g = new PlaneGeometry(3.4, 2.34, 64, 48), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 1.7, y = p.getY(i) / 1.17; p.setZ(i, .065 * (1 - .5 * x * x - .5 * y * y)); }
  g.computeVertexNormals(); return g;
}
export function cameraZoom(width: number, height: number, focused: boolean) {
  return focused ? Math.min(width / 3.65, height / 2.8) : Math.min(width / 5.3, height / 3.65);
}

