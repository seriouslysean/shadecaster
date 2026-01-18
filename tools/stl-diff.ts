#!/usr/bin/env node

import { basename } from 'node:path';
import { readBinarySTL, type EdgeEntry, type StlStats, type Vector3 } from './stl-utils';

const writeOut = (text: string): void => {
  process.stdout.write(text);
};

const writeErr = (text: string): void => {
  process.stderr.write(text);
};

const writeLine = (text: string): void => {
  writeOut(`${text}\n`);
};

const printUsage = (): void => {
  writeLine('Usage: tsx tools/stl-diff.ts <file-a.stl> <file-b.stl> [options]');
  writeLine('');
  writeLine('Options:');
  writeLine('  --eps <value>         Quantization epsilon (default: 1e-5).');
  writeLine('  --list-bad            Print edges with count != 2.');
  writeLine('  --limit <value>       Limit listed bad edges (0 = no limit). Default: 200.');
  writeLine('  --help, -h            Show this help.');
};

const args = process.argv.slice(2);
let epsilon = 1e-5;
let listBad = false;
let listLimit = 200;
const files: string[] = [];

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--eps' || arg === '--epsilon') {
    const value = args[i + 1];
    if (!value) {
      writeErr('Missing value after --eps.\n');
      printUsage();
      process.exit(1);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      writeErr('Epsilon must be a positive number.\n');
      printUsage();
      process.exit(1);
    }
    epsilon = parsed;
    i += 1;
    continue;
  }
  if (arg === '--list-bad') {
    listBad = true;
    continue;
  }
  if (arg === '--limit') {
    const value = args[i + 1];
    if (value === undefined) {
      writeErr('Missing value after --limit.\n');
      printUsage();
      process.exit(1);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      writeErr('Limit must be a non-negative number.\n');
      printUsage();
      process.exit(1);
    }
    listLimit = parsed;
    i += 1;
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(0);
  }
  files.push(arg);
}

if (files.length !== 2) {
  writeErr('Expected exactly 2 STL files.\n');
  printUsage();
  process.exit(1);
}

const formatHistogram = (histogram: Map<number, number>): string =>
  Array.from(histogram.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([count, total]) => `${count}:${total}`)
    .join(' ');

const report = (label: string, stats: StlStats): void => {
  writeLine(`\n${label}`);
  writeLine(`Triangles: ${stats.triangles}`);
  writeLine(`Edges: ${stats.edges}`);
  writeLine(`Edge counts: ${formatHistogram(stats.countHistogram) || 'none'}`);
  writeLine(`Open edges: ${stats.openEdges}`);
  writeLine(`Overused edges: ${stats.overEdges}`);
  writeLine(`Non-manifold edges: ${stats.nonManifoldEdges}`);
};

const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(5).replace(/\.?0+$/, '') : 'NaN';

const normalizeAngle = (degrees: number): number => {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const formatEdgeLine = (edge: EdgeEntry, vertices: Map<string, Vector3>): string => {
  const v1 = vertices.get(edge.a);
  const v2 = vertices.get(edge.b);
  if (!v1 || !v2) {
    return `count=${edge.count} v1=${edge.a} v2=${edge.b}`;
  }
  const mid = {
    x: (v1.x + v2.x) / 2,
    y: (v1.y + v2.y) / 2,
    z: (v1.z + v2.z) / 2,
  };
  const r1 = Math.hypot(v1.x, v1.y);
  const r2 = Math.hypot(v2.x, v2.y);
  const rMid = Math.hypot(mid.x, mid.y);
  const a1 = normalizeAngle((Math.atan2(v1.y, v1.x) * 180) / Math.PI);
  const a2 = normalizeAngle((Math.atan2(v2.y, v2.x) * 180) / Math.PI);
  const aMid = normalizeAngle((Math.atan2(mid.y, mid.x) * 180) / Math.PI);
  const zMin = Math.min(v1.z, v2.z);
  const zMax = Math.max(v1.z, v2.z);
  return [
    `count=${edge.count}`,
    `z=[${formatNumber(zMin)},${formatNumber(zMax)}]`,
    `r=[${formatNumber(r1)},${formatNumber(r2)}]`,
    `mid(z=${formatNumber(mid.z)} r=${formatNumber(rMid)} a=${formatNumber(aMid)})`,
    `a=[${formatNumber(a1)},${formatNumber(a2)}]`,
    `v1=(${formatNumber(v1.x)},${formatNumber(v1.y)},${formatNumber(v1.z)})`,
    `v2=(${formatNumber(v2.x)},${formatNumber(v2.y)},${formatNumber(v2.z)})`,
  ].join(' ');
};

const formatDelta = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

try {
  const fileA = files[0];
  const fileB = files[1];
  if (!fileA || !fileB) {
    writeErr('Expected exactly 2 STL files.\n');
    printUsage();
    process.exit(1);
  }
  const statsA = readBinarySTL(fileA, { collectBad: listBad, epsilon });
  const statsB = readBinarySTL(fileB, { collectBad: listBad, epsilon });

  report(`File A (${basename(fileA)})`, statsA);
  report(`File B (${basename(fileB)})`, statsB);

  writeLine('\nDelta (B - A)');
  writeLine(`Triangles: ${formatDelta(statsB.triangles - statsA.triangles)}`);
  writeLine(`Edges: ${formatDelta(statsB.edges - statsA.edges)}`);
  writeLine(`Open edges: ${formatDelta(statsB.openEdges - statsA.openEdges)}`);
  writeLine(`Overused edges: ${formatDelta(statsB.overEdges - statsA.overEdges)}`);
  writeLine(`Non-manifold edges: ${formatDelta(statsB.nonManifoldEdges - statsA.nonManifoldEdges)}`);

  if (listBad) {
    const printBadEdges = (label: string, stats: StlStats): void => {
      const total = stats.badEdges.length;
      const limit = listLimit === 0 ? total : Math.min(listLimit, total);
      writeLine(`\n${label} bad edges (count != 2): showing ${limit} of ${total}`);
      for (let i = 0; i < limit; i += 1) {
        const edge = stats.badEdges[i];
        if (!edge) {
          continue;
        }
        writeLine(`${String(i + 1).padStart(4, ' ')} ${formatEdgeLine(edge, stats.vertices)}`);
      }
    };
    printBadEdges(`File A (${basename(fileA)})`, statsA);
    printBadEdges(`File B (${basename(fileB)})`, statsB);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeErr(`Error: ${message}\n`);
  process.exit(1);
}
