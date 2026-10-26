# Math spec

The correct behavior of each math routine in `src/lib/`, the sources it comes from, and where
the code deviates. Audited at commit `a322d8a`. No math was changed: the deviations are recorded
here and pinned by tests, and the fixes come later (`cairn:pp61`).

Tests: `tests/spec/`. A test marked `test.fail()` asserts the spec for a confirmed deviation
(`Dn` below). It fails today, and Playwright reports it if it starts to pass, so a fix must also
drop the marker. Every other spec test passes and guards behavior that is already right.

## Sources

| Ref | Source |
| --- | --- |
| STL | 3D Systems, *StereoLithography Interface Specification*, October 1989; as reprinted in M. Burns, *Automated Fabrication* (Prentice Hall, 1993), §6.5, <https://www.fabbers.com/tech/STL_Format> |
| LoC | Library of Congress, *STL (STereoLithography) File Format, Binary*, fdd000505, <https://www.loc.gov/preservation/digital/formats/fdd/fdd000505.shtml> |
| 601 | ITU-R BT.601-7 (2011), luma: Y' = 0.299 R' + 0.587 G' + 0.114 B' |
| 709 | ITU-R BT.709-6 (2015), derivation of the luminance signal: Y' = 0.2126 R' + 0.7152 G' + 0.0722 B' |
| sRGB | IEC 61966-2-1:1999: sRGB uses the BT.709 primaries and D65 white |
| FE | W3C, *Filter Effects Module Level 1*, §13.1.1 `grayscale`: weights 0.2126, 0.7152, 0.0722 |
| PD | T. Porter, T. Duff, "Compositing Digital Images", SIGGRAPH 1984 |
| CC4 | W3C, *CSS Color Module Level 4*, §13.4 "Interpolating with Alpha": premultiply, interpolate, divide by the interpolated alpha |
| HTML | WHATWG HTML Standard, canvas section "Premultiplied alpha and the 2D rendering context"; `getImageData` returns non-premultiplied RGBA |
| NR | W. Press et al., *Numerical Recipes*, 3rd ed. (2007), §3.6, bilinear interpolation (eq. 3.6.5) |
| PMP | M. Botsch et al., *Polygon Mesh Processing* (2010), mesh topology: a closed oriented 2-manifold uses each edge in two faces, in opposite directions (section number not checked) |
| DT | Divergence theorem: the volume of a closed, outward-oriented triangle mesh is the sum of signed tetrahedra (a, b, c, origin), det[a b c] / 6 |

## Spec by routine

### `src/lib/image-processor.ts`

| Routine | Spec | Code |
| --- | --- | --- |
| `toBinary`, `samplePixel` (29, 53) | Luma of sRGB pixels uses the BT.709 weights [709, sRGB, FE]. A pixel is dark when alpha >= 128 and luma < threshold (app rule). | BT.601 weights: **D9** |
| `sampleBilinear` (57-82) | Bilinear weights (1-dx)(1-dy), dx(1-dy), (1-dx)dy, dx dy [NR]. With alpha, interpolate premultiplied color, then divide by the interpolated alpha [CC4, PD]; canvas data is non-premultiplied [HTML]. | Weights match [NR]. Gray is interpolated straight: **D8** |
| `sampleSupersampled` (84-106) | Mean of the five taps (app rule). Same alpha rule as above. | Mean matches; inherits **D8** |
| `buildRadialMask` (108-143) | Cell (row, col) samples angle (col + 0.5) * 2π / columns and radius maxRadius * (rows - 1 - row) / (rows - 1), around the image center ((w - 1) / 2, (h - 1) / 2). | Matches. See O1, O2, O5 |
| `processImage` checks (180-194) | "No dark content" and "all dark" are judged on the pixels the mask samples: the inscribed disc. | Whole square: **D10** |
| `getMaskResolution` (145-148) | clamp(round(12 * angularResolution), 240, 720) (app rule). | Matches. See O4 |

### `src/lib/stl-generator.ts`

