# B — production assets / built-in imagegen

The user explicitly selected B (pixel-art archive world). These are illustrated sample assets, not product screenshots. Original generated images are preserved. The production scene is deliberately text-free; labels, controls, connections and animated drawers are live elements.

## Archive world v01

Input: approved `b-pixel-story-world.png`, as composition/style reference.
Output: `public/studies/inktrace/pixel-world/archive-world-v01.png`.
Original: `exec-482917c5-8f80-4f1c-b10e-9bff7fa38787.png`.

Use case: stylized-concept
Asset type: production background illustration for a clickable pixel-art archive, landscape 1536x1024.
Image 1 is an approved STYLE AND COMPOSITION REFERENCE only. Create just the illustrated archive interior from inside its window, filling the entire new image. NOT a website screenshot. NO surrounding black paper, no title bar, no controls, no tabs, no typography anywhere.
Preserve the beautiful warm ivory / mushroom gray / charcoal pixel-art material language and front-facing slightly elevated view. Center foreground is a large open ivory book with thick layered pages, occupying x10%-77%, y28%-78%. Three miniature pixel people stand on the lower part of these pages (left traveler with tan coat, center dark teal coat, right olive coat); keep them tiny, 45 pixels tall. Leave large uninterrupted blank ivory page areas ABOVE them for live event labels. NO printed timelines, no printed blue connectors: these will be live layers.
Surround the book with an intricate but quiet cutaway archive of file drawers, oversized standing books, a paper staircase rising on left and receding shelves. Right quarter contains a closed filing cabinet with rectangular warm-gray drawers, no writing, leave middle-right area visually quiet for a separate animated pull-out folio. One small muted cobalt thread/plant in upper right permitted. Crisp carefully placed pixel clusters, dithered shadow steps and dimensional paper layers; no fuzzy photoreal grain. Restrained rich palette: cream ivory #EEE8D8, mushroom, gray umber, dark charcoal, very small muted cobalt.
Lighting upper left warm paper reflections and deep contact shadows in the drawers. Reference is not an edit target: redesign only enough to create the clean separable production asset described here.
STRICTLY no text, letters, labels, symbols pretending to be text, buttons, UI, logo, border or watermark. Pixel-art scene only.

## Book master v03

Input: book-sheet-draft-v02.png, shape/motion reference. Original v01/v02 have unacceptable colored edge artifacts and are not used.
Output master preserved beside this file. The generated eight-frame master is mechanically extracted, registered to the book spine and packed at 96 × 84 logical pixels, displayed at 3×. No code redraws the generated art.

Use case: stylized-concept. Asset type: eight-frame sprite sheet for a pixel book turning one leaf, 1536x1024, 4 columns by 2 rows, exact equal cells, no gutters or borders.
Reference image is a flawed earlier draft; preserve its recognizable cream front pages, dark gray rear layers, pointed center book-spine, but redraw cleaner as deliberate true pixel art. Remove ALL red/yellow/colored halos. Background solid uniform ivory #EEE8D8, NOT transparency. Use only eight neutral cream/mushroom/charcoal shades. No blue or bright colored pixels. No shadows outside silhouette.
Each 384x512 cell contains the same centered fixed-size open book, same center and baseline. Book is 240px wide and 220px tall, aligned identically. First frame fully open at rest. Next frames show ONE thin paper leaf turning from right to left: leaf rising, upright, crossing spine, lowering onto left, then rest in last frame identical to first. Actual crisp low-resolution pixel clusters, 3px staircase edges, limited palette dithering, not smooth render with added grain. No words, no labels, no numbers, no extra objects. Top row frames1-4, bottom row5-8. Sheet must be evenly registered for direct frame extraction.

## Book alpha extraction v04

Input: master-v03, edit target. The transparent version is used on the page. Some soft alpha remains around the silhouette; this is still a sample asset, not a final hand-cleaned pixel master.

Use case: background-extraction. Image 1 is the edit target: eight-frame pixel-book sprite sheet. Change ONLY the uniform ivory background outside the eight silhouettes to genuine transparent alpha. Preserve EXACT image dimensions 1536x1024, frame positions, book colors, pixel edges, page shapes and all eight poses. The dark outlines and ivory inner pages must stay opaque. No redraw, no extra texture, no shadows, no added color, NO RED OR YELLOW EDGE HALOS. Output a truly transparent PNG sprite sheet, not a checkerboard rendering.

Production exports: book-sheet-v04.png, book-rest-v04.png; separate book-turn-v04.gif in docs/visual/ink-pixel-window. Original generated master remains untouched.
