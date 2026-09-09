# Verification

## Automated checks

Run `npm run check`. The dependency-free script checks JavaScript syntax throughout the app, bundled vendor files, server and development scripts. This does not execute browser modules or prove rendering correctness.

## Browser regression checklist

For changes affecting the website, run `npm start` and check:

- Studio 01 shows its 30 stations with detailed equipment and the existing interior.
- Atlas Club shows its 24 stations across both selectable floors; stairs/floor switching work.
- Orbit, pan, zoom, WASD, Shift movement, focus, top view, walls and home controls work. Typing in inputs does not move the camera.
- Equipment selection, instructions, catalog search and zone filters work.
- Preset routes and completion tracking work, including floor transitions.
- Custom plans support sets, reps, rest, target weight and notes; edits persist after reload and remain separate for each gym.
- Reset, rest timing, English/Polish, dark/light mode and mobile layouts work.
- Repeated gym/floor changes leave a working scene without duplicate canvases or console errors.

Check browser console and network failures. Compare visual changes against the prior version, especially equipment detail and gym layout. Use a separate browser profile for destructive storage tests; do not clear the owner's saved plans.

## Subscription regression checks

Run `npm test` for the centralized plan store and isolated test workspace. See [Subscription simulation](SUBSCRIPTIONS.md) for the intended capability matrix.

Implementation verification covered Free locking, immediate Premium unlocking, Trainer client creation and retention after downgrades, Business navigation, trainer/promotion entry creation and status changes, per-gym maintenance isolation, plan persistence after reload, English/Polish, dark/light mode, a 390px mobile viewport without horizontal overflow, live workout set counts, the custom editor, Atlas floor switching and 2D/walls controls. No browser errors were observed; bundled Three.js reports its existing PCFSoftShadowMap fallback warning.

The embedded browser did not expose a download event when testing JSON export. Confirm file saving in a normal browser before relying on that convenience feature. Remaining manual checks include full touch gesture coverage, physical WASD/Shift navigation and longer workout sessions.
