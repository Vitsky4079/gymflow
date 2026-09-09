# Temporary subscription simulation & workspaces

The **Dev preview** selector in the header changes the local test plan instantly. This is not authentication, payment integration, or secure authorization. There is no backend subscription verification and no new account is created.

| Plan | Workspace it opens | Capabilities |
| --- | --- | --- |
| GymFlow Free | Consumer (`/workout`) | `gym` |
| GymFlow Premium | Consumer (`/workout`) | `gym`, `insights`, `export` |
| GymFlow Trainer | Trainer (`/trainer`) | `gym`, `insights`, `export`, `clients` |
| GymFlow Business | Business (`/business/dashboard`) | `gym`, `business`, `analytics`, `equipment`, `trainers`, `promotions` |

Business is a separate operator role; it does not implicitly include personal Premium or Trainer capabilities. This is a temporary product assumption, configurable in the capability matrix. No existing workout feature has been moved behind a paywall — Free keeps the full 3D gym, routes, presets, custom workouts and progress tools; Premium adds session insights and workout export; Trainer adds a client roster, plans and templates; Business adds a gym-management workspace.

## Workspace structure

GymFlow is organized as three workspace contexts, switched via a lightweight hash router (`dist/router.js`), not a page reload:

- **Consumer** (`/workout`, `/gyms`, `/progress`, `/exercises`, `/account*`) — the existing 3D gym and workout planner, used by Free and Premium. `Gyms`/`Progress`/`Exercises` are affordances on the same page (focus the gym picker, open the session-insights dialog, open the equipment catalogue) rather than duplicate pages.
- **Trainer** (`/trainer`, `/trainer/clients`, `/trainer/plans`, `/trainer/templates`, `/trainer/my-workout`, `/trainer/account*`) — a sidebar workspace with a dashboard, client roster, plans and templates. `My Workout` is the only Trainer page that shows the 3D gym (the same consumer experience, full screen, with a "Back to Trainer Overview" pill).
- **Business** (`/business/dashboard`, `/business/profile`, `/business/equipment`, `/business/layout`, `/business/trainers`, `/business/analytics`, `/business/promotions`, `/business/account*`) — a sidebar workspace for gym operators. `Layout` is the only Business page that shows the 3D gym: the existing `<main>` scene is physically re-parented into a bounded card on that page (not cloned or re-rendered) and returned to its normal full-screen slot when leaving.

Visiting a `/trainer/*` or `/business/*` route without the matching capability renders an "access required" message with a link to `/account/subscription` instead of the page content — it never falls through to the 3D gym.

## Modules and integration

- `dist/subscription.js`: JSDoc plan union, immutable plan definitions, capability queries, subscription store, persistence and cross-tab plan synchronization. Add capabilities here rather than comparing plan strings in feature code. Unchanged by the workspace refactor — the plan/capability contract used by `tests/subscription.test.mjs` is stable.
- `dist/router.js`: minimal hash router (`getRoute`, `navigate`, `onRoute`) plus the capability-guard and default-route-per-plan helpers. No history/URL state beyond `location.hash`.
- `dist/workspace-ui.js`: mounts the Dev preview selector, the consumer nav / workspace back-pill above the gym, the session-insights dialog, and the Account / Trainer / Business sidebar pages. Pages and action handlers consult `subscription.can(...)`. Re-parents the existing `<main>` gym between its normal slot and the Business Layout page; never clones it.
- `dist/workspace-i18n.js`: English/Polish copy for the workspace shell, using the existing language preference.
- `dist/workspace-data.js`: local-only Trainer/Business content — plans, templates and the gym profile — plus a small deterministic `demoNumber`/`demoPick` helper used to give list rows (clients, trainers, promotions, equipment usage) consistent-looking demo stats without a real analytics backend.
- `dist/test-workspace.js`: unchanged. Isolated local management data — clients belong to the Trainer preview; trainers, promotions and maintenance are scoped to the selected gym (Business).
- `dist/app.js`: mounts the workspace UI and supplies a read-only workout snapshot on renders. The original workout save format, map lifecycle and camera code are unchanged.

## Storage

`gymflow-test-subscription-v1` stores the selected plan. Invalid plans default to Free. `gymflow-test-workspace-v1` stores fictional client/trainer/promotion entries and inventory labels (unchanged shape). `gymflow-workspace-content-v1` stores Trainer plans/templates and the Business gym profile. `gymflow-notification-prefs-v1` stores the mock notification toggles. None of these overwrite `gymflow-v3` or its legacy migration. Downgrading retains test entries for later previews. The Account > Subscription reset clears both `gymflow-test-workspace-v1` and `gymflow-workspace-content-v1`; it does not reset workouts or the selected plan.

Storage failures show a warning while keeping the preview functional for the current session. Plan changes synchronize between tabs; management entries are intended for one editing tab at a time. No data is sent to clients, gym members or external services. Export downloads only the currently selected workout to the user's device.

## Testing and removal

Run `npm test` for the centralized plan store and isolated test workspace, and `npm run check` for syntax validation. CI runs both. Check all four plans in the browser: Free/Premium land in the consumer workspace with the 3D gym; Trainer lands on the Trainer Overview with no gym underneath, `My Workout` opens the full gym; Business lands on the Business Dashboard with no gym underneath, `Layout` shows the embedded gym and `Analytics`/`Equipment`/`Promotions` show management UI only. Also check reload persistence, switching gyms, both languages/themes, and mobile widths (the Trainer/Business sidebar becomes a `<details>` drawer below 900px).

To retire the simulator, remove the workspace UI mount/refresh/import in `app.js`, the router import, and the `workspace.css` stylesheet link in `index.html`, then remove the workspace modules/styles. Keep or migrate capability definitions deliberately when introducing real account state. Real authorization must be enforced by a future backend; this selector must never be treated as proof of entitlement.
