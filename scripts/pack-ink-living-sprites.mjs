// Mechanical registration, nearest-neighbor packing, and silent GIF export.
// The source artwork comes from imagegen; this script does not redraw the cast.
import sharp from 'sharp';
import { copyFile, mkdir } from 'node:fs/promises';

const source = process.argv[2];
if (!source) throw new Error('Pass the approved v02 three-row sprite master.');
const output = 'public/studies/inktrace/living-archive/review';
const reference = 'app/reference/production/inktrace-living-archive-v01';
await mkdir(output, { recursive: true });
await mkdir(reference, { recursive: true });
await copyFile(source, `${reference}/cast-sprite-master-v02.png`);

const size = await sharp(source).metadata();
if (size.width !== 1672 || size.height !== 941) {
  throw new Error('This registration is calibrated to the inspected 1672 × 941 v02 master.');
}
const sourceBaselines = [297, 598, 902];
const frames = [];
for (let row = 0; row < 3; row++) {
  const rowFrames = [];
  for (let column = 0; column < 8; column++) {
    const frame = await sharp(source)
      .extract({ left: column * 209, top: sourceBaselines[row] - 281, width: 209, height: 313 })
      .resize(30, 46, { kernel: 'nearest' })
      .extend({ left: 1, right: 1, top: 1, bottom: 1, background: '#00000000' })
      .png().toBuffer();
    rowFrames.push(frame);
  }
  frames.push(rowFrames);
}
await sharp({ create: { width: 256, height: 144, channels: 4, background: '#00000000' } })
  .composite(frames.flatMap((row, y) => row.map((input, x) => ({ input, left: x * 32, top: y * 48 }))))
  .png({ palette: true, colours: 24, dither: 0 }).toFile(`${output}/sprite-sheet.png`);

// Three people perform the same registered sequence on independent tracks.
// Both the source gait frame and the actual scene position change while walking.
const sequence = [0, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 0, 5, 5, 6, 7, 7, 0];
const gifFrames = [];
const delay = [];
for (let index = 0; index < sequence.length; index++) {
  const distance = Math.min(index, 12);
  const image = await sharp({ create: { width: 128, height: 56, channels: 4, background: '#00000000' } })
    .composite(frames.map((row, person) => ({ input: row[sequence[index]], left: person * 40 + distance, top: 4 })))
    .png().toBuffer();
  gifFrames.push(await sharp(image).resize(384, 168, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer());
  delay.push(index === 0 || index === 19 ? 1000 : index < 13 ? 150 : 300);
}
await sharp(Buffer.concat(gifFrames), {
  raw: { width: 384, height: 168 * gifFrames.length, channels: 4, pageHeight: 168 },
}).gif({ loop: 0, delay, colours: 24, dither: 0 }).toFile(`${output}/cast-action-proof.gif`);

console.log('Packed 24 separately registered 32×48 poses and a 20-frame silent gait/turn/work GIF.');
