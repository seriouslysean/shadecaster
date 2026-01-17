/**
 * Generate STL file for shadow lamp
 */

import type { RadialSample } from './imageProcessor';

export interface GeometryParams {
  domeDiameter: number; // in mm
  domeHeight: number; // in mm
  finThickness: number; // in mm
  baseHeight: number; // in mm
  tealightDiameter: number; // in mm (standard is ~38mm)
  tealightHeight: number; // in mm (standard is ~15mm)
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  vertices: [Vector3, Vector3, Vector3];
}

/**
 * Generate dome base with radial fins
 */
function generateGeometry(
  samples: RadialSample[],
  params: GeometryParams
): Triangle[] {
  const triangles: Triangle[] = [];
  const radius = params.domeDiameter / 2;
  const tealightRadius = params.tealightDiameter / 2;

  // Generate base (ring to accommodate tealight)
  const baseSegments = samples.length;
  const baseOuterRadius = radius;
  const baseInnerRadius = tealightRadius;

  for (let i = 0; i < baseSegments; i++) {
    const angle1 = (i / baseSegments) * 2 * Math.PI;
    const angle2 = ((i + 1) / baseSegments) * 2 * Math.PI;

    const x1Outer = Math.cos(angle1) * baseOuterRadius;
    const y1Outer = Math.sin(angle1) * baseOuterRadius;
    const x2Outer = Math.cos(angle2) * baseOuterRadius;
    const y2Outer = Math.sin(angle2) * baseOuterRadius;

    const x1Inner = Math.cos(angle1) * baseInnerRadius;
    const y1Inner = Math.sin(angle1) * baseInnerRadius;
    const x2Inner = Math.cos(angle2) * baseInnerRadius;
    const y2Inner = Math.sin(angle2) * baseInnerRadius;

    // Bottom of base (ring)
    triangles.push({
      vertices: [
        { x: x1Outer, y: y1Outer, z: 0 },
        { x: x2Inner, y: y2Inner, z: 0 },
        { x: x1Inner, y: y1Inner, z: 0 },
      ],
    });
    triangles.push({
      vertices: [
        { x: x1Outer, y: y1Outer, z: 0 },
        { x: x2Outer, y: y2Outer, z: 0 },
        { x: x2Inner, y: y2Inner, z: 0 },
      ],
    });

    // Top of base (ring)
    triangles.push({
      vertices: [
        { x: x1Outer, y: y1Outer, z: params.baseHeight },
        { x: x1Inner, y: y1Inner, z: params.baseHeight },
        { x: x2Inner, y: y2Inner, z: params.baseHeight },
      ],
    });
    triangles.push({
      vertices: [
        { x: x1Outer, y: y1Outer, z: params.baseHeight },
        { x: x2Inner, y: y2Inner, z: params.baseHeight },
        { x: x2Outer, y: y2Outer, z: params.baseHeight },
      ],
    });

    // Outer wall
    triangles.push({
      vertices: [
        { x: x1Outer, y: y1Outer, z: 0 },
        { x: x1Outer, y: y1Outer, z: params.baseHeight },
        { x: x2Outer, y: y2Outer, z: params.baseHeight },
      ],
    });
    triangles.push({
      vertices: [
        { x: x1Outer, y: y1Outer, z: 0 },
        { x: x2Outer, y: y2Outer, z: params.baseHeight },
        { x: x2Outer, y: y2Outer, z: 0 },
      ],
    });

    // Inner wall
    triangles.push({
      vertices: [
        { x: x1Inner, y: y1Inner, z: 0 },
        { x: x2Inner, y: y2Inner, z: params.baseHeight },
        { x: x1Inner, y: y1Inner, z: params.baseHeight },
      ],
    });
    triangles.push({
      vertices: [
        { x: x1Inner, y: y1Inner, z: 0 },
        { x: x2Inner, y: y2Inner, z: 0 },
        { x: x2Inner, y: y2Inner, z: params.baseHeight },
      ],
    });
  }

  // Generate radial fins
  samples.forEach((sample, i) => {
    const angle = sample.angle;
    const finHeight = params.baseHeight + sample.distance * params.domeHeight;

    // Calculate fin position at radius
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    // Calculate perpendicular direction for fin thickness
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    const halfThickness = params.finThickness / 2;

    // Fin vertices
    const v1 = {
      x: x + perpX * halfThickness,
      y: y + perpY * halfThickness,
      z: params.baseHeight,
    };
    const v2 = {
      x: x - perpX * halfThickness,
      y: y - perpY * halfThickness,
      z: params.baseHeight,
    };
    const v3 = { x: x + perpX * halfThickness, y: y + perpY * halfThickness, z: finHeight };
    const v4 = { x: x - perpX * halfThickness, y: y - perpY * halfThickness, z: finHeight };

    // Fin faces
    triangles.push({ vertices: [v1, v3, v2] });
    triangles.push({ vertices: [v2, v3, v4] });

    // Get next sample for connecting fins
    const nextSample = samples[(i + 1) % samples.length];
    const nextAngle = nextSample.angle;
    const nextFinHeight = params.baseHeight + nextSample.distance * params.domeHeight;

    const nextX = Math.cos(nextAngle) * radius;
    const nextY = Math.sin(nextAngle) * radius;
    const nextPerpX = -Math.sin(nextAngle);
    const nextPerpY = Math.cos(nextAngle);

    const nv1 = {
      x: nextX + nextPerpX * halfThickness,
      y: nextY + nextPerpY * halfThickness,
      z: params.baseHeight,
    };
    const nv2 = {
      x: nextX - nextPerpX * halfThickness,
      y: nextY - nextPerpY * halfThickness,
      z: params.baseHeight,
    };
    const nv3 = {
      x: nextX + nextPerpX * halfThickness,
      y: nextY + nextPerpY * halfThickness,
      z: nextFinHeight,
    };
    const nv4 = {
      x: nextX - nextPerpX * halfThickness,
      y: nextY - nextPerpY * halfThickness,
      z: nextFinHeight,
    };

    // Connect to next fin (dome surface)
    triangles.push({ vertices: [v3, nv3, v4] });
    triangles.push({ vertices: [v4, nv3, nv4] });
  });

  return triangles;
}

