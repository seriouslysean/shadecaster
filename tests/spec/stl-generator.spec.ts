// Spec tests for src/lib/stl-generator.ts. Each test asserts the spec in docs/MATH-SPEC.md, not
// today's output. A test marked test.fail() is a confirmed deviation (Dn in the doc): it is
// expected to fail until the math is fixed, and Playwright reports it if it starts passing.
import { expect, test } from '@playwright/test';
import { exportSTL } from '../../src/lib/stl-generator';
import {
  DEFAULT_PARAMS,
  DEFAULT_SHAPE as S,
  centroid,
  cylinderFacets,
  edgeReport,
  makeMask,
  parseBinaryStl,
  planeFacets,
  radialComponent,
  radius,
  signedVolume,
  windingNormal,
  type Facet,
} from './support';

const solidMask = makeMask(12, 12, () => false);

// One hole: column 1 (30-60 degrees), rows 3-5. With 3 pillars at 0, 120 and 240 degrees
// (half-width 15 degrees) columns 0 and 2 stay solid, so the hole has two radial side faces.
const holeParams = { ...DEFAULT_PARAMS, pillarCount: 3 };
const holeMask = makeMask(12, 12, (row, col) => col === 1 && row >= 3 && row <= 5);

const facetsOf = async (mask = solidMask, params = DEFAULT_PARAMS): Promise<Facet[]> =>
  parseBinaryStl(await exportSTL(mask, params).arrayBuffer());

test.describe('STL format (binary)', () => {
  test('layout: 80-byte header, uint32 count, 50 bytes per facet', async () => {
    const buffer = await exportSTL(solidMask, DEFAULT_PARAMS).arrayBuffer();
    const view = new DataView(buffer);
    const count = view.getUint32(80, true);
    expect(count).toBeGreaterThan(0);
    expect(buffer.byteLength).toBe(84 + 50 * count);
    const header = new TextDecoder().decode(new Uint8Array(buffer, 0, 5));
    expect(header).not.toBe('solid');
    for (let i = 0; i < count; i += 1) {
      expect(view.getUint16(84 + 50 * i + 48, true)).toBe(0);
    }
  });

  test('every facet normal is a unit vector that follows the right-hand rule', async () => {
    const facets = await facetsOf(holeMask, holeParams);
    for (const f of facets) {
      expect(Math.hypot(...f.normal)).toBeCloseTo(1, 5);
      const w = windingNormal(f);
      expect(f.normal[0] * w[0] + f.normal[1] * w[1] + f.normal[2] * w[2]).toBeCloseTo(1, 4);
    }
  });

  test('watertight and vertex-to-vertex: every edge is shared by exactly two facets', async () => {
    expect(edgeReport(await facetsOf()).nonManifold).toBe(0);
    expect(edgeReport(await facetsOf(holeMask, holeParams)).nonManifold).toBe(0);
    expect(edgeReport(await facetsOf(makeMask(240, 240, () => false))).nonManifold).toBe(0);
  });

  // Weak alone: today it passes with five surfaces inverted, because the outer shell dominates.
  // With the D1-D5 consistency test passing, a positive volume means every normal points out.
  test('signed volume is positive', async () => {
    expect(signedVolume(await facetsOf())).toBeGreaterThan(0);
  });

  test('D6: all vertices lie in the all-positive octant', async () => {
    test.fail(true, 'D6: the lamp is centred on the origin, so x, y < 0 and the base sits at z = 0');
    const facets = await facetsOf();
    const min = Math.min(...facets.flatMap((f) => f.vertices.flat()));
    expect(min).toBeGreaterThan(0);
  });

  test('D1-D5: neighbouring facets are wound consistently (each edge traversed both ways)', async () => {
    test.fail(true, 'D1-D5: inner wall, hole sides, pocket wall, lip and dome top are inverted');
    expect(edgeReport(await facetsOf(holeMask, holeParams)).sameDirection).toBe(0);
  });
});

test.describe('STL format (ASCII)', () => {
  test('solid / facet normal / outer loop / vertex x3 / endloop / endfacet / endsolid', async () => {
    const text = await exportSTL(solidMask, DEFAULT_PARAMS, 'ascii').text();
    const lines = text.trimEnd().split('\n').map((l) => l.trim());
    expect(lines[0]).toMatch(/^solid\b/);
    expect(lines.at(-1)).toMatch(/^endsolid\b/);
    const body = lines.slice(1, -1);
    expect(body.length % 7).toBe(0);
    for (let i = 0; i < body.length; i += 7) {
      expect(body[i]).toMatch(/^facet normal \S+ \S+ \S+$/);
      expect(body[i + 1]).toBe('outer loop');
      for (let k = 2; k <= 4; k += 1) expect(body[i + k]).toMatch(/^vertex \S+ \S+ \S+$/);
      expect(body[i + 5]).toBe('endloop');
      expect(body[i + 6]).toBe('endfacet');
    }
  });

  test('D7: numbers use sign-mantissa-E-sign-exponent form', async () => {
    test.fail(true, 'D7: formatStlNumber writes fixed-point ("30", "1.6"), not "3.000000E+01"');
    const text = await exportSTL(solidMask, DEFAULT_PARAMS, 'ascii').text();
    const numbers = [...text.matchAll(/^\s*(?:facet normal|vertex) (\S+) (\S+) (\S+)$/gm)].flatMap(
      (m) => m.slice(1)
    );
    expect(numbers.length).toBeGreaterThan(0);
    for (const n of numbers) expect(n).toMatch(/^-?\d\.\d+[eE][-+]\d+$/);
  });
});

