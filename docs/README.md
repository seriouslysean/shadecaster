# Shadecaster

Browser-based shadow lamp STL generator.

## Use

- Upload a silhouette image (PNG/JPEG/WebP).
- Adjust parameters.
- Download the STL (binary default, ASCII optional).

## Mapping

Image center maps to the base. Image edge maps to the top opening where the light mounts (facing downward).

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
# Run lint + type-check + build
npm run ci

# Or run checks individually
npm run lint
npm run type-check
npm run build
```

### Tools

```bash
# Basic diff
npm run tools:stl-diff -- tmp/file-a.stl tmp/file-b.stl

# Print bad edges and limit output
npm run tools:stl-diff -- tmp/file-a.stl tmp/file-b.stl --list-bad --limit 50
```

For detailed testing documentation, see [TESTING.md](./TESTING.md).

## Parameters

- Dome diameter + height
- Wall thickness + height
- Angles + threshold
- Tea light diameter + depth

## Printing

- 0.4mm nozzle, 0.2mm layer height
- 3-4 walls, 15-20% infill
- Dark, opaque filament
