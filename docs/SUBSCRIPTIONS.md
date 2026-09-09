# Temporary subscription simulation

The **Test subscription** selector changes the local preview instantly. This is not authentication, payment integration, or secure authorization. There is no backend subscription verification and no new account is created.

| Plan | Capabilities |
| --- | --- |
| GymFlow Free | All existing 3D gym, routes, presets, custom workouts and progress tools |
| GymFlow Premium | Free capabilities plus current-session insights and JSON workout download |
| GymFlow Trainer | Premium capabilities plus local client entries, notes and active/paused status |
| GymFlow Business | Existing gym/workout tools plus gym dashboard, inventory analytics, maintenance labels, trainer entries and promotions |

Business is a separate operator role; it does not implicitly include personal Premium or Trainer capabilities. This is a temporary product assumption, configurable in the capability matrix. No existing workout feature has been moved behind a paywall.

## Modules and integration

- `dist/subscription.js`: JSDoc plan union, immutable plan definitions, capability queries, subscriptions, persistence and cross-tab plan synchronization. Add capabilities here rather than comparing plan strings in feature code.
- `dist/subscription-ui.js`: selector, capability-driven in-page navigation, locked state, account cards and working local test panels. Pages and action handlers both consult capabilities. Downgrades remove inaccessible panels immediately. The existing gym remains mounted below the panels.
- `dist/subscription-i18n.js`: English/Polish copy using the existing language preference.
- `dist/test-workspace.js`: isolated local management data. Trainers, promotions and maintenance are scoped to the selected gym; clients belong to the local trainer preview.
- `dist/subscription.css`: scoped components using the original theme tokens and responsive breakpoints.
- `dist/app.js`: mounts the UI and supplies a read-only workout snapshot on renders. The original workout save format, map lifecycle and camera code are unchanged.

Navigation uses local UI state, not URL routes. No router is needed for these temporary panels. Reload returns to the workout with the selected subscription restored.

## Storage

`gymflow-test-subscription-v1` stores the selected plan. Invalid plans default to Free. `gymflow-test-workspace-v1` stores fictional client/trainer/promotion entries and inventory labels. Neither overwrites `gymflow-v3` or its legacy migration. Downgrading retains test entries for later previews. The account area's reset affects only management test data; it does not reset workouts or the selected plan.

Storage failures show a warning while keeping the preview functional for the current session. Plan changes synchronize between tabs; management entries are intended for one editing tab at a time. No data is sent to clients, gym members or external services. Export downloads only the currently selected workout to the user's device.

## Testing and removal

Run `npm test` for capability, persistence, downgrade and isolation coverage, and `npm run check` for syntax validation. CI runs both. Check all four plans in the browser, including downgrading while a restricted panel is open, reload persistence, switching gyms, both languages/themes and mobile widths.

To retire the simulator, remove the UI mount/refresh/import in app.js and the subscription stylesheet link in index.html, then remove the simulator modules/styles. Keep or migrate capability definitions deliberately when introducing real account state. Real authorization must be enforced by a future backend; this selector must never be treated as proof of entitlement.
