export interface RadialSample {
  angle: number;
  distance: number;
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
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(centerX, centerY);

  const samples: RadialSample[] = [];
  const angleStep = (2 * Math.PI) / angularResolution;

  for (let i = 0; i < angularResolution; i++) {
    const angle = i * angleStep;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let maxDistance = 0;

    for (let r = 0; r < maxRadius; r++) {
      const x = Math.round(centerX + dx * r);
      const y = Math.round(centerY + dy * r);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (binary[y]?.[x]) {
          maxDistance = r;
        }
      }
    }

    samples.push({
      angle,
      distance: maxDistance / maxRadius, // Normalize to 0-1
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
  ctx.beginPath();

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const maxRadius = Math.min(centerX, centerY);

  samples.forEach((sample, i) => {
    const x = centerX + Math.cos(sample.angle) * sample.distance * maxRadius;
    const y = centerY + Math.sin(sample.angle) * sample.distance * maxRadius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.closePath();
  ctx.stroke();
}
