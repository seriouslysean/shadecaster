/**
 * Generate STL file for shadow lamp
 */

import type { RadialSample } from './imageProcessor';

export interface GeometryParams {
  domeDiameter: number; // in mm
  domeHeight: number; // in mm
  finThickness: number; // in mm
  baseHeight: number; // in mm
  ledMountDiameter: number; // in mm (standard tea light is 21mm)
  ledMountHeight: number; // in mm (standard tea light is ~15mm)
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
 * Generate dome base with radial fins and top cap (manifold mesh)
 */
function generateGeometry(
  samples: RadialSample[],
  params: GeometryParams
): Triangle[] {
  const triangles: Triangle[] = [];
  const radius = params.domeDiameter / 2;
  const ledMountRadius = params.ledMountDiameter / 2;

  // Generate base (ring to accommodate LED/tea light)
  const baseSegments = samples.length;
  const baseOuterRadius = radius;
  const baseInnerRadius = ledMountRadius;

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
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (!sample) continue;

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
    if (!nextSample) continue;

    const nextAngle = nextSample.angle;
    const nextFinHeight = params.baseHeight + nextSample.distance * params.domeHeight;

    const nextX = Math.cos(nextAngle) * radius;
    const nextY = Math.sin(nextAngle) * radius;
    const nextPerpX = -Math.sin(nextAngle);
    const nextPerpY = Math.cos(nextAngle);

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
  }

  // Generate top dome cap for manifold mesh
  // Calculate center point at the average height of all fins
  const avgHeight =
    params.baseHeight +
    samples.reduce((sum, sample) => sum + sample.distance, 0) / samples.length * params.domeHeight;
  const center: Vector3 = { x: 0, y: 0, z: avgHeight };

  // Create triangular cap by connecting center to each fin top edge
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (!sample) continue;

    const angle = sample.angle;
    const finHeight = params.baseHeight + sample.distance * params.domeHeight;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const halfThickness = params.finThickness / 2;

    const v3 = { x: x + perpX * halfThickness, y: y + perpY * halfThickness, z: finHeight };
    const v4 = { x: x - perpX * halfThickness, y: y - perpY * halfThickness, z: finHeight };

    const nextSample = samples[(i + 1) % samples.length];
    if (!nextSample) continue;

    const nextAngle = nextSample.angle;
    const nextFinHeight = params.baseHeight + nextSample.distance * params.domeHeight;
    const nextX = Math.cos(nextAngle) * radius;
    const nextY = Math.sin(nextAngle) * radius;
    const nextPerpX = -Math.sin(nextAngle);
    const nextPerpY = Math.cos(nextAngle);

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

    // Top cap triangles - connect fin tops to center point
    triangles.push({ vertices: [center, v3, nv3] });
    triangles.push({ vertices: [center, nv4, v4] });
  }

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
 * Generate binary STL file content
 * Binary format: 80-byte header + 4-byte triangle count + (50 bytes per triangle)
 * Each triangle: 12 bytes normal + 36 bytes vertices (3×3 floats) + 2 bytes attribute
 */
function generateSTL(triangles: Triangle[]): ArrayBuffer {
  const triangleCount = triangles.length;
  const headerSize = 80;
  const countSize = 4;
  const triangleSize = 50; // 12 (normal) + 36 (vertices) + 2 (attribute)
  const bufferSize = headerSize + countSize + triangleCount * triangleSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write 80-byte header
  const header = 'Binary STL generated by Shadecaster';
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(header);
  for (let i = 0; i < Math.min(headerBytes.length, 80); i++) {
    view.setUint8(i, headerBytes[i] ?? 0);
  }

  // Write triangle count (4-byte uint32, little-endian)
  view.setUint32(80, triangleCount, true);

  // Write each triangle
  let offset = 84;
  triangles.forEach((triangle) => {
    const [v1, v2, v3] = triangle.vertices;
    const normal = calculateNormal(v1, v2, v3);

    // Normal vector (3 × float32 = 12 bytes)
    view.setFloat32(offset, normal.x, true);
    view.setFloat32(offset + 4, normal.y, true);
    view.setFloat32(offset + 8, normal.z, true);
    offset += 12;

    // Vertex 1 (3 × float32 = 12 bytes)
    view.setFloat32(offset, v1.x, true);
    view.setFloat32(offset + 4, v1.y, true);
    view.setFloat32(offset + 8, v1.z, true);
    offset += 12;

    // Vertex 2 (3 × float32 = 12 bytes)
    view.setFloat32(offset, v2.x, true);
    view.setFloat32(offset + 4, v2.y, true);
    view.setFloat32(offset + 8, v2.z, true);
    offset += 12;

    // Vertex 3 (3 × float32 = 12 bytes)
    view.setFloat32(offset, v3.x, true);
    view.setFloat32(offset + 4, v3.y, true);
    view.setFloat32(offset + 8, v3.z, true);
    offset += 12;

    // Attribute byte count (uint16 = 2 bytes, usually 0)
    view.setUint16(offset, 0, true);
    offset += 2;
  });

  return buffer;
}

/**
 * Export binary STL file
 */
export function exportSTL(samples: RadialSample[], params: GeometryParams): Blob {
  const triangles = generateGeometry(samples, params);
  const stlBuffer = generateSTL(triangles);
  return new Blob([stlBuffer], { type: 'application/sla' });
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
