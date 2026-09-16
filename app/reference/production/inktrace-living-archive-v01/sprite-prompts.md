# Cast sprite proof — Phase 1

Built-in imagegen mode. The first master was inspected and retained. A targeted second pass corrected the alternate arm/knee phases. This is an animation asset test, not a finished production scene.

## Generation prompt

Use case: stylized-concept.
Asset type: a mechanically usable three-character pixel sprite animation sheet for a warm ivory and cobalt archive miniature, not a poster, not a scene background.

Create a PNG with a genuinely TRANSPARENT background. Exact regular layout: 8 equal columns by 3 equal rows, 24 separate full-body sprites total, no titles, no labels, no grid lines. Canvas proportion 16:9, ideally1536x864; each tile192x288. The same grounded foot baseline at 90% of every tile, body centered horizontally. There must be generous transparent gaps, every sprite entirely within its own tile. All characters share the same apparent standing height and same perspective.

Pixel art: deliberate crisp block pixels, effectively32x48 logical pixels per tile enlarged6x with nearest-neighbor edges. No antialiasing, no gradients, no painterly blur. Strong compact silhouettes, small realistic-adventure proportions (not giant chibi heads), slightly three-quarter side view facing right, like a lovingly crafted old archive exploration game. Palette limited to ink charcoal, earthy walnut browns, ivory paper, warm greys, two muted skin tones, and a little cobalt blue. Matte fabric shading in 3–4 discrete tones; no glossy highlights. No cast shadows or floor.

ROW 1 — same Mara character in all8cells: woman archivist, dark hair in short tied-back silhouette, walnut-brown knee-length coat, charcoal trousers/boots, small ivory paper parcel carried for work.
ROW 2 — same Ivo character in all8cells: man cartographer, brown short hair, cobalt-blue jacket, warm dark-grey trousers and boots, rolled ivory map for work.
ROW 3 — same Sen character in all8cells: guide, warm-grey short coat, beige scarf, dark trousers and boots, small folded paper for work.

The EIGHT COLUMNS must depict genuinely DIFFERENT limb poses, with consistent costume, body size and feet registration:
1. idle standing, both feet planted, arms relaxed, right-facing three-quarter view.
2. walk contact A: left leg conspicuously forward, right leg back, right arm forward, opposite arm back.
3. walk passing A: planted left leg vertical, right knee bent and lifted passing the left, arms cross nearer torso.
4. walk contact B: right leg conspicuously forward, left leg back, LEFT arm forward, opposite arm back. This is NOT a duplicate of column2.
5. walk passing B: planted right leg vertical, left knee bent and lifted, opposite passing pose from column3.
6. turn: back-facing full-body pose with face hidden, shoulders and coat back visible.
7. work reach: BOTH arms reach forward/right holding the paper/map, knees slightly bend, clearly different silhouette.
8. work deliver: arms lowered and paper/map extended outward at waist height, leaning forward a little to place the item.

Prioritize frame-to-frame anatomical continuity, leg separation, authentic alternate gait, and exact uniform grid over illustration detail. No backgrounds, no furniture, no bookshelves, no scene, no decorative marks, no text, no borders, no embedded shadow blobs. Each cell contains exactly one character. Never render multiple poses superimposed.

## Targeted gait correction prompt

Use case: precise-object-edit. Image1 is the EDIT TARGET: our three-row eight-column transparent sprite sheet. Preserve all three character identities, clothing, palette, scale, grid layout, transparent background, and the first, sixth, seventh and eighth columns exactly in spirit.
Targeted correction ONLY: make the walk cycle physically convincing with opposite leg and arm phases. Currently columns2 and4 are practically the same silhouette; columns3 and5 repeat the same raised-knee pose. Redraw columns2–5 in ALL THREE rows as a true four-frame horizontal walking cycle facing RIGHT. Keep all feet on the same baseline, head height nearly stable, torso facing right:
column2 full STRIDE: near leg projects forward-right with toe up, far leg extends back-left with toe planted, near ARM swings back-left.
column3 PASSING: near leg straight vertical supports body, far leg bent with knee lifted in front, near arm at torso midpoint.
column4 OPPOSITE STRIDE: far leg projects forward-right, near leg extends back-left, near ARM conspicuously swings forward-right at waist level, coat opens differently; show different near/far trouser shading so this is plainly different from column2. Hands cannot hold a paper against the torso during walking.
column5 OPPOSITE PASSING: far leg vertical supports body, near leg bent and crossing from back to forward, near arm down and back; noticeably different arm silhouette from column3.
Remove papers from hands in walkingframes only; attach satchel/rolled map to belt so arms can swing. Keep papers in workframes. All walkingframes must have distinct arm and knee silhouettes. No extra figures, text, shadows, floor, decorations, or gridlines. Pixel-art nearest-neighbor edges, no blur. Transparent PNG, same8x3grid.

## Mechanical processing

Original masters remain unmodified. Frame extraction uses a fixed x-grid and per-row foot baselines; the result is resampled to 30×46 with a 1px transparent gutter (32×48 cells), using nearest-neighbor sampling. A shared 24-color palette suppresses generated chromatic fringe pixels. All feet register at native y=42. No limbs were drawn or edited in code.

The action proof changes gait frames while moving position, then turns and delivers a record. A single idle frame is intentionally held; a final subtle multi-frame idle action is not represented as completed.
