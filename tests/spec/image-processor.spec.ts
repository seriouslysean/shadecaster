// Spec tests for src/lib/image-processor.ts. See docs/MATH-SPEC.md; test.fail() marks a
// confirmed deviation (Dn) that is expected to fail until the math is fixed.
import { expect, test } from '@playwright/test';
import { processImage } from '../../src/lib/image-processor';
import { NO_IMAGE, withCanvasPixels } from './support';

// Angular resolution 18 gives a 240 x 240 mask (getMaskResolution: max(18 * 12, 240)).
const SIZE = 240;
const CENTER = (SIZE - 1) / 2;
const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const BLACK: [number, number, number, number] = [0, 0, 0, 255];
const CLEAR: [number, number, number, number] = [0, 0, 0, 0];
const GREEN: [number, number, number, number] = [0, 255, 0, 255];

const run = (pixel: (x: number, y: number) => [number, number, number, number], threshold = 128) =>
  withCanvasPixels(SIZE, pixel, () => processImage(NO_IMAGE, { angularResolution: 18, threshold }));

// Column whose sample angle (col + 0.5) * 2pi / columns is nearest the given angle.
const colAt = (angle: number): number => Math.round((angle * SIZE) / (2 * Math.PI) - 0.5);
// Row whose sample radius maxRadius * (rows - 1 - row) / (rows - 1) is nearest r.
const rowAt = (r: number): number => Math.round(SIZE - 1 - (r * (SIZE - 1)) / CENTER);

const dark = (mask: boolean[][]): number => mask.flat().filter(Boolean).length;

// A dark square well inside the left half, so every image below has dark and light content.
const inBlock = (x: number, y: number): boolean => x >= 30 && x < 50 && y >= 110 && y < 130;

test.describe('Polar sampling', () => {
  test('left half of the image maps to the 180-degree columns, right half to 0 degrees', () => {
    const mask = run((x) => (x < SIZE / 2 ? BLACK : WHITE));
    const row = rowAt(CENTER / 2);
    expect(mask.data[row]?.[colAt(Math.PI)]).toBe(true);
    expect(mask.data[row]?.[colAt(0)]).toBe(false);
    expect(mask.columns).toBe(SIZE);
    expect(mask.rows).toBe(SIZE);
  });

  test('pixel is dark when alpha >= 128 and luma < threshold', () => {
    // Left half: black at alpha 127 (transparent enough to read as light). Right: opaque black.
    const mask = run((x) => (x < SIZE / 2 ? [0, 0, 0, 127] : BLACK));
    const row = rowAt(CENTER / 2);
    expect(mask.data[row]?.[colAt(Math.PI)]).toBe(false);
    expect(mask.data[row]?.[colAt(0)]).toBe(true);
  });
});

test.describe('Colour and alpha', () => {
  test('D8: transparent edges do not add dark cells (interpolate premultiplied colour)', () => {
    test.fail(true, 'D8: sampleBilinear (image-processor.ts:57-82) averages straight-alpha grey');
    const threshold = 200;
    const reference = run((x, y) => (inBlock(x, y) ? BLACK : WHITE), threshold);
    // Same picture, but the right half is fully transparent instead of white. Transparent and
    // white are both "not dark", so the mask must not change.
    const withClear = run(
      (x, y) => (inBlock(x, y) ? BLACK : x < SIZE / 2 ? WHITE : CLEAR),
      threshold
    );
    expect(dark(withClear.data)).toBe(dark(reference.data));
  });

  test('D9: luma uses the BT.709 weights of sRGB, so pure green (182.4) is light at 160', () => {
    test.fail(true, 'D9: image-processor.ts:29,53 use BT.601 weights; green reads 149.7');
    const mask = run((x) => (x < SIZE / 2 ? GREEN : BLACK), 160);
    const row = rowAt(CENTER / 2);
    expect(mask.data[row]?.[colAt(Math.PI)]).toBe(false);
    expect(mask.data[row]?.[colAt(0)]).toBe(true);
  });
});

test.describe('Input checks', () => {
  test('all-white image is rejected', () => {
    expect(() => run(() => WHITE)).toThrow(/all white/);
  });

  test('D10: dark content outside the sampled disc counts as no dark content', () => {
    test.fail(true, 'D10: the emptiness check (image-processor.ts:180-194) scans the whole square');
    // A dark 10 x 10 corner sits about 162 px from the centre, outside the 119.5 px disc.
    expect(() => run((x, y) => (x < 10 && y < 10 ? BLACK : WHITE))).toThrow(/all white/);
  });
});
