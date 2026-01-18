import type { CutoutMask } from './image-processor';
import { clamp } from './utils';

export interface GeometryParams {
  domeDiameter: number;
  domeHeight: number;
  wallThickness: number;
  wallHeight: number;
  ledMountDiameter: number;
  ledMountHeight: number;
  pillarCount: number;
}

export type StlFormat = 'binary' | 'ascii';

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

const addQuad = (
  triangles: Triangle[],
  v1: Vector3,
  v2: Vector3,
  v3: Vector3,
  v4: Vector3
): void => {
  addTriangle(triangles, v1, v2, v3);
  addTriangle(triangles, v1, v3, v4);
};

const normalizeZero = (value: number): number => {
  if (Object.is(value, -0)) {
    return 0;
  }
  return Math.abs(value) < 1e-10 ? 0 : value;
};

const formatStlNumber = (value: number): string => {
  if (!Number.isFinite(value) || Object.is(value, -0) || Math.abs(value) < 1e-10) {
    return '0';
  }
  return value.toFixed(6).replace(/\.?0+$/, '');
};

const polarToCartesian = (radius: number, angle: number, z: number): Vector3 => ({
  x: normalizeZero(Math.cos(angle) * radius),
  y: normalizeZero(Math.sin(angle) * radius),
  z,
});

const writeVector3 = (view: DataView, offset: number, v: Vector3): number => {
  view.setFloat32(offset, v.x, true);
  view.setFloat32(offset + 4, v.y, true);
  view.setFloat32(offset + 8, v.z, true);
  return offset + 12;
};

const validateGeometryParams = (params: GeometryParams): void => {
  const values = Object.values(params);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Geometry parameters must be valid numbers.');
  }
  if (params.domeDiameter <= 0 || params.domeHeight <= 0) {
    throw new Error('Dome dimensions must be positive.');
  }
  if (params.wallThickness <= 0) {
    throw new Error('Wall thickness must be greater than 0.');
  }
  if (params.wallHeight <= 0) {
    throw new Error('Wall height must be greater than 0.');
  }
  if (params.ledMountDiameter <= 0 || params.ledMountHeight <= 0) {
    throw new Error('Tea light mount dimensions must be positive.');
  }
  if (params.pillarCount < 3) {
    throw new Error('Pillar count must be at least 3.');
  }

  const radius = params.domeDiameter / 2;
  const teaLightRadius = params.ledMountDiameter / 2;
  if (params.wallThickness >= radius) {
    throw new Error('Wall thickness must be smaller than the dome radius.');
  }
  if (teaLightRadius + params.wallThickness >= radius) {
    throw new Error('Tea light hole must be smaller than the dome diameter.');
  }
};

