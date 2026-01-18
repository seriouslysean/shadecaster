# Shadecaster

**Browser-based shadow lamp STL generator**

Transform silhouette images into 3D-printable shadow lamps that cast beautiful shadows when lit by a tealight candle.

## Features

- **Client-side processing** - All image processing happens in your browser, your images never leave your device
- **Simple workflow** - Upload image → Adjust parameters → Download STL → 3D print
- **Customizable** - Control dome size, fin thickness, resolution, and more
- **Standard tea light support** - Designed for standard tea light candles (21mm diameter)

## How It Works

1. **Upload** - Provide a silhouette image (black silhouette on white/transparent background works best)
   - Supported formats: PNG (with transparency support), JPEG, WebP
   - Note: SVG support is not currently implemented
2. **Process** - Image is converted to binary using threshold, then sampled in polar coordinates from the image center so the center becomes the LED position
3. **Generate** - The polar samples fold upward into the lamp: radius from the center maps to fin height, and each dark pixel becomes a fin segment that blocks light
4. **Export** - Download the binary STL file for 3D printing

## Technical Details

- **Stack**: Astro, TypeScript strict mode, ES2023+
- **Principles**: DRY, KISS, SOLID - clean separation of concerns
- **STL Format**: Binary STL (efficient, smaller file size)
- **Deployment**: GitHub Pages via GitHub Actions
- **License**: MIT

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run all CI checks (lint + type-check + build)
npm run ci

# Run linting
npm run lint

# Run TypeScript type checking
npm run type-check

# Run E2E tests
npm test

# Open Cypress interactive mode
npm run test:e2e:open
```

For detailed testing documentation, see [TESTING.md](./TESTING.md).

## Parameters

- **Dome Diameter**: Overall diameter of the lamp (default: 60mm, range: 50-200mm)
- **Dome Height**: Height of the dome structure (default: 40mm, range: 20-150mm)
- **Fin Thickness**: Thickness of each radial fin (default: 1.2mm, range: 0.5-5mm, min 1.2mm recommended for stability)
- **Base Height**: Height of the base ring (default: 8mm, range: 5-30mm)
- **Angular Resolution**: Number of fins/samples (default: 180, range: 24-360, higher = smoother but larger file)
- **Image Threshold**: Grayscale threshold for binary conversion (default: 128, range: 0-255, adjust if image is too bright/dark)
- **LED Mount Diameter**: Center hole for tea light (fixed: 21mm standard tea light)

## 3D Printing Tips

### Print Settings
- **Layer height**: 0.2mm recommended
- **Infill**: 15-20%
- **Wall count**: 3-4 walls minimum (prevents light leakage)
- **Supports**: Not needed
- **Print orientation**: Base down, no supports required

### Filament Selection
- **Material**: PLA works well (easy to print, stable)
- **Color**: **Use dark or opaque filament** to prevent light leakage through walls
  - Black, dark gray, or other opaque colors work best
  - Avoid translucent or light-colored filaments as they let light through the walls
- **Minimum fin thickness**: 1.2mm for print stability

### Tested Slicers
- Bambu Studio
- PrusaSlicer
- Cura (any slicer that supports STL)

## License

MIT License - See LICENSE file for details
