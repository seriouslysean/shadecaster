/**
 * Process an image to extract radial samples for shadow lamp generation
 */

export interface RadialSample {
  angle: number;
  distance: number;
}

export interface ProcessingParams {
  angularResolution: number;
  threshold: number;
}

/**
 * Convert image to binary using threshold
 */
async function imageToBinary(
  imageData: ImageData,
  threshold: number
): Promise<boolean[][]> {
  const { width, height, data } = imageData;
  const binary: boolean[][] = [];

  for (let y = 0; y < height; y++) {
    binary[y] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Convert to grayscale using luminance formula
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      binary[y][x] = gray < threshold;
    }
  }

  return binary;
}

/**
 * Perform radial sampling from center of binary image
 * For each angle, cast a ray and find the outermost dark pixel
 */
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

    // Cast ray from center outward
    for (let r = 0; r < maxRadius; r++) {
      const x = Math.round(centerX + dx * r);
      const y = Math.round(centerY + dy * r);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (binary[y][x]) {
          // Dark pixel found
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

/**
 * Process image and extract radial samples
 */
export async function processImage(
  image: HTMLImageElement,
  params: ProcessingParams
): Promise<RadialSample[]> {
  // Create canvas to extract image data
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Convert to binary
  const binary = await imageToBinary(imageData, params.threshold);

  // Perform radial sampling
  return radialSample(binary, params.angularResolution);
}

/**
 * Draw preview of the processed image
 */
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
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
  ctx.lineWidth = 2;
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