| Routine | Spec | Code |
| --- | --- | --- |
| `generateSTL` (354-385) | 80-byte header, uint32 LE facet count, then per facet: normal, three vertices (12 float32 LE), uint16 attribute = 0 [LoC, STL]. File size 84 + 50n. | Matches |
| `calculateNormal` (334-352) | Unit normal by the right-hand rule from the vertex order [STL]. | Matches |
| `generateGeometry` facet orientation | Each normal points out of the material, and the vertices run counterclockwise seen from outside [STL]. Equivalently, every edge is used by its two facets in opposite directions [PMP] and the signed volume is positive [DT]. | Outer wall, base, outer dome, inner dome and hole top/bottom faces match. Inverted: **D1-D5** |
| `generateGeometry` topology | Each triangle shares two vertices with each neighbor (vertex-to-vertex rule) [STL]; so every edge is used by exactly two facets. | Matches (also for a 240 x 240 mask) |
| `polarToCartesian` placement | All vertex coordinates positive and nonzero (all-positive octant) [STL]. | Centered on the origin: **D6** |
| `formatStlNumber`, `generateAsciiSTL` (48-53, 387-412) | `solid` ... `facet normal` / `outer loop` / 3 x `vertex` / `endloop` / `endfacet` ... `endsolid` [STL]. Numbers in E form, for example `1.23456E+789` [STL]. | Structure matches. Fixed-point numbers: **D7** |
| `interpolateRadius` (99-100) | No source defines the dome profile. | See O3 |

## Deviations

