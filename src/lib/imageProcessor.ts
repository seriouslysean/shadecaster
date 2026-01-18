export interface FinSegment {
  start: number;
  end: number;
}

export interface RadialSample {
  angle: number;
  segments: FinSegment[];
}

export interface ProcessingParams {
  angularResolution: number;
  threshold: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

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

function radialSample(
  binary: boolean[][],
  angularResolution: number
): RadialSample[] {
  const height = binary.length;
  const width = binary[0]?.length ?? 0;
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const maxRadius = Math.min(centerX, centerY);
  if (maxRadius <= 0) {
    throw new Error('Image is too small to sample.');
  }
  const radialSteps = Math.max(1, Math.floor(maxRadius));

  const samples: RadialSample[] = [];
  const angleStep = (2 * Math.PI) / angularResolution;
  const radiusToHeight = (radius: number): number =>
    clamp(radius / maxRadius, 0, 1);

  for (let i = 0; i < angularResolution; i++) {
    const angle = i * angleStep;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    const segments: FinSegment[] = [];
    let segmentStart: number | null = null;

    const pushSegment = (startRadius: number, endRadius: number): void => {
      const top = radiusToHeight(startRadius);
      const bottom = radiusToHeight(Math.min(endRadius + 1, maxRadius));
      const start = Math.min(bottom, top);
      const end = Math.max(bottom, top);
      if (end > start) {
        segments.push({ start, end });
      }
    };

    for (let r = 0; r < radialSteps; r++) {
      const x = Math.round(centerX + dx * r);
      const y = Math.round(centerY + dy * r);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        const isDark = binary[y]?.[x] ?? false;
        if (isDark) {
          if (segmentStart === null) {
            segmentStart = r;
          }
        } else if (segmentStart !== null) {
          pushSegment(segmentStart, r - 1);
          segmentStart = null;
        }
      }
    }

    if (segmentStart !== null) {
      pushSegment(segmentStart, radialSteps - 1);
    }

    samples.push({
      angle,
      segments,
    });
  }

  return samples;
}

export function processImage(
  image: HTMLImageElement,
  params: ProcessingParams
): RadialSample[] {
  if (!Number.isFinite(params.angularResolution) || !Number.isFinite(params.threshold)) {
    throw new Error('Processing parameters must be valid numbers.');
  }

  const angularResolution = Math.round(params.angularResolution);
  if (angularResolution < 3) {
    throw new Error('Angular resolution must be at least 3.');
  }

  const threshold = clamp(params.threshold, 0, 255);

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context.');
  }

  ctx.drawImage(image, 0, 0);
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

  return radialSample(binary, angularResolution);
}

export function drawPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  samples: RadialSample[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = image.width;
  canvas.height = image.height;

  // Draw original image
  ctx.drawImage(image, 0, 0);

  // Draw radial samples overlay
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  const centerX = (canvas.width - 1) / 2;
  const centerY = (canvas.height - 1) / 2;
  const maxRadius = Math.min(centerX, centerY);

  if (maxRadius <= 0) {
    return;
  }

  const heightToRadius = (height: number): number => (1 - height) * maxRadius;

  samples.forEach((sample) => {
    const dx = Math.cos(sample.angle);
    const dy = Math.sin(sample.angle);

    sample.segments.forEach((segment) => {
      const startRadius = heightToRadius(segment.start);
      const endRadius = heightToRadius(segment.end);
      const startX = centerX + dx * startRadius;
      const startY = centerY + dy * startRadius;
      const endX = centerX + dx * endRadius;
      const endY = centerY + dy * endRadius;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });
  });
}
