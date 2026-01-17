import { processImage, drawPreview } from './lib/imageProcessor';
import type { ProcessingParams, RadialSample } from './lib/imageProcessor';
import { exportSTL, downloadSTL, type GeometryParams } from './lib/stlGenerator';

const LED_MOUNT_DIAMETER = 21;
const LED_MOUNT_HEIGHT = 15;

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
};

const imageUpload = getElement<HTMLInputElement>('image-upload');
const previewSection = getElement<HTMLDivElement>('preview-section');
const previewCanvas = getElement<HTMLCanvasElement>('preview-canvas');
const processBtn = getElement<HTMLButtonElement>('process-btn');
const downloadBtn = getElement<HTMLButtonElement>('download-btn');
const infoText = getElement<HTMLParagraphElement>('info-text');

const domeDiameterInput = getElement<HTMLInputElement>('dome-diameter');
const domeHeightInput = getElement<HTMLInputElement>('dome-height');
const finThicknessInput = getElement<HTMLInputElement>('fin-thickness');
const baseHeightInput = getElement<HTMLInputElement>('base-height');
const angularResolutionInput = getElement<HTMLInputElement>('angular-resolution');
const thresholdInput = getElement<HTMLInputElement>('threshold');
const angularValue = getElement<HTMLSpanElement>('angular-value');
const thresholdValue = getElement<HTMLSpanElement>('threshold-value');

const state = {
  image: null as HTMLImageElement | null,
  samples: [] as RadialSample[],
  cropSize: 0,
};

const cropImageToSquare = (image: HTMLImageElement): HTMLCanvasElement => {
  const size = Math.min(image.width, image.height);
  const offsetX = (image.width - size) / 2;
  const offsetY = (image.height - size) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create square crop.');
  }
  ctx.drawImage(image, offsetX, offsetY, size, size, 0, 0, size, size);
  return canvas;
};

const loadImageFromSource = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read the image file.'));
    image.src = src;
  });

const loadImageFromFile = async (file: File): Promise<HTMLImageElement> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await loadImageFromSource(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const loadImageFromCanvas = (canvas: HTMLCanvasElement): Promise<HTMLImageElement> =>
  loadImageFromSource(canvas.toDataURL('image/png'));

const setInfo = (message: string): void => {
  infoText.textContent = message;
};

const setPreviewVisible = (visible: boolean): void => {
  previewSection.classList.toggle('hidden', !visible);
};

const setDownloadVisible = (visible: boolean): void => {
  downloadBtn.classList.toggle('hidden', !visible);
};

const setProcessEnabled = (enabled: boolean): void => {
  processBtn.disabled = !enabled;
};

const clampNumber = (value: number, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
};

const readNumberInput = (
  input: HTMLInputElement,
  min: number,
  max: number,
  fallback: number
): number => {
  const value = clampNumber(input.valueAsNumber, min, max, fallback);
  input.value = String(value);
  return value;
};

const updateRangeLabels = (): void => {
  angularValue.textContent = `${angularResolutionInput.value} fins`;
  thresholdValue.textContent = thresholdInput.value;
};

const resetImageState = (): void => {
  state.image = null;
  state.samples = [];
  state.cropSize = 0;
  setPreviewVisible(false);
  setDownloadVisible(false);
  setProcessEnabled(false);
};

const getProcessingParams = (): ProcessingParams => {
  const angularResolution = readNumberInput(angularResolutionInput, 24, 360, 180);
  const threshold = readNumberInput(thresholdInput, 0, 255, 128);
  updateRangeLabels();
  return { angularResolution, threshold };
};

const getGeometryParams = (): GeometryParams => ({
  domeDiameter: readNumberInput(domeDiameterInput, 50, 200, 60),
  domeHeight: readNumberInput(domeHeightInput, 20, 150, 40),
  finThickness: readNumberInput(finThicknessInput, 0.5, 5, 1.2),
  baseHeight: readNumberInput(baseHeightInput, 5, 30, 8),
  ledMountDiameter: LED_MOUNT_DIAMETER,
  ledMountHeight: LED_MOUNT_HEIGHT,
});

angularResolutionInput.addEventListener('input', updateRangeLabels);
thresholdInput.addEventListener('input', updateRangeLabels);
updateRangeLabels();

imageUpload.addEventListener('change', async (event) => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (!file) {
    return;
  }

  resetImageState();
  setInfo('Loading image...');

  try {
    const image = await loadImageFromFile(file);
    const squareCanvas = cropImageToSquare(image);
    state.cropSize = squareCanvas.width;
    state.image = await loadImageFromCanvas(squareCanvas);
    setProcessEnabled(true);
    setDownloadVisible(false);
    setInfo(`Image loaded and cropped to ${state.cropSize}×${state.cropSize}.`);
  } catch (error) {
    console.error('Error preparing image:', error);
    setInfo('Could not read or crop the image. Please try another file.');
  }
});

// Process image
processBtn.addEventListener('click', () => {
  if (!state.image) {
    return;
  }

  setProcessEnabled(false);
  setInfo('Processing image...');

  try {
    const params = getProcessingParams();
    state.samples = processImage(state.image, params);
    drawPreview(previewCanvas, state.image, state.samples);
    setPreviewVisible(true);
    setDownloadVisible(true);
    setInfo('Preview ready. Adjust parameters if needed, then download the STL.');
  } catch (error) {
    console.error('Error processing image:', error);
    const message =
      error instanceof Error ? error.message : 'Error processing image. Please try again.';
    setInfo(message);
  } finally {
    setProcessEnabled(true);
  }
});

// Download STL
downloadBtn.addEventListener('click', () => {
  if (state.samples.length === 0) {
    return;
  }

  const params = getGeometryParams();
  const blob = exportSTL(state.samples, params);
  downloadSTL(blob, 'shadow-lamp.stl');
  setInfo('STL downloaded. Ready to 3D print.');
});

// Allow reprocessing when parameters change
[thresholdInput, angularResolutionInput].forEach((input) => {
  input.addEventListener('change', () => {
    if (state.image) {
      setDownloadVisible(false);
      setInfo('Parameters changed. Click "Process image" to update the preview.');
    }
  });
});
