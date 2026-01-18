import { processImage } from './lib/image-processor';
import type { ProcessingParams, CutoutMask } from './lib/image-processor';
import { exportSTL, downloadSTL, type GeometryParams, type StlFormat } from './lib/stl-generator';
import { clamp } from './lib/utils';

const TEA_LIGHT_DIAMETER = 38;
const TEA_LIGHT_HEIGHT = 16;

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
};

const imageUpload = getElement<HTMLInputElement>('image-upload');
const downloadBtn = getElement<HTMLButtonElement>('download-btn');
const infoText = getElement<HTMLParagraphElement>('info-text');

const domeDiameterInput = getElement<HTMLInputElement>('dome-diameter');
const domeHeightInput = getElement<HTMLInputElement>('dome-height');
const teaLightDiameterInput = getElement<HTMLInputElement>('tea-light-diameter');
const teaLightDepthInput = getElement<HTMLInputElement>('tea-light-depth');
const wallThicknessInput = getElement<HTMLInputElement>('wall-thickness');
const wallHeightInput = getElement<HTMLInputElement>('wall-height');
const angularResolutionInput = getElement<HTMLInputElement>('angular-resolution');
const thresholdInput = getElement<HTMLInputElement>('threshold');
const stlFormatInput = getElement<HTMLSelectElement>('stl-format');
const angularValue = getElement<HTMLSpanElement>('angular-value');
const thresholdValue = getElement<HTMLSpanElement>('threshold-value');

const state = {
  image: null as HTMLImageElement | null,
  mask: null as CutoutMask | null,
  cropSize: 0,
  fileName: null as string | null,
};
let processingTimeout: number | null = null;

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

const setDownloadVisible = (visible: boolean): void => {
  downloadBtn.classList.toggle('hidden', !visible);
};

const clampOrFallback = (value: number, min: number, max: number, fallback: number): number =>
  Number.isFinite(value) ? clamp(value, min, max) : fallback;

const readNumberInput = (
  input: HTMLInputElement,
  min: number,
  max: number,
  fallback: number
): number => {
  const value = clampOrFallback(input.valueAsNumber, min, max, fallback);
  input.value = String(value);
  return value;
};

const updateRangeLabels = (): void => {
  angularValue.textContent = `${angularResolutionInput.value} angles`;
  thresholdValue.textContent = thresholdInput.value;
};

const resetImageState = (): void => {
  state.image = null;
  state.mask = null;
  state.cropSize = 0;
  state.fileName = null;
  setDownloadVisible(false);
  if (processingTimeout !== null) {
    window.clearTimeout(processingTimeout);
    processingTimeout = null;
  }
};

const toStlFilename = (filename: string): string => {
  const trimmed = filename.trim();
  if (!trimmed) {
    return 'shadow-lamp.stl';
  }
  const lastDot = trimmed.lastIndexOf('.');
  const baseName = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  if (!baseName) {
    return 'shadow-lamp.stl';
  }
  return `${baseName}.stl`;
};

const getProcessingParams = (): ProcessingParams => {
  const angularResolution = readNumberInput(angularResolutionInput, 12, 180, 18);
  const threshold = readNumberInput(thresholdInput, 0, 255, 128);
  updateRangeLabels();
  return { angularResolution, threshold };
};

const getGeometryParams = (): GeometryParams => ({
  domeDiameter: readNumberInput(domeDiameterInput, 50, 200, 60),
  domeHeight: readNumberInput(domeHeightInput, 20, 150, 20),
  ledMountDiameter: readNumberInput(teaLightDiameterInput, 30, 45, TEA_LIGHT_DIAMETER),
  ledMountHeight: readNumberInput(teaLightDepthInput, 10, 25, TEA_LIGHT_HEIGHT),
  wallThickness: readNumberInput(wallThicknessInput, 0.5, 5, 1.6),
  wallHeight: readNumberInput(wallHeightInput, 10, 120, 25),
  pillarCount: readNumberInput(angularResolutionInput, 12, 180, 18),
});

const getStlFormat = (): StlFormat => (stlFormatInput.value === 'ascii' ? 'ascii' : 'binary');

const runProcessing = (successMessage: string): void => {
  if (!state.image) {
    return;
  }

  try {
    const params = getProcessingParams();
    state.mask = processImage(state.image, params);
    setDownloadVisible(true);
    setInfo(successMessage);
  } catch (error) {
    console.error('Error processing image:', error);
    state.mask = null;
    setDownloadVisible(false);
    const message =
      error instanceof Error ? error.message : 'Error processing image. Please try again.';
    setInfo(message);
  }
};

const processImageImmediately = (startMessage: string, successMessage: string): void => {
  if (!state.image) {
    return;
  }
  setDownloadVisible(false);
  setInfo(startMessage);
  runProcessing(successMessage);
};

const scheduleProcessing = (startMessage: string, successMessage: string): void => {
  if (!state.image) {
    return;
  }
  setDownloadVisible(false);
  setInfo(startMessage);
  if (processingTimeout !== null) {
    window.clearTimeout(processingTimeout);
  }
  processingTimeout = window.setTimeout(() => {
    processingTimeout = null;
    runProcessing(successMessage);
  }, 150);
};

const handleRangeInput = (): void => {
  updateRangeLabels();
  scheduleProcessing('Processing image...', 'Ready to download.');
};

angularResolutionInput.addEventListener('input', handleRangeInput);
thresholdInput.addEventListener('input', handleRangeInput);
updateRangeLabels();

imageUpload.addEventListener('change', async (event) => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (!file) {
    return;
  }

  resetImageState();
  setInfo('Loading image...');
  state.fileName = file.name;

  try {
    const image = await loadImageFromFile(file);
    const squareCanvas = cropImageToSquare(image);
    state.cropSize = squareCanvas.width;
    state.image = await loadImageFromCanvas(squareCanvas);
    processImageImmediately('Processing image...', 'Ready to download.');
  } catch (error) {
    console.error('Error preparing image:', error);
    setInfo('Could not read or crop the image. Please try another file.');
  }
});

downloadBtn.addEventListener('click', () => {
  const params = getGeometryParams();
  if (!state.mask) {
    return;
  }
  const blob = exportSTL(state.mask, params, getStlFormat());
  const stlFilename = state.fileName ? toStlFilename(state.fileName) : 'shadow-lamp.stl';
  downloadSTL(blob, stlFilename);
});
