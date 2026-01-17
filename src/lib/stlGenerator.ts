import type { RadialSample } from './imageProcessor';

export interface GeometryParams {
  domeDiameter: number;
  domeHeight: number;
  finThickness: number;
  baseHeight: number;
  ledMountDiameter: number;
  ledMountHeight: number;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  vertices: [Vector3, Vector3, Vector3];
}

const addTriangle = (triangles: Triangle[], v1: Vector3, v2: Vector3, v3: Vector3): void => {
  triangles.push({ vertices: [v1, v2, v3] });
};

const validateGeometryParams = (params: GeometryParams): void => {
  const values = Object.values(params);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Geometry parameters must be valid numbers.');
  }
  if (params.domeDiameter <= 0 || params.domeHeight <= 0) {
    throw new Error('Dome dimensions must be positive.');
  }
  if (params.finThickness <= 0) {
    throw new Error('Fin thickness must be greater than 0.');
  }
  if (params.baseHeight < 0) {
    throw new Error('Base height cannot be negative.');
  }
  if (params.ledMountDiameter <= 0 || params.ledMountHeight <= 0) {
    throw new Error('LED mount dimensions must be positive.');
  }
  if (params.ledMountDiameter >= params.domeDiameter) {
    throw new Error('LED mount diameter must be smaller than the dome diameter.');
  }
};

const createFinVertices = (
  angle: number,
  baseHeight: number,
  topHeight: number,
  radius: number,
  finThickness: number
): { baseLeft: Vector3; baseRight: Vector3; topLeft: Vector3; topRight: Vector3 } => {
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);
  const halfThickness = finThickness / 2;

  const baseLeft = { x: x + perpX * halfThickness, y: y + perpY * halfThickness, z: baseHeight };
  const baseRight = { x: x - perpX * halfThickness, y: y - perpY * halfThickness, z: baseHeight };
  const topLeft = { x: x + perpX * halfThickness, y: y + perpY * halfThickness, z: topHeight };
  const topRight = { x: x - perpX * halfThickness, y: y - perpY * halfThickness, z: topHeight };

  return { baseLeft, baseRight, topLeft, topRight };
};

function generateGeometry(
  samples: RadialSample[],
  params: GeometryParams
): Triangle[] {
  if (samples.length < 3) {
    throw new Error('At least 3 samples are required to generate geometry.');
  }

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

    addTriangle(
      triangles,
      { x: x1Outer, y: y1Outer, z: 0 },
      { x: x2Inner, y: y2Inner, z: 0 },
      { x: x1Inner, y: y1Inner, z: 0 }
    );
    addTriangle(
      triangles,
      { x: x1Outer, y: y1Outer, z: 0 },
      { x: x2Outer, y: y2Outer, z: 0 },
      { x: x2Inner, y: y2Inner, z: 0 }
    );

    addTriangle(
      triangles,
      { x: x1Outer, y: y1Outer, z: params.baseHeight },
      { x: x1Inner, y: y1Inner, z: params.baseHeight },
      { x: x2Inner, y: y2Inner, z: params.baseHeight }
    );
    addTriangle(
      triangles,
      { x: x1Outer, y: y1Outer, z: params.baseHeight },
      { x: x2Inner, y: y2Inner, z: params.baseHeight },
      { x: x2Outer, y: y2Outer, z: params.baseHeight }
    );

    addTriangle(
      triangles,
      { x: x1Outer, y: y1Outer, z: 0 },
      { x: x1Outer, y: y1Outer, z: params.baseHeight },
      { x: x2Outer, y: y2Outer, z: params.baseHeight }
    );
    addTriangle(
      triangles,
      { x: x1Outer, y: y1Outer, z: 0 },
      { x: x2Outer, y: y2Outer, z: params.baseHeight },
      { x: x2Outer, y: y2Outer, z: 0 }
    );

    addTriangle(
      triangles,
      { x: x1Inner, y: y1Inner, z: 0 },
      { x: x2Inner, y: y2Inner, z: params.baseHeight },
      { x: x1Inner, y: y1Inner, z: params.baseHeight }
    );
    addTriangle(
      triangles,
      { x: x1Inner, y: y1Inner, z: 0 },
      { x: x2Inner, y: y2Inner, z: 0 },
      { x: x2Inner, y: y2Inner, z: params.baseHeight }
    );
  }

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (!sample) continue;

    const angle = sample.angle;
    const finHeight = params.baseHeight + sample.distance * params.domeHeight;
    const vertices = createFinVertices(
      angle,
      params.baseHeight,
      finHeight,
      radius,
      params.finThickness
    );

    addTriangle(triangles, vertices.baseLeft, vertices.topLeft, vertices.baseRight);
    addTriangle(triangles, vertices.baseRight, vertices.topLeft, vertices.topRight);

    const nextSample = samples[(i + 1) % samples.length];
    if (!nextSample) continue;

    const nextAngle = nextSample.angle;
    const nextFinHeight = params.baseHeight + nextSample.distance * params.domeHeight;
    const nextVertices = createFinVertices(
      nextAngle,
      params.baseHeight,
      nextFinHeight,
      radius,
      params.finThickness
    );

    addTriangle(triangles, vertices.topLeft, nextVertices.topLeft, vertices.topRight);
    addTriangle(triangles, vertices.topRight, nextVertices.topLeft, nextVertices.topRight);
  }

  const avgDistance = samples.reduce((sum, sample) => sum + sample.distance, 0) / samples.length;
  const avgHeight = params.baseHeight + avgDistance * params.domeHeight;
  const center: Vector3 = { x: 0, y: 0, z: avgHeight };

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    if (!sample) continue;

    const angle = sample.angle;
    const finHeight = params.baseHeight + sample.distance * params.domeHeight;
    const vertices = createFinVertices(
      angle,
      params.baseHeight,
      finHeight,
      radius,
      params.finThickness
    );

    const nextSample = samples[(i + 1) % samples.length];
    if (!nextSample) continue;

    const nextAngle = nextSample.angle;
    const nextFinHeight = params.baseHeight + nextSample.distance * params.domeHeight;
    const nextVertices = createFinVertices(
      nextAngle,
      params.baseHeight,
      nextFinHeight,
      radius,
      params.finThickness
    );

    addTriangle(triangles, center, vertices.topLeft, nextVertices.topLeft);
    addTriangle(triangles, center, nextVertices.topRight, vertices.topRight);
  }

  return triangles;
}

