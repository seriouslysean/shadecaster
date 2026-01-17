# Shadecaster

🕯️ **Browser-based shadow lamp STL generator**

Transform silhouette images into 3D-printable shadow lamps that cast beautiful shadows when lit by a tealight candle.

## Features

- **Client-side processing** - All image processing happens in your browser, your images never leave your device
- **Simple workflow** - Upload image → Adjust parameters → Download STL → 3D print
- **Customizable** - Control dome size, fin thickness, resolution, and more
- **Standard tealight support** - Designed for standard tealight candles (38mm diameter)

## How It Works

1. **Upload** - Provide a silhouette or high-contrast image
2. **Process** - Image is converted to binary (threshold), then radially sampled from the center
3. **Generate** - A dome structure with radial fins is created, where fin height corresponds to the sample distance
4. **Export** - Download the STL file for 3D printing

## Technical Details

- **Stack**: Astro, TypeScript, ES2025+
- **Principles**: DRY, KISS, SOLID
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

## Parameters

- **Dome Diameter**: Overall diameter of the lamp (50-200mm)
- **Dome Height**: Height of the dome structure (20-150mm)
- **Fin Thickness**: Thickness of each radial fin (0.5-5mm)
- **Base Height**: Height of the base ring (5-30mm)
- **Angular Resolution**: Number of fins/samples (24-180)
- **Image Threshold**: Grayscale threshold for binary conversion (0-255)

## 3D Printing Tips

- Recommended layer height: 0.2mm
- Infill: 15-20%
- Supports: Usually not needed
- Material: PLA works well, white or light colors recommended for best shadow projection

## License

MIT License - See LICENSE file for details