function generateGeometry(cutout: CutoutMask, params: GeometryParams): Triangle[] {
  if (cutout.columns < 3 || cutout.rows < 3) {
    throw new Error('Cutout mask resolution must be at least 3x3.');
  }

  const triangles: Triangle[] = [];
  const outerRadius = params.domeDiameter / 2;
  const wallThickness = params.wallThickness;
  const innerRadius = outerRadius - wallThickness;
  const baseThickness = wallThickness;
  const wallHeight = params.wallHeight;
  const wallTop = baseThickness + wallHeight;
  const domeHeight = params.domeHeight;
  const domeTop = wallTop + domeHeight;
  const teaLightRadius = params.ledMountDiameter / 2;
  const clearance = Math.max(0.4, wallThickness * 0.25);
  const pocketRadius = teaLightRadius + clearance;
  const lipWidth = Math.min(Math.max(wallThickness * 1.5, 2), teaLightRadius * 0.25);
  const innerHoleMax = Math.max(innerRadius - wallThickness, wallThickness);
  const innerHoleRadius = Math.min(
    Math.max(teaLightRadius - lipWidth, wallThickness),
    innerHoleMax
  );
  const pocketDepthMax = Math.max(domeHeight - wallThickness, wallThickness);
  const pocketDepth = clamp(params.ledMountHeight, wallThickness, pocketDepthMax);
  const pocketBottom = domeTop - pocketDepth;
  const innerDomeHeight = Math.max(domeHeight - pocketDepth, 0);
  const openingRadius = pocketRadius;
  const domeShellThickness = wallThickness;
  const domeOuterTopRadius = openingRadius + domeShellThickness;
  const epsilon = 1e-6;

  const columns = cutout.columns;
  const rows = cutout.rows;
  const angleStep = (2 * Math.PI) / columns;
  const pillarCount = Math.max(3, Math.round(params.pillarCount));
  const pillarStep = (2 * Math.PI) / pillarCount;
  const minPillarWidth = wallThickness / Math.max(innerRadius, epsilon);
  const targetPillarWidth = pillarStep * 0.25;
  const pillarWidth = Math.min(pillarStep, Math.max(targetPillarWidth, minPillarWidth));
  const pillarHalf = pillarWidth / 2;

  const pillarColumns = new Array<boolean>(columns).fill(false);
  for (let col = 0; col < columns; col++) {
    const angle = (col + 0.5) * angleStep;
    const normalized = (angle + 2 * Math.PI) % (2 * Math.PI);
    const pillarIndex = Math.round(normalized / pillarStep) % pillarCount;
    const center = pillarIndex * pillarStep;
    const delta = Math.abs(normalized - center);
    const wrapped = Math.min(delta, 2 * Math.PI - delta);
    pillarColumns[col] = wrapped <= pillarHalf + epsilon;
  }

  const isSolid = (row: number, col: number): boolean =>
    row === 0 || row === rows - 1 || pillarColumns[col] || !(cutout.data[row]?.[col] ?? false);

  const addRadialFace = (angle: number, zBottom: number, zTop: number, flip: boolean): void => {
    const outerBottom = polarToCartesian(outerRadius, angle, zBottom);
    const outerTop = polarToCartesian(outerRadius, angle, zTop);
    const innerTop = polarToCartesian(innerRadius, angle, zTop);
    const innerBottom = polarToCartesian(innerRadius, angle, zBottom);
    if (flip) {
      addQuad(triangles, outerBottom, innerBottom, innerTop, outerTop);
    } else {
      addQuad(triangles, outerBottom, outerTop, innerTop, innerBottom);
    }
  };

  const addHorizontalFace = (
    z: number,
    angle1: number,
    angle2: number,
    flip: boolean
  ): void => {
    const outer1 = polarToCartesian(outerRadius, angle1, z);
    const outer2 = polarToCartesian(outerRadius, angle2, z);
    const inner2 = polarToCartesian(innerRadius, angle2, z);
    const inner1 = polarToCartesian(innerRadius, angle1, z);
    if (flip) {
      addQuad(triangles, outer1, inner1, inner2, outer2);
    } else {
      addQuad(triangles, outer1, outer2, inner2, inner1);
    }
  };

  const centerBottom: Vector3 = { x: 0, y: 0, z: 0 };
  const centerTop: Vector3 = { x: 0, y: 0, z: baseThickness };

  for (let col = 0; col < columns; col++) {
    const angle1 = col * angleStep;
    const angle2 = (col + 1) * angleStep;

    const outerBottom1 = polarToCartesian(outerRadius, angle1, 0);
    const outerBottom2 = polarToCartesian(outerRadius, angle2, 0);
    const innerTop1 = polarToCartesian(innerRadius, angle1, baseThickness);
    const innerTop2 = polarToCartesian(innerRadius, angle2, baseThickness);

    // Base bottom: solid disc
    addTriangle(triangles, centerBottom, outerBottom2, outerBottom1);

    // Base top inner: disc from center to innerRadius
    addTriangle(triangles, centerTop, innerTop1, innerTop2);

    // Outer wall from z=0 to z=baseThickness only
    const outerTop1 = polarToCartesian(outerRadius, angle1, baseThickness);
    const outerTop2 = polarToCartesian(outerRadius, angle2, baseThickness);
    addQuad(triangles, outerBottom1, outerBottom2, outerTop2, outerTop1);

    // Inner wall starts at baseThickness; the base is solid below.

    // Horizontal cap at baseThickness for cutout areas at bottom row
    const bottomRow = rows - 1;
    if (!isSolid(bottomRow, col)) {
      addQuad(triangles, outerTop1, outerTop2, innerTop2, innerTop1);
    }
  }

  for (let col = 0; col < columns; col++) {
    const angle1 = col * angleStep;
    const angle2 = (col + 1) * angleStep;
    const prevCol = (col - 1 + columns) % columns;
    const nextCol = (col + 1) % columns;

    for (let row = 0; row < rows; row++) {
      if (!isSolid(row, col)) {
        continue;
      }

      const zTop = wallTop - (row / rows) * wallHeight;
      const zBottom = wallTop - ((row + 1) / rows) * wallHeight;

      const outerBottom1 = polarToCartesian(outerRadius, angle1, zBottom);
      const outerBottom2 = polarToCartesian(outerRadius, angle2, zBottom);
      const outerTop1 = polarToCartesian(outerRadius, angle1, zTop);
      const outerTop2 = polarToCartesian(outerRadius, angle2, zTop);
      addQuad(triangles, outerBottom1, outerBottom2, outerTop2, outerTop1);

      const innerBottom1 = polarToCartesian(innerRadius, angle1, zBottom);
      const innerBottom2 = polarToCartesian(innerRadius, angle2, zBottom);
      const innerTop1 = polarToCartesian(innerRadius, angle1, zTop);
      const innerTop2 = polarToCartesian(innerRadius, angle2, zTop);
      addQuad(triangles, innerBottom1, innerBottom2, innerTop2, innerTop1);

      if (!isSolid(row, prevCol)) {
        addRadialFace(angle1, zBottom, zTop, true);
      }
      if (!isSolid(row, nextCol)) {
        addRadialFace(angle2, zBottom, zTop, false);
      }
      if (row > 0 && !isSolid(row - 1, col)) {
        addHorizontalFace(zTop, angle1, angle2, false);
      }
      if (row < rows - 1 && !isSolid(row + 1, col)) {
        addHorizontalFace(zBottom, angle1, angle2, true);
      }
    }
  }

  const domeSegments = columns;
  const domeAngleStep = angleStep;
  const domeSteps = Math.max(8, Math.round(domeSegments / 6));
  const interpolateRadius = (from: number, to: number, progress: number): number =>
    to + (from - to) * Math.cos(progress * (Math.PI / 2));

  for (let step = 0; step < domeSteps; step++) {
    const t1 = step / domeSteps;
    const t2 = (step + 1) / domeSteps;
    const z1 = wallTop + domeHeight * t1;
    const z2 = wallTop + domeHeight * t2;
    const outerR1 = interpolateRadius(outerRadius, domeOuterTopRadius, t1);
    const outerR2 = interpolateRadius(outerRadius, domeOuterTopRadius, t2);

    for (let i = 0; i < domeSegments; i++) {
      const angle1 = i * domeAngleStep;
      const angle2 = (i + 1) * domeAngleStep;
      const outer1 = polarToCartesian(outerR1, angle1, z1);
      const outer2 = polarToCartesian(outerR1, angle2, z1);
      const outer3 = polarToCartesian(outerR2, angle2, z2);
      const outer4 = polarToCartesian(outerR2, angle1, z2);
      addQuad(triangles, outer1, outer2, outer3, outer4);
    }
  }

  const innerSteps =
    innerDomeHeight > 0 ? Math.max(4, Math.round(domeSteps * (innerDomeHeight / domeHeight))) : 0;
  if (innerSteps > 0) {
    for (let step = 0; step < innerSteps; step++) {
      const t1 = step / innerSteps;
      const t2 = (step + 1) / innerSteps;
      const z1 = wallTop + innerDomeHeight * t1;
      const z2 = wallTop + innerDomeHeight * t2;
      const innerR1 = interpolateRadius(innerRadius, innerHoleRadius, t1);
      const innerR2 = interpolateRadius(innerRadius, innerHoleRadius, t2);

      for (let i = 0; i < domeSegments; i++) {
        const angle1 = i * domeAngleStep;
        const angle2 = (i + 1) * domeAngleStep;
        const inner1 = polarToCartesian(innerR1, angle1, z1);
        const inner2 = polarToCartesian(innerR1, angle2, z1);
        const inner3 = polarToCartesian(innerR2, angle2, z2);
        const inner4 = polarToCartesian(innerR2, angle1, z2);
        addQuad(triangles, inner4, inner3, inner2, inner1);
      }
    }
  }

  for (let i = 0; i < domeSegments; i++) {
    const angle1 = i * domeAngleStep;
    const angle2 = (i + 1) * domeAngleStep;
    const pocketTop1 = polarToCartesian(openingRadius, angle1, domeTop);
    const pocketTop2 = polarToCartesian(openingRadius, angle2, domeTop);
    const pocketBottom1 = polarToCartesian(openingRadius, angle1, pocketBottom);
    const pocketBottom2 = polarToCartesian(openingRadius, angle2, pocketBottom);
    addQuad(triangles, pocketBottom1, pocketBottom2, pocketTop2, pocketTop1);

    const lipOuter1 = polarToCartesian(openingRadius, angle1, pocketBottom);
    const lipOuter2 = polarToCartesian(openingRadius, angle2, pocketBottom);
    const lipInner1 = polarToCartesian(innerHoleRadius, angle1, pocketBottom);
    const lipInner2 = polarToCartesian(innerHoleRadius, angle2, pocketBottom);
    addQuad(triangles, lipOuter1, lipInner1, lipInner2, lipOuter2);
  }

  for (let i = 0; i < domeSegments; i++) {
    const angle1 = i * domeAngleStep;
    const angle2 = (i + 1) * domeAngleStep;
    const outer1 = polarToCartesian(domeOuterTopRadius, angle1, domeTop);
    const outer2 = polarToCartesian(domeOuterTopRadius, angle2, domeTop);
    const inner1 = polarToCartesian(openingRadius, angle1, domeTop);
    const inner2 = polarToCartesian(openingRadius, angle2, domeTop);
    addQuad(triangles, outer1, inner1, inner2, outer2);
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
  for (const { vertices } of triangles) {
    const [v1, v2, v3] = vertices;
    offset = writeVector3(view, offset, calculateNormal(v1, v2, v3));
    offset = writeVector3(view, offset, v1);
    offset = writeVector3(view, offset, v2);
    offset = writeVector3(view, offset, v3);
    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return buffer;
}

function generateAsciiSTL(triangles: Triangle[]): string {
  const lines: string[] = ['solid shadecaster'];

  for (const { vertices } of triangles) {
    const [v1, v2, v3] = vertices;
    const normal = calculateNormal(v1, v2, v3);
    lines.push(
      `  facet normal ${formatStlNumber(normal.x)} ${formatStlNumber(normal.y)} ${formatStlNumber(normal.z)}`
    );
    lines.push('    outer loop');
    lines.push(
      `      vertex ${formatStlNumber(v1.x)} ${formatStlNumber(v1.y)} ${formatStlNumber(v1.z)}`
    );
    lines.push(
      `      vertex ${formatStlNumber(v2.x)} ${formatStlNumber(v2.y)} ${formatStlNumber(v2.z)}`
    );
    lines.push(
      `      vertex ${formatStlNumber(v3.x)} ${formatStlNumber(v3.y)} ${formatStlNumber(v3.z)}`
    );
    lines.push('    endloop');
    lines.push('  endfacet');
  }

  lines.push('endsolid shadecaster');
  return `${lines.join('\n')}\n`;
}

export function exportSTL(
  cutout: CutoutMask,
  params: GeometryParams,
  format: StlFormat = 'binary'
): Blob {
  validateGeometryParams(params);
  const triangles = generateGeometry(cutout, params);
  if (format === 'ascii') {
    const stlText = generateAsciiSTL(triangles);
    return new Blob([stlText], { type: 'application/sla' });
  }
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
