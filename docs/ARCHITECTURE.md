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
| dist/router.js | Minimal hash router used to switch Consumer/Trainer/Business/Account workspaces |
| dist/workspace-ui.js, dist/workspace-i18n.js, dist/workspace-data.js | Dev preview selector, workspace navigation/pages, and their local demo content (see [Subscription simulation](SUBSCRIPTIONS.md)) |
| dist/subscription.js, dist/test-workspace.js | Plan/capability store and local Trainer/Business test data (unchanged by the workspace refactor) |

## State and lifecycle

app.js persists gym-specific plans and completion in gymflow-v3, with a legacy gymflow-v2 migration. Language and theme use gymflow-language and gymflow-theme. Browser storage is origin-specific; moving to a hosted URL does not transfer local plans. There is no account or server synchronization.

Gym/floor changes rebuild the map. map.js owns rendering resources and event cleanup; app.js guards asynchronous map creation against stale results. Preserve this lifecycle when extending the application.

## Growing the project

The temporary account preview and its Consumer/Trainer/Business workspaces are isolated in `subscription.js`, `router.js`, `workspace-ui.js`, `workspace-i18n.js`, `workspace-data.js`, `test-workspace.js` and `workspace.css`. See [Subscription simulation](SUBSCRIPTIONS.md) for the workspace layout, capabilities and persistence. Navigation between workspaces uses a minimal hash router (`router.js`) rather than server-side routes or history/state beyond `location.hash`; it does not introduce authentication.

Keep dist/ as source until an explicit restructuring is agreed. Extract focused modules incrementally when features justify it, retaining the existing import map and relative asset paths. Add regression coverage around changed behavior. Discuss backend requirements, authentication, storage migration, dependencies and framework changes before introducing them. Do not replace existing geometry as part of structural cleanup.
