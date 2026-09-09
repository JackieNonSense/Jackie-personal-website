export type Glyph = { x: number; row: number; phase: number; speed: number; char: string; layer: number };

export function createGlyphs(width: number): Glyph[] {
  let seed = 73421;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const alphabet = "01:./+<>_01";
  return [12, 20, 30].flatMap((speed, layer) => Array.from({ length: Math.max(12, Math.floor(width / 17)) }, () => ({
    x: random() * (width + 160) - 80,
    row: layer === 2 ? .545 + random() * .023 : .47 + random() * .17,
    phase: random() * Math.PI * 2, speed, char: alphabet[Math.floor(random() * alphabet.length)], layer,
  })));
}

export function advanceX(x: number, speed: number, elapsed: number, width: number) {
  const next = x - speed * Math.max(0, Math.min(.05, elapsed));
  return next < -80 ? next + width + 160 : next;
}

export function scrollDisplacement(progress: number) {
  return Math.max(0, Math.min(1, progress)) * 20;
}

// Traced inside the actual material plate tear, not a repeated synthetic zigzag.
// Coordinates use the same 1586 × 992 artboard as every visual layer.
export const aperturePath = "M0 538 L45 521 L90 520 L126 527 L173 522 L216 535 L256 531 L292 516 L330 514 L366 519 L405 499 L451 506 L487 506 L531 493 L573 500 L623 487 L668 487 L704 482 L748 486 L790 495 L832 480 L881 465 L930 461 L975 466 L1021 470 L1065 459 L1108 443 L1153 442 L1195 444 L1233 453 L1274 458 L1315 477 L1355 495 L1399 509 L1433 510 L1475 493 L1519 482 L1586 481 L1586 568 L1547 575 L1509 582 L1465 598 L1420 605 L1376 618 L1338 640 L1297 642 L1250 641 L1202 644 L1159 637 L1115 628 L1069 617 L1028 618 L981 625 L938 620 L895 618 L850 623 L807 635 L762 641 L715 642 L672 641 L630 630 L582 632 L543 633 L499 631 L454 621 L411 617 L369 616 L326 621 L286 620 L242 612 L199 607 L157 604 L117 601 L74 604 L30 609 L0 612 Z";
