import { readFileSync } from 'node:fs';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface EdgeEntry {
  count: number;
  a: string;
  b: string;
}

export interface StlStats {
  triangles: number;
  edges: number;
  openEdges: number;
  overEdges: number;
  nonManifoldEdges: number;
  countHistogram: Map<number, number>;
  badEdges: EdgeEntry[];
  vertices: Map<string, Vector3>;
}

export interface ReadOptions {
  collectBad?: boolean;
  epsilon?: number;
}

export const readBinarySTL = (filePath: string, options: ReadOptions = {}): StlStats => {
  const precision = options.epsilon ?? 1e-5;
  if (!Number.isFinite(precision) || precision <= 0) {
    throw new Error('Epsilon must be a positive number.');
  }
  const buffer = readFileSync(filePath);
  if (buffer.byteLength < 84) {
    throw new Error('File too small to be a valid binary STL.');
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;
  if (expectedSize !== buffer.byteLength) {
    throw new Error(
      `Size mismatch for binary STL. Expected ${expectedSize} bytes, got ${buffer.byteLength}.`
    );
  }

  const edges = new Map<string, EdgeEntry>();
  const vertices = new Map<string, Vector3>();

  const quantize = (value: number): number => Math.round(value / precision);
  const vectorKey = (x: number, y: number, z: number): string =>
    `${quantize(x)},${quantize(y)},${quantize(z)}`;
  const edgeKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

  const rememberVertex = (key: string, x: number, y: number, z: number): void => {
    if (!vertices.has(key)) {
      vertices.set(key, { x, y, z });
    }
  };

  const addEdge = (a: string, b: string): void => {
    const key = edgeKey(a, b);
    const entry = edges.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      edges.set(key, { count: 1, a, b });
    }
  };

  let offset = 84;

  for (let i = 0; i < triangleCount; i += 1) {
    offset += 12; // normal
    const v1x = view.getFloat32(offset, true);
    const v1y = view.getFloat32(offset + 4, true);
    const v1z = view.getFloat32(offset + 8, true);
    offset += 12;
    const v2x = view.getFloat32(offset, true);
    const v2y = view.getFloat32(offset + 4, true);
    const v2z = view.getFloat32(offset + 8, true);
    offset += 12;
    const v3x = view.getFloat32(offset, true);
    const v3y = view.getFloat32(offset + 4, true);
    const v3z = view.getFloat32(offset + 8, true);
    offset += 12;
    offset += 2; // attribute

    const k1 = vectorKey(v1x, v1y, v1z);
    const k2 = vectorKey(v2x, v2y, v2z);
    const k3 = vectorKey(v3x, v3y, v3z);

    rememberVertex(k1, v1x, v1y, v1z);
    rememberVertex(k2, v2x, v2y, v2z);
    rememberVertex(k3, v3x, v3y, v3z);

    addEdge(k1, k2);
    addEdge(k2, k3);
    addEdge(k3, k1);
  }

  let openEdges = 0;
  let overEdges = 0;
  const countHistogram = new Map<number, number>();
  const badEdges: EdgeEntry[] = [];

  for (const entry of edges.values()) {
    countHistogram.set(entry.count, (countHistogram.get(entry.count) ?? 0) + 1);
    if (entry.count === 1) {
      openEdges += 1;
    } else if (entry.count > 2) {
      overEdges += 1;
    }
    if (options.collectBad && entry.count !== 2) {
      badEdges.push(entry);
    }
  }

  return {
    triangles: triangleCount,
    edges: edges.size,
    openEdges,
    overEdges,
    nonManifoldEdges: openEdges + overEdges,
    countHistogram,
    badEdges,
    vertices,
  };
};
