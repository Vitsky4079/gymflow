# Architecture

GymFlow is a static browser application with ES modules and locally bundled Three.js. There is no bundler, framework, package dependency, backend or build step. The local Node server serves dist/ on loopback; it is a development convenience, not a production service.

## Module responsibilities

| Files | Responsibility |
| --- | --- |
| dist/index.html, dist/style.css | DOM structure, import map, responsive UI and themes |
| dist/app.js | Application state, gym selection, workout flow, persistence and scene lifecycle |
| dist/map.js | Scene, gym interiors, lighting, selection, route display and camera integration |
| dist/equipment-models.js | Detailed procedural equipment geometry |
| dist/camera-navigation.js | Keyboard camera movement and typing-target handling |
| dist/data.js | Equipment instructions and workout presets |
| dist/gyms.js | Gym definitions, placements, floors and workout normalization |
| dist/gym-routing.js | Floor-aware route finding around equipment and obstacles |
| dist/workout-editor.js | Custom workout dialog and editing |
| dist/i18n.js | English/Polish translations and equipment localization |
| dist/vendor/ | Three.js, utilities, controls and third-party license |

## State and lifecycle

app.js persists gym-specific plans and completion in gymflow-v3, with a legacy gymflow-v2 migration. Language and theme use gymflow-language and gymflow-theme. Browser storage is origin-specific; moving to a hosted URL does not transfer local plans. There is no account or server synchronization.

Gym/floor changes rebuild the map. map.js owns rendering resources and event cleanup; app.js guards asynchronous map creation against stale results. Preserve this lifecycle when extending the application.

## Growing the project

Keep dist/ as source until an explicit restructuring is agreed. Extract focused modules incrementally when features justify it, retaining the existing import map and relative asset paths. Add regression coverage around changed behavior. Discuss backend requirements, authentication, storage migration, dependencies and framework changes before introducing them. Do not replace existing geometry as part of structural cleanup.
