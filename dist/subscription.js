/** @typedef {'free'|'premium'|'trainer'|'business'} SubscriptionPlan */
export const STORAGE_KEY = 'gymflow-test-subscription-v1';
export const PLANS = Object.freeze({
  free: Object.freeze({ name: 'GymFlow Free', capabilities: Object.freeze(['gym']) }),
  premium: Object.freeze({ name: 'GymFlow Premium', capabilities: Object.freeze(['gym', 'insights', 'export']) }),
  trainer: Object.freeze({ name: 'GymFlow Trainer', capabilities: Object.freeze(['gym', 'insights', 'export', 'clients']) }),
  business: Object.freeze({ name: 'GymFlow Business', capabilities: Object.freeze(['gym', 'business', 'analytics', 'equipment', 'trainers', 'promotions']) }),
});
export const isPlan = value => typeof value === 'string' && Object.hasOwn(PLANS, value);
export const canAccess = (plan, capability) => isPlan(plan) && PLANS[plan].capabilities.includes(capability);

// Simulation only: these client-side capabilities are not authorization.
export function createSubscriptionStore(storage) {
  let plan = 'free', persistent = Boolean(storage);
  const listeners = new Set();
  try { const saved = storage?.getItem(STORAGE_KEY); if (isPlan(saved)) plan = saved; }
  catch { persistent = false; }
  const snapshot = () => Object.freeze({ plan, persistent });
  function emit() { for (const listener of listeners) listener(snapshot()); }
  return Object.freeze({
    getSnapshot: snapshot,
    can: capability => canAccess(plan, capability),
    setPlan(value) {
      if (!isPlan(value)) throw new TypeError('Unknown subscription plan');
      plan = value;
      try { if (!storage) throw new Error('Storage unavailable'); storage.setItem(STORAGE_KEY, value); persistent = true; }
      catch { persistent = false; }
      emit();
    },
    sync(value) { plan = isPlan(value) ? value : 'free'; emit(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  });
}
let storage;
try { if (typeof window !== 'undefined') storage = window.localStorage; } catch {}
export const subscription = createSubscriptionStore(storage);
globalThis.addEventListener?.('storage', event => {
  if (event.storageArea === storage && (event.key === STORAGE_KEY || event.key === null)) subscription.sync(event.newValue);
});