function calculateNormal(v1: Vector3, v2: Vector3, v3: Vector3): Vector3 {
  const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };

  const normal = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };

  const length = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
  if (length > 0) {
    normal.x /= length;
    normal.y /= length;
    normal.z /= length;
  }

  return normal;
}

function generateSTL(triangles: Triangle[]): ArrayBuffer {
  const triangleCount = triangles.length;
  const headerSize = 80;
  const countSize = 4;
  const triangleSize = 50; // 12 (normal) + 36 (vertices) + 2 (attribute)
  const bufferSize = headerSize + countSize + triangleCount * triangleSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  const header = 'Binary STL generated by Shadecaster';
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(header);
  for (let i = 0; i < Math.min(headerBytes.length, 80); i++) {
    view.setUint8(i, headerBytes[i] ?? 0);
  }

  view.setUint32(80, triangleCount, true);

  let offset = 84;
  triangles.forEach((triangle) => {
    const [v1, v2, v3] = triangle.vertices;
    const normal = calculateNormal(v1, v2, v3);

    view.setFloat32(offset, normal.x, true);
    view.setFloat32(offset + 4, normal.y, true);
    view.setFloat32(offset + 8, normal.z, true);
    offset += 12;

    view.setFloat32(offset, v1.x, true);
    view.setFloat32(offset + 4, v1.y, true);
    view.setFloat32(offset + 8, v1.z, true);
    offset += 12;

    view.setFloat32(offset, v2.x, true);
    view.setFloat32(offset + 4, v2.y, true);
    view.setFloat32(offset + 8, v2.z, true);
    offset += 12;

    view.setFloat32(offset, v3.x, true);
    view.setFloat32(offset + 4, v3.y, true);
    view.setFloat32(offset + 8, v3.z, true);
    offset += 12;

    view.setUint16(offset, 0, true);
    offset += 2;
  });

  return buffer;
}

export function exportSTL(samples: RadialSample[], params: GeometryParams): Blob {
  validateGeometryParams(params);
  const triangles = generateGeometry(samples, params);
  const stlBuffer = generateSTL(triangles);
  return new Blob([stlBuffer], { type: 'application/sla' });
}

export function downloadSTL(blob: Blob, filename: string = 'shadow-lamp.stl'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