/**
 * Calculate normal vector for a triangle
 */
function calculateNormal(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
  const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };

  const normal = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };

  // Normalize
  const length = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
  if (length > 0) {
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
  }

  return normal;
}

/**
 * Generate STL file content
 */
function generateSTL(triangles: Triangle[]): string {
  let stl = 'solid shadecaster\n';

  triangles.forEach((triangle) => {
    const [v1, v2, v3] = triangle.vertices;
    const normal = calculateNormal(v1, v2, v3);

    stl += `  facet normal ${normal.x.toExponential(6)} ${normal.y.toExponential(6)} ${normal.z.toExponential(6)}\n`;
    stl += '    outer loop\n';
    stl += `      vertex ${v1.x.toExponential(6)} ${v1.y.toExponential(6)} ${v1.z.toExponential(6)}\n`;
    stl += `      vertex ${v2.x.toExponential(6)} ${v2.y.toExponential(6)} ${v2.z.toExponential(6)}\n`;
    stl += `      vertex ${v3.x.toExponential(6)} ${v3.y.toExponential(6)} ${v3.z.toExponential(6)}\n`;
    stl += '    endloop\n';
    stl += '  endfacet\n';
  });

  stl += 'endsolid shadecaster\n';

  return stl;
}

/**
 * Export STL file
 */
export function exportSTL(samples: RadialSample[], params: GeometryParams): Blob {
  const triangles = generateGeometry(samples, params);
  const stlContent = generateSTL(triangles);
  return new Blob([stlContent], { type: 'text/plain' });
}

/**
 * Trigger download of STL file
 */
export function downloadSTL(blob: Blob, filename: string = 'shadow-lamp.stl'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
