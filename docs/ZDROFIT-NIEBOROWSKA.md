# Zdrofit Gdańsk Nieborowska reconstruction

Choose **Zdrofit · Gdańsk Nieborowska** in the existing gym picker. This is a separate third gym, with 43 selectable stations and its own workout storage. Studio 01 and Atlas Club retain their committed definitions and equipment. Their procedural models and interiors have not been replaced.

## Evidence and interpretation

[Official club page](https://zdrofit.pl/kluby-fitness/gdansk-nieborowska/) describes a 1,000 m² club at Nieborowska 10. The seven official gallery images were inspected: reception, cardio, two free-weight views, selectorized machines and two fitness-studio views. They show silver Matrix equipment, dark structural columns, exposed concrete/services, a window-side cardio row, mirrored free-weight walls, grey flooring, a green functional strip and a wood-floor studio with equipment storage.

[Google Maps gallery](https://www.google.com/maps/search/?api=1&query=Zdrofit+Gda%C5%84sk+Nieborowska) provided supplementary panoramas of the training room, studio, reception/access gate, frontage, changing rooms and washrooms. The inspected panoramas credit Adwebmedia and are dated March 2020, with older Total Fitness branding. They inform room relationships, not current signage. Google loads additional images dynamically; the complete user-contributed photo collection has **not** been exhaustively verified. No claim is made that every image or every panorama angle was reviewed.

The newer official photos take precedence for finishes. The 40 × 25 m envelope reproduces the published total area, **not surveyed dimensions**. Wall positions, equipment counts, room proportions, orientation and hidden facilities remain estimates. The layout is a visual reconstruction, not an architectural or evacuation plan. The current functional-zone arrangement needs on-site confirmation.

### Official image references

- [Free weights, mirror wall](https://zdrofit.pl/uploads/media/2024-gallery-800h/08/23098-Strefa%20wolnych%20ci%C4%99%C5%BCar%C3%B3w.webp?v=1-0)
- [Cardio beside glazing](https://zdrofit.pl/uploads/media/2024-gallery-800h/09/23099-Strefa%20cardio.webp?v=1-0)
- [Free weights, reverse view](https://zdrofit.pl/uploads/media/2024-gallery-640h/00/23100-Strefa%20wolnych%20ci%C4%99%C5%BCar%C3%B3w%20%282%29.jpg?v=1-0)
- [Selectorized machines](https://zdrofit.pl/uploads/media/2024-gallery-640h/01/23101-Strefa%20maszyn.jpg?v=1-0)
- [Reception](https://zdrofit.pl/uploads/media/2024-gallery-640h/05/23095-Recepcja.jpg?v=1-0)
- [Fitness studio](https://zdrofit.pl/uploads/media/2024-gallery-640h/07/23097-Sala%20fitness.jpg?v=1-0)
- [Fitness studio storage](https://zdrofit.pl/uploads/media/2024-gallery-640h/06/23096-Sala%20fitness%20%282%29.jpg?v=1-0)

Reference photographs are linked, not included in deployed textures.

## Models

The full source library was inventoried: **215 GLBs** (205 Matrix equipment models, 10 props), about 1.81 GB. Following the owner's clarification, alternative models were treated as source options rather than placing every variant in one room. **38 matching assets** are packaged, about 101 MB total. Repeated machines share loaded geometry and textures within the scene. The heaviest asset is the detailed storage rack, about 24 MB. Initial loading will be slower on mobile connections.

`references/model-inventory.json` records every source filename, original byte count, SHA-256, mesh/material counts and selected aliases. `../dist/zdrofit-assets/manifest.json` maps packaged assets to source files and records bounds and prepared sizes.

Offline preparation preserves mesh detail: deduplication, joining, welding, Meshopt compression/quantization and WebP textures limited to 1024 pixels. No mesh simplification or replacement with primitive equipment was used. Original source GLBs are untouched.

## Missing pieces and generated replacements

These details were absent as matching standalone GLBs and are generated locally in `dist/zdrofit-interior.js`:

| Missing matching piece | Added representation |
| --- | --- |
| Actual room shell and partitions | Separate cutaway shell, studio doorway and changing-room partitions |
| Window facade and mullions | Glazing bays and metal frames |
| Mirror walls and LED edging | Reflective PBR panels with frames and luminous strips |
| Exposed ceiling services | Round/rectangular ducts, duct collars, pipes, suspended lights and AC units; **Ceiling/Sufit** toggle |
| Actual floors | Rubber-tile free-weight bay, wood planks in studio, grey main floor and marked green functional lane |
| Zdrofit reception finishes | Orange/wood counter trim, lettering and blue base strip over the supplied reception model |
| Access railings | Chrome gate/rail structure |
| Fit-bar accessories | Bottles and counter display |
| Changing-room benches | White slatted seats and steel legs |
| Washroom fittings | Counters, basin rims, taps and mirrors; not a complete washroom reconstruction |
| Studio step decks | Black/red stacked steps |
| Body-pump storage | Colored plates and bars |
| Exercise-ball storage | Balls and supporting rails |
| Functional accessories | Sled and curved battle ropes |
| Club signs and safety details | Bilingual zone lettering, column branding and extinguishers |

### Still approximate or missing exact assets

- Exact photographic athlete murals, logo artwork and product labels were not reproduced. Typography stands in for the wall graphics.
- Some older panoramas show Concept2-style white rowers; supplied detailed Matrix rowers are used instead. Exact model-year identity is uncertain for other machines too.
- Reception, lockers and storage racks use the closest supplied detailed models, not exact furniture replicas.
- Mirrors reflect the environment lighting; they are not live planar mirrors.
- Shower cubicles, toilets, back-of-house rooms and inaccessible areas are not fully modeled. Their current plans are unverified.
- Exact dimensions, counts and the latest functional-zone renovation require a measured plan/current walkthrough.

## Implementation and checks

- `zdrofit-layout.js`: isolated gym definition, stations, aisle access points and obstacles.
- `zdrofit-models.js`: per-scene GLB cache, limited concurrent loading and resource disposal.
- `zdrofit-interior.js`: new shell/details, static-geometry batching and localized signs.
- Shared integration adds the third picker option, custom-equipment translations, footprint-aware routes and test-workspace persistence. Existing layouts keep their prior routing defaults and model loaders. Zdrofit uses the verified aisle grid without diagonal smoothing to avoid cutting narrow corners.
- A generation guard prevents a late Zdrofit load from attaching after the user selects another gym.
- `npm test`: subscription checks plus old-gym snapshots, station/model integrity, all-station aisle reachability and per-gym persistence.
- `npm run check`: JavaScript syntax.

Browser checks covered the new 3D overview, ceiling toggle, 2D view, full route, English/Polish and light/dark presentation. Studio 01 and Atlas Club were opened again, including Atlas floor switching, with no browser errors and one active canvas. A viewport override did not change the tested tab width, so mobile responsiveness was not conclusively verified in this run. Hardware-specific touch performance and a full prolonged workout remain manual checks.

## Recreating prepared assets

Normal use needs no installation or build. For offline asset preparation only, from the project root:

```powershell
npm install --prefix .tools --cache .npm --no-audit --no-fund --package-lock=false @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 @gltf-transform/functions@4.5.0 meshoptimizer sharp
node scripts/import-zdrofit-assets.mjs
```

The script reads the two owner-supplied Desktop model folders by default; two positional folder arguments override them. Tooling/cache directories are ignored by Git. This change does not publish or push the site.
