// Minimal hash router. No history/state beyond location.hash; keeps the app a static, buildless page.
const listeners = new Set();
function parse() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const segments = raw.split('/').filter(Boolean);
  return Object.freeze({ segments, path: '/' + segments.join('/') });
}
export function getRoute() { return parse(); }
export function navigate(path) {
  const clean = '#/' + String(path).replace(/^#?\/?/, '');
  if (location.hash === clean) emit();
  else location.hash = clean;
}
function emit() { const route = parse(); for (const listener of listeners) listener(route); }
export function onRoute(listener) { listeners.add(listener); return () => listeners.delete(listener); }
window.addEventListener('hashchange', emit);

export const GYM_SEGMENTS = new Set(['', 'workout', 'gyms', 'progress', 'exercises']);
export function requiredCapability(segments) {
  if (segments[0] === 'trainer') return 'clients';
  if (segments[0] === 'business') return 'business';
  return null;
}
export function defaultRouteForPlan(plan) {
  if (plan === 'trainer') return '/trainer';
  if (plan === 'business') return '/business/dashboard';
  return '/workout';
}
