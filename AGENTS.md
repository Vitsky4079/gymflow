# Repository guidance

Work within this project folder. Read README.md and docs/ARCHITECTURE.md before making changes.

## Preserve the existing application

- Continue the plain HTML, CSS, JavaScript and bundled Three.js architecture.
- Preserve detailed procedural equipment, both gym layouts, floors, routes, camera controls and existing workout functionality.
- Do not substitute simplified equipment or migrate frameworks without discussing it with the owner first.
- UI and usability are future priorities; change them only as part of an authorized task.
- dist/ is checked-in, editable source, not disposable build output. Never clean or regenerate it wholesale.
- Preserve local-storage compatibility and English/Polish translations when changing features.
- Keep bundled vendor files and their license intact; review dependency upgrades separately.

## Development and verification

Run npm run check before submitting changes. For browser behavior changes, also follow docs/TESTING.md and report what was actually verified. Prefer focused changes; avoid repository-wide reformatting of compact source files. Keep secrets, archives and local environment files out of Git. Do not publish or push unless requested.
