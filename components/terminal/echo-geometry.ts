import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, PlaneGeometry, Shape } from 'three';

export const MACHINE = { width: 5.4, height: 3.72, screenWidth: 3.84, screenHeight: 2.40, screenY: .25 } as const;

function contour<T extends Path>(path: T, width: number, height: number, radius: number, y = 0): T {
  const left = -width / 2, right = width / 2, bottom = y - height / 2, top = y + height / 2;
  path.moveTo(left + radius, bottom);
  path.lineTo(right - radius, bottom); path.quadraticCurveTo(right, bottom, right, bottom + radius);
  path.lineTo(right, top - radius); path.quadraticCurveTo(right, top, right - radius, top);
  path.lineTo(left + radius, top); path.quadraticCurveTo(left, top, left, top - radius);
  path.lineTo(left, bottom + radius); path.quadraticCurveTo(left, bottom, left + radius, bottom);
  return path;
}

/** A real aperture, so the foreground housing cannot intercept display rays. */
export function frameGeometry(width: number, height: number, openingWidth: number, openingHeight: number, z: number, depth = .025, radius = .018) {
  const shape = contour(new Shape(), width, height, radius, MACHINE.screenY);
  shape.holes.push(contour(new Path(), openingWidth, openingHeight, radius, MACHINE.screenY));
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 2, curveSegments: 5 });
  geometry.translate(0, 0, z);
  return geometry;
}

export function chassisGeometry() { return frameGeometry(5.4, 3.14, 4.32, 2.88, -.19, .55, .025); }

/** The broad left highlight belongs to this recessed slope, not the faceplate. */
export function insetGeometry() {
  const outer = contour(new Shape(), 4.22, 2.78, .025).getPoints(8);
  const inner = contour(new Shape(), 3.89, 2.46, .044).getPoints(8);
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let i = 0; i < outer.length; i++) {
    for (const [point, z] of [[outer[i], .367], [inner[i], -.012]] as const) {
      positions.push(point.x, point.y + MACHINE.screenY, z);
      uv.push(point.x / 1.2 + .5, point.y / 1.2 + .5);
    }
    if (i < outer.length - 1) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function glassGeometry() {
  const geometry = new PlaneGeometry(MACHINE.screenWidth, MACHINE.screenHeight, 72, 48);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) / (MACHINE.screenWidth / 2), y = positions.getY(i) / (MACHINE.screenHeight / 2);
    positions.setZ(i, .078 * (1 - .54 * x * x - .46 * y * y));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function machineZoom(width: number, height: number, focused: boolean) {
  return focused ? Math.min(width / 4.14, height / 2.8) : Math.min(width / 5.92, height / 4.12);
}
