import { clamp } from './utils';

export interface CutoutMask {
  data: boolean[][];
  columns: number;
  rows: number;
}

export interface ProcessingParams {
  angularResolution: number;
  threshold: number;
}

const toBinary = (imageData: ImageData, threshold: number): boolean[][] => {
  const { width, height, data } = imageData;
  const binary: boolean[][] = Array.from({ length: height }, () => new Array<boolean>(width));

  for (let y = 0; y < height; y++) {
    const row = binary[y];
    if (!row) {
      continue;
    }
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const alpha = data[i + 3] ?? 255;
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      row[x] = alpha >= 128 && gray < threshold;
    }
  }

  return binary;
};

interface Sample {
  gray: number;
  alpha: number;
}

const samplePixel = (
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): Sample => {
  const i = (y * width + x) * 4;
  const r = data[i] ?? 0;
  const g = data[i + 1] ?? 0;
  const b = data[i + 2] ?? 0;
  const alpha = data[i + 3] ?? 255;
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return { gray, alpha };
};

const sampleBilinear = (imageData: ImageData, x: number, y: number): Sample => {
  const { width, height, data } = imageData;
  const clampedX = clamp(x, 0, width - 1);
  const clampedY = clamp(y, 0, height - 1);
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const dx = clampedX - x0;
  const dy = clampedY - y0;

  const p00 = samplePixel(data, width, x0, y0);
  const p10 = samplePixel(data, width, x1, y0);
  const p01 = samplePixel(data, width, x0, y1);
  const p11 = samplePixel(data, width, x1, y1);

  const w00 = (1 - dx) * (1 - dy);
  const w10 = dx * (1 - dy);
  const w01 = (1 - dx) * dy;
  const w11 = dx * dy;

  return {
    gray: p00.gray * w00 + p10.gray * w10 + p01.gray * w01 + p11.gray * w11,
    alpha: p00.alpha * w00 + p10.alpha * w10 + p01.alpha * w01 + p11.alpha * w11,
  };
};

const sampleSupersampled = (imageData: ImageData, x: number, y: number): Sample => {
  const spread = 0.35;
  const samples = [
    sampleBilinear(imageData, x, y),
    sampleBilinear(imageData, x - spread, y - spread),
    sampleBilinear(imageData, x + spread, y - spread),
    sampleBilinear(imageData, x - spread, y + spread),
    sampleBilinear(imageData, x + spread, y + spread),
  ];
  const total = samples.length;
  const sum = samples.reduce(
    (acc, sample) => {
      acc.gray += sample.gray;
      acc.alpha += sample.alpha;
      return acc;
    },
    { gray: 0, alpha: 0 }
  );
  return {
    gray: sum.gray / total,
    alpha: sum.alpha / total,
  };
};

const buildRadialMask = (
  imageData: ImageData,
  threshold: number,
  columns: number,
  rows: number
): boolean[][] => {
  const { width, height } = imageData;
  if (height === 0 || width === 0) {
    throw new Error('Image has no data.');
  }

  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const maxRadius = Math.min(centerX, centerY);
  const angleStep = (2 * Math.PI) / columns;
  const rowDenominator = Math.max(rows - 1, 1);

  const mask: boolean[][] = Array.from({ length: rows }, () => new Array<boolean>(columns));

  for (let row = 0; row < rows; row++) {
    const rowData = mask[row];
    if (!rowData) {
      continue;
    }
    const radius = (maxRadius * (rows - 1 - row)) / rowDenominator;
    for (let col = 0; col < columns; col++) {
      const angle = (col + 0.5) * angleStep;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const sample = sampleSupersampled(imageData, x, y);
      rowData[col] = sample.alpha >= 128 && sample.gray < threshold;
    }
  }

  return mask;
};

const getMaskResolution = (angularResolution: number): number => {
  const base = Math.max(angularResolution * 12, 240);
  return Math.min(720, Math.round(base));
};

export function processImage(image: HTMLImageElement, params: ProcessingParams): CutoutMask {
  if (!Number.isFinite(params.angularResolution) || !Number.isFinite(params.threshold)) {
    throw new Error('Processing parameters must be valid numbers.');
  }

  const angularResolution = Math.round(params.angularResolution);
  if (angularResolution < 3) {
    throw new Error('Angular resolution must be at least 3.');
  }

  const threshold = clamp(params.threshold, 0, 255);

  const maskResolution = getMaskResolution(angularResolution);
  const canvas = document.createElement('canvas');
  canvas.width = maskResolution;
  canvas.height = maskResolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (imageData.width === 0 || imageData.height === 0) {
    throw new Error('Image has no data.');
  }

  const binary = toBinary(imageData, threshold);
  const hasAnyDarkPixels = binary.some((row) => row.some((pixel) => pixel));
  const hasAnyLightPixels = binary.some((row) => row.some((pixel) => !pixel));

  if (!hasAnyDarkPixels) {
    throw new Error(
      'Image is all white/transparent. Please provide an image with dark silhouette content. Try lowering the threshold.'
    );
  }

  if (!hasAnyLightPixels) {
    throw new Error(
      'Image is all black. Please provide an image with a clear silhouette. Try raising the threshold.'
    );
  }

  const columns = maskResolution;
  const rows = maskResolution;
  const data = buildRadialMask(imageData, threshold, columns, rows);

  return {
    data,
    columns,
    rows,
  };
}