Each was confirmed by running the input shown; the test named runs the same input. Basis: **source** (a cited rule), **1989** (the letter of the 1989 STL spec, which most current readers relax), **derived** (follows from the sources but no source mandates it for this use), **app** (the code's own contract).

| Id | Basis | Where | Spec says | Code does | Input that shows it | Test |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | source | `stl-generator.ts:243` | Inner wall normal points toward the axis, into the cavity [STL] | Wound like the outer wall: normal points away from the axis | Default params (`src/main.ts` fallbacks), 12 x 12 mask with no cutouts: every inner-wall facet (r = 28.4) has radial normal component +0.996 | `tests/spec/stl-generator.spec.ts` D1 |
| D2 | source | `stl-generator.ts:163-167` | A hole's side faces point into the hole [STL] | Both side faces point into the solid neighbor | Default params with `pillarCount: 3`, 12 x 12 mask, hole at column 1, rows 3-5: all 12 side facets point away from the hole | D2 |
| D3 | source | `stl-generator.ts:312` | Tea light pocket wall points toward the axis, into the pocket [STL] | Points away from the axis | Default params: pocket facets (r = 19.4) have radial component +0.996 | D3 |
| D4 | source | `stl-generator.ts:318` | Pocket floor (the lip, z = 30.6, r 16.6-19.4) points up [STL] | Normal (0, 0, -1) | Default params | D4 |
| D5 | source | `stl-generator.ts:328` | Dome top annulus (z = 46.6, r 19.4-21) points up [STL] | Normal (0, 0, -1) | Default params | D5 |
| D1-D5 | source | as above | Every edge used in opposite directions by its two facets [PMP] | 60 edges are used twice in the same direction | The D2 input | `D1-D5` test |
| D6 | 1989 | `stl-generator.ts:55-59`, `187` | All coordinates positive and nonzero [STL] | Centered on the origin; the base sits at z = 0 | Default params: minimum coordinate -30 | D6 |
| D7 | 1989 | `stl-generator.ts:48-53` | ASCII numbers in E form, `1.23456E+789` [STL] | Fixed-point with trailing zeros cut: `0`, `30`, `1.6`; `toFixed(6)` also limits ASCII to 1e-6, coarser than float32 for small values | Default params, `format: 'ascii'` | D7 |
| D8 | source | `image-processor.ts:78-81` | Interpolate premultiplied color, divide by the interpolated alpha [CC4, PD, HTML] | Interpolates straight gray, so transparent black (0, 0, 0, 0) pulls the edge of a white area dark | 240 x 240, threshold 200, black 20 x 20 block, left half white: right half transparent gives 702 dark cells, right half white gives 410. Spec: equal, since both are "not dark". One tap at dx = 0.3 between white and transparent: code gray 178.5, alpha 178.5 (dark); spec gray 255 (light) | `tests/spec/image-processor.spec.ts` D8 |
| D9 | derived | `image-processor.ts:29`, `53` | sRGB luma uses BT.709 weights [709, sRGB, FE] | BT.601 weights (0.299, 0.587, 0.114) | Pure green (0, 255, 0): code 149.7, spec 182.4. At threshold 160 with a left-green, right-black image, the code reads green as dark and throws "Image is all black"; spec reads it as light | D9 |
| D10 | app | `image-processor.ts:180-194` | The dark/light checks cover the sampled disc, so an image with nothing dark inside it is rejected | Checks the whole square, so dark corners pass and the mask has no cutouts | 240 x 240 white, black 10 x 10 at (0, 0), about 162 px from center (disc radius 119.5): no error, 0 dark cells | D10 |

Severity: D1-D5 are a mis-oriented mesh. Many slicers recompute normals, but tools that trust
them (volume, inside/outside tests, some repair passes) misread the inner surfaces. D8-D10
change the cut pattern. D6 and D7 break the letter of the 1989 spec that most current readers
relax; whether to follow it is the owner's call at fix time. D9 rests on the image being sRGB,
whose primaries are BT.709's; BT.601 weights are also common (JPEG/JFIF), so it is the owner's
call too. D10 holds the code to its own error message, not to an outside source.

## Open decisions (not deviations)

No primary source fixes these; they need the owner's intent before a spec can be written.

| Id | Topic | Today | Question |
| --- | --- | --- | --- |
| O1 | Image radius to wall height | Linear: image center at the wall bottom, image edge at the wall top (`docs/README.md` "Mapping") | Should the projected image be undistorted on a target plane? For a point light at height h on the axis, a hole at (R, z) lands on the plane z = 0 at radius R h / (h - z) (similar triangles), which is not linear in z. |
| O2 | Mirroring | Image y points down; mesh angles run counterclockwise seen from +z, so the image's clockwise is the mesh's counterclockwise | Which way is the lamp used (light above, image on the table; or flipped, image on the ceiling)? That decides whether the projection reads mirrored. |
| O3 | Dome profile and shell | Outer and inner domes are quarter-cosine blends (`interpolateRadius`), not offset curves; `domeShellThickness` holds only at the top. Default params: at z = 30.6 the solid ring runs from the pocket (19.4) to the outer dome (29.6), about 10 mm. | Is the solid collar around the tea light intended, or should the dome be a shell of `wallThickness`? |
| O4 | Parameter wiring | `pillarCount` reads the angular-resolution slider (`src/main.ts:142`); slider values 12-20 all give a 240 mask | Should pillars have their own input? |
| O5 | Row sample position | Rows sample at radius maxRadius (rows - 1 - row) / (rows - 1); the wall cell for that row spans [row, row + 1] / rows of the height. Columns sample cell centers. Offset at most 0.25 px. Rows 0 and rows - 1 are always solid (`isSolid`), so the image's outer ring and center never cut, and the bottom-row cap at `stl-generator.ts:213-216` never runs. | The offset is below the sampler's resolution. Should the edge rows be able to cut? |
| O6 | Sampling footprint | Taps spread ±0.35 px; at the rim, 240 columns sit about 3.1 px apart, so features thinner than the gap between taps can vanish | Should each cell average over its own footprint? |
| O7 | Validation | `validateGeometryParams` checks tea light radius + wall < dome radius, without the clearance, so the pocket can be wider than the inner wall (dome 60, wall 1.6, tea light 56.6: pocket 28.7 > inner 28.4) | Should validation use the pocket radius? |