// Non-horizontal facets above the wall top: the outer and inner dome surfaces.
const domeBand = (f: Facet): boolean =>
  f.vertices.every((v) => v[2] > S.wallTop - 1e-3) &&
  f.vertices.some((v) => v[2] > S.wallTop + 1e-3) &&
  Math.abs(f.normal[2]) < 0.999;

test.describe('Facet orientation: normals point out of the material', () => {
  test('outer wall points away from the axis', async () => {
    const faces = cylinderFacets(await facetsOf(), S.outerRadius, 0, S.wallTop);
    expect(faces.length).toBeGreaterThan(0);
    for (const f of faces) expect(radialComponent(f)).toBeGreaterThan(0);
  });

  test('base bottom points down, base top (cavity floor) points up', async () => {
    const facets = await facetsOf();
    const bottom = planeFacets(facets, 0, 0, S.outerRadius);
    const top = planeFacets(facets, S.baseThickness, 0, S.innerRadius);
    expect(bottom.length).toBeGreaterThan(0);
    expect(top.length).toBeGreaterThan(0);
    for (const f of bottom) expect(f.normal[2]).toBeLessThan(0);
    for (const f of top) expect(f.normal[2]).toBeGreaterThan(0);
  });

  test('outer dome points away from the axis; inner dome points toward it', async () => {
    const facets = await facetsOf();
    const outer = facets.filter((f) => domeBand(f) && radius(centroid(f)) > S.innerRadius + 0.2);
    const inner = facets.filter(
      (f) =>
        domeBand(f) &&
        f.vertices.every((v) => v[2] < S.pocketBottom + 1e-3) &&
        radius(centroid(f)) < S.innerRadius
    );
    expect(outer.length).toBeGreaterThan(0);
    expect(inner.length).toBeGreaterThan(0);
    for (const f of outer) expect(radialComponent(f)).toBeGreaterThan(0);
    for (const f of inner) expect(radialComponent(f)).toBeLessThan(0);
  });

  test('D1: inner wall points toward the axis (into the cavity)', async () => {
    test.fail(true, 'D1: stl-generator.ts:243 winds the inner wall like the outer wall');
    const faces = cylinderFacets(await facetsOf(), S.innerRadius, S.baseThickness, S.wallTop);
    expect(faces.length).toBeGreaterThan(0);
    for (const f of faces) expect(radialComponent(f)).toBeLessThan(0);
  });

  test('D2: hole side faces point into the hole', async () => {
    test.fail(true, 'D2: stl-generator.ts:163-167 winds radial faces into the material');
    const facets = await facetsOf(holeMask, holeParams);
    const holeAngle = Math.PI / 4; // centre of column 1
    const sides = facets.filter((f) => {
      const rs = f.vertices.map(radius);
      return Math.max(...rs) - Math.min(...rs) > 1 && Math.abs(f.normal[2]) < 1e-3;
    });
    expect(sides.length).toBe(12); // 2 sides x 3 rows x 2 triangles
    for (const f of sides) {
      const c = centroid(f);
      const r = radius(c);
      const toHole = [r * Math.cos(holeAngle) - c[0], r * Math.sin(holeAngle) - c[1]];
      expect(f.normal[0] * (toHole[0] ?? 0) + f.normal[1] * (toHole[1] ?? 0)).toBeGreaterThan(0);
    }
  });

  test('D3: tea light pocket wall points toward the axis (into the pocket)', async () => {
    test.fail(true, 'D3: stl-generator.ts:312 winds the pocket wall outward');
    const faces = cylinderFacets(await facetsOf(), S.openingRadius, S.pocketBottom, S.domeTop);
    expect(faces.length).toBeGreaterThan(0);
    for (const f of faces) expect(radialComponent(f)).toBeLessThan(0);
  });

  test('D4: pocket floor (lip) points up, into the pocket', async () => {
    test.fail(true, 'D4: stl-generator.ts:318 winds the lip downward');
    const faces = planeFacets(await facetsOf(), S.pocketBottom, S.innerHoleRadius, S.openingRadius);
    expect(faces.length).toBeGreaterThan(0);
    for (const f of faces) expect(f.normal[2]).toBeGreaterThan(0);
  });

  test('D5: dome top annulus points up', async () => {
    test.fail(true, 'D5: stl-generator.ts:328 winds the top annulus downward');
    const faces = planeFacets(await facetsOf(), S.domeTop, S.openingRadius, S.domeOuterTopRadius);
    expect(faces.length).toBeGreaterThan(0);
    for (const f of faces) expect(f.normal[2]).toBeGreaterThan(0);
  });
});
