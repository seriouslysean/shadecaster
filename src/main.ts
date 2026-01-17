import { processImage, drawPreview } from './lib/imageProcessor';
import type { RadialSample } from './lib/imageProcessor';
import { exportSTL, downloadSTL, type GeometryParams } from './lib/stlGenerator';

// DOM elements
const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
const previewSection = document.getElementById('preview-section') as HTMLDivElement;
const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
const processBtn = document.getElementById('process-btn') as HTMLButtonElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const infoText = document.getElementById('info-text') as HTMLParagraphElement;

// Control elements
const domeDiameterInput = document.getElementById('dome-diameter') as HTMLInputElement;
const domeHeightInput = document.getElementById('dome-height') as HTMLInputElement;
const finThicknessInput = document.getElementById('fin-thickness') as HTMLInputElement;
const baseHeightInput = document.getElementById('base-height') as HTMLInputElement;
const angularResolutionInput = document.getElementById(
  'angular-resolution'
) as HTMLInputElement;
const thresholdInput = document.getElementById('threshold') as HTMLInputElement;
const angularValue = document.getElementById('angular-value') as HTMLSpanElement;
const thresholdValue = document.getElementById('threshold-value') as HTMLSpanElement;

let currentImage: HTMLImageElement | null = null;
let currentSamples: RadialSample[] = [];
let currentCropSize = 0;

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

// Update range displays
angularResolutionInput.addEventListener('input', () => {
  angularValue.textContent = `${angularResolutionInput.value} fins`;
});

thresholdInput.addEventListener('input', () => {
  thresholdValue.textContent = thresholdInput.value;
});

// Handle image upload
imageUpload.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  currentImage = null;
  currentSamples = [];
  previewSection.classList.add('hidden');
  downloadBtn.classList.add('hidden');
  processBtn.disabled = true;

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    try {
      const squareCanvas = cropImageToSquare(img);
      currentCropSize = squareCanvas.width;
      const squareImage = new Image();
      squareImage.onload = () => {
        currentImage = squareImage;
        processBtn.disabled = false;
        downloadBtn.classList.add('hidden');
        infoText.textContent = `Image loaded and cropped to ${currentCropSize}×${currentCropSize}.`;
      };
      squareImage.src = squareCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error preparing image:', error);
      infoText.textContent = 'Could not crop image. Please try another file.';
    }
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    infoText.textContent = 'Could not read the image file. Please try another file.';
  };

  img.src = objectUrl;
});

// Process image
processBtn.addEventListener('click', async () => {
  if (!currentImage) return;

  processBtn.disabled = true;
  infoText.textContent = 'Processing image...';

  try {
    const params = {
      angularResolution: parseInt(angularResolutionInput.value),
      threshold: parseInt(thresholdInput.value),
    };

    currentSamples = await processImage(currentImage, params);

    drawPreview(previewCanvas, currentImage, currentSamples);
    previewSection.classList.remove('hidden');

    downloadBtn.classList.remove('hidden');
    infoText.textContent =
      'Preview ready. Adjust parameters if needed, then download the STL.';
  } catch (error) {
    console.error('Error processing image:', error);
    infoText.textContent = 'Error processing image. Please try again.';
  } finally {
    processBtn.disabled = false;
  }
});

// Download STL
downloadBtn.addEventListener('click', () => {
  if (currentSamples.length === 0) return;

  const params: GeometryParams = {
    domeDiameter: parseFloat(domeDiameterInput.value),
    domeHeight: parseFloat(domeHeightInput.value),
    finThickness: parseFloat(finThicknessInput.value),
    baseHeight: parseFloat(baseHeightInput.value),
    ledMountDiameter: 21, // Standard tea light diameter
    ledMountHeight: 15, // Standard tea light height
  };

  const blob = exportSTL(currentSamples, params);
  downloadSTL(blob, 'shadow-lamp.stl');

  infoText.textContent = 'STL downloaded. Ready to 3D print.';
});

// Allow reprocessing when parameters change
[thresholdInput, angularResolutionInput].forEach((input) => {
  input.addEventListener('change', () => {
    if (currentImage) {
      downloadBtn.classList.add('hidden');
      infoText.textContent =
        'Parameters changed - click "Process Image" to update preview';
    }
  });
});
