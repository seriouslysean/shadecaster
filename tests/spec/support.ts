// Helpers for the math spec tests (docs/MATH-SPEC.md). They read the generator's real output;
// nothing here re-implements the code under test.
import type { CutoutMask } from '../../src/lib/image-processor';
import type { GeometryParams } from '../../src/lib/stl-generator';

export type Vec = [number, number, number];

export interface Facet {
  normal: Vec;
  vertices: [Vec, Vec, Vec];
}

// The app's own defaults (src/main.ts getGeometryParams fallbacks).
export const DEFAULT_PARAMS: GeometryParams = {
  domeDiameter: 60,
  domeHeight: 20,
  wallThickness: 1.6,
  wallHeight: 25,
  ledMountDiameter: 38,
  ledMountHeight: 16,
  pillarCount: 18,
};

// Radii and heights that generateGeometry derives from DEFAULT_PARAMS
// (src/lib/stl-generator.ts:108-131), worked by hand.
export const DEFAULT_SHAPE = {
  outerRadius: 30,
  innerRadius: 28.4,
  openingRadius: 19.4, // 38 / 2 + max(0.4, 1.6 * 0.25)
  innerHoleRadius: 16.6, // 19 - min(max(2.4, 2), 4.75)
  domeOuterTopRadius: 21, // 19.4 + 1.6
  baseThickness: 1.6,
  wallTop: 26.6,
  domeTop: 46.6,
  pocketBottom: 30.6, // 46.6 - 16
};

export const makeMask = (
  columns: number,
  rows: number,
  cut: (row: number, col: number) => boolean
): CutoutMask => ({
  columns,
  rows,
  data: Array.from({ length: rows }, (_row, row) =>
    Array.from({ length: columns }, (_col, col) => cut(row, col))
  ),
});

export const parseBinaryStl = (buffer: ArrayBuffer): Facet[] => {
  const view = new DataView(buffer);
  const count = view.getUint32(80, true);
  const facets: Facet[] = [];
  let offset = 84;
  const read = (): Vec => {
    const v: Vec = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
    ];
    offset += 12;
    return v;
  };
  for (let i = 0; i < count; i += 1) {
    const normal = read();
    const vertices: [Vec, Vec, Vec] = [read(), read(), read()];
    offset += 2;
    facets.push({ normal, vertices });
  }
  return facets;
};

export const radius = (v: Vec): number => Math.hypot(v[0], v[1]);

export const centroid = (f: Facet): Vec => {
  const [a, b, c] = f.vertices;
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
};

// Component of the facet normal along the outward radial direction at its centroid.
export const radialComponent = (f: Facet): number => {
  const c = centroid(f);
  const r = radius(c);
  return (f.normal[0] * c[0] + f.normal[1] * c[1]) / r;
};

const near = (a: number, b: number, tol = 1e-3): boolean => Math.abs(a - b) < tol;

// Facets on the vertical cylinder of radius r, between z0 and z1.
export const cylinderFacets = (facets: Facet[], r: number, z0: number, z1: number): Facet[] =>
  facets.filter(
    (f) =>
      f.vertices.every((v) => near(radius(v), r) && v[2] > z0 - 1e-3 && v[2] < z1 + 1e-3) &&
      Math.abs(f.normal[2]) < 1e-3
  );

// Facets in the horizontal plane z, with every vertex between radii r0 and r1.
export const planeFacets = (facets: Facet[], z: number, r0: number, r1: number): Facet[] =>
  facets.filter((f) =>
    f.vertices.every((v) => near(v[2], z) && radius(v) > r0 - 1e-3 && radius(v) < r1 + 1e-3)
  );

const vertexKey = (v: Vec): string => v.map((x) => Math.round(x / 1e-4)).join(',');

export interface EdgeReport {
  // undirected edges used by a number of facets other than 2
  nonManifold: number;
  // directed edges used more than once: two neighbours wound the same way
  sameDirection: number;
}

export const edgeReport = (facets: Facet[]): EdgeReport => {
  const undirected = new Map<string, number>();
  const directed = new Map<string, number>();
  for (const f of facets) {
    const keys = f.vertices.map(vertexKey);
    for (let i = 0; i < 3; i += 1) {
      const a = keys[i] ?? '';
      const b = keys[(i + 1) % 3] ?? '';
      const u = a < b ? `${a}|${b}` : `${b}|${a}`;
      undirected.set(u, (undirected.get(u) ?? 0) + 1);
      directed.set(`${a}>${b}`, (directed.get(`${a}>${b}`) ?? 0) + 1);
    }
  }
  let nonManifold = 0;
  for (const n of undirected.values()) if (n !== 2) nonManifold += 1;
  let sameDirection = 0;
  for (const n of directed.values()) if (n > 1) sameDirection += 1;
  return { nonManifold, sameDirection };
};

// Signed volume by the divergence theorem: the sum of signed tetrahedra from the origin.
export const signedVolume = (facets: Facet[]): number =>
  facets.reduce((sum, { vertices: [a, b, c] }) => {
    const det =
      a[0] * (b[1] * c[2] - b[2] * c[1]) -
      a[1] * (b[0] * c[2] - b[2] * c[0]) +
      a[2] * (b[0] * c[1] - b[1] * c[0]);
    return sum + det / 6;
  }, 0);

// Right-hand-rule normal from the vertex order.
export const windingNormal = ({ vertices: [a, b, c] }: Facet): Vec => {
  const u: Vec = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: Vec = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Vec = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const len = Math.hypot(...n);
  return [n[0] / len, n[1] / len, n[2] / len];
};

// processImage draws the upload into a canvas and reads it back with getImageData. This stub
// stands in for that canvas: getImageData returns the given RGBA pixels, so the test controls
// exactly what the sampler sees. The pixel function must cover a size x size image, where size
// is the mask resolution processImage picks (240 for angular resolution 18).
type Rgba = [number, number, number, number];

export const withCanvasPixels = <T>(
  size: number,
  pixel: (x: number, y: number) => Rgba,
  run: () => T
): T => {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      data.set(pixel(x, y), (y * size + x) * 4);
    }
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      drawImage: () => undefined,
      getImageData: (_x: number, _y: number, w: number, h: number) => {
        if (w !== size || h !== size) {
          throw new Error(`stub holds ${size}x${size} pixels, processImage asked for ${w}x${h}`);
        }
        return { width: size, height: size, data };
      },
    }),
  };
  const g = globalThis as { document?: unknown };
  const saved = g.document;
  g.document = { createElement: () => canvas };
  try {
    return run();
  } finally {
    g.document = saved;
  }
};

export const NO_IMAGE = {} as HTMLImageElement;
