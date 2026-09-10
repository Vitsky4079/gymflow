import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubscriptionStore, canAccess, STORAGE_KEY } from '../dist/subscription.js';
import { createTestWorkspace } from '../dist/test-workspace.js';

const memory = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
test('all four plans have explicit, isolated capabilities', () => {
  const expected = {
    free: ['gym'], premium: ['gym', 'insights', 'export', 'route', 'library'],
    trainer: ['gym', 'insights', 'export', 'route', 'library', 'clients'],
    business: ['gym', 'business', 'analytics', 'equipment', 'trainers', 'promotions'],
  };
  for (const [plan, capabilities] of Object.entries(expected)) {
    for (const feature of ['gym', 'insights', 'export', 'route', 'library', 'clients', 'business', 'analytics', 'equipment', 'trainers', 'promotions']) {
      assert.equal(canAccess(plan, feature), capabilities.includes(feature), `${plan}: ${feature}`);
    }
  }
  assert.equal(canAccess('unknown', 'gym'), false);
  assert.equal(canAccess('__proto__', 'gym'), false);
});
test('plan changes notify immediately, persist and restore without touching workouts', () => {
  const storage = memory();
  storage.setItem('gymflow-v3', 'existing workout');
  const store = createSubscriptionStore(storage);
  const seen = [];
  const unsubscribe = store.subscribe(state => seen.push(state.plan));
  for (const plan of ['premium', 'trainer', 'business', 'free']) store.setPlan(plan);
  assert.deepEqual(seen, ['premium', 'trainer', 'business', 'free']);
  store.setPlan('trainer');
  assert.equal(createSubscriptionStore(storage).getSnapshot().plan, 'trainer');
  assert.equal(storage.getItem('gymflow-v3'), 'existing workout');
  unsubscribe(); store.setPlan('free');
  assert.equal(seen.length, 5);
});
test('unknown stored plans fail closed and invalid updates do not mutate state', () => {
  const storage = memory(); storage.setItem(STORAGE_KEY, '__proto__');
  const store = createSubscriptionStore(storage);
  assert.equal(store.getSnapshot().plan, 'free');
  assert.throws(() => store.setPlan('enterprise'), TypeError);
  assert.throws(() => store.setPlan(['premium']), TypeError);
  assert.equal(store.getSnapshot().plan, 'free');
});
test('storage failures keep switching functional and expose a persistence warning', () => {
  const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } };
  const store = createSubscriptionStore(storage);
  store.setPlan('premium');
  assert.equal(store.can('insights'), true);
  assert.equal(store.getSnapshot().persistent, false);
});
test('cross-tab downgrade and clearing remove previous capabilities', () => {
  const store = createSubscriptionStore(memory());
  store.setPlan('business'); store.sync('free');
  assert.equal(store.can('equipment'), false);
  store.sync('trainer'); assert.equal(store.can('clients'), true);
  store.sync(null); assert.equal(store.getSnapshot().plan, 'free');
});
test('test workspace persists separate gym data and reset preserves existing workouts', () => {
  const storage = memory(); storage.setItem('gymflow-v3', 'unchanged');
  const workspace = createTestWorkspace(storage);
  workspace.rows('clients', 'studio').push({ id: 'test', name: 'Test client', note: 'Goal', active: true });
  workspace.gym('studio').maintenance.push('treadmill'); workspace.save();
  const restored = createTestWorkspace(storage);
  assert.equal(restored.data.clients[0].name, 'Test client');
  assert.deepEqual(restored.gym('studio').maintenance, ['treadmill']);
  assert.deepEqual(restored.gym('atlas').maintenance, []);
  restored.reset();
  assert.deepEqual(createTestWorkspace(storage).data, { clients: [], gyms: {} });
  assert.equal(storage.getItem('gymflow-v3'), 'unchanged');
});
test('malformed test data and unavailable storage do not crash the workspace', () => {
  const storage = memory(); storage.setItem('gymflow-test-workspace-v1', '{invalid');
  assert.deepEqual(createTestWorkspace(storage).data.clients, []);
  storage.setItem('gymflow-test-workspace-v1', JSON.stringify({clients:[null, {}, {id:'ok', name:'Example'}], gyms:{studio:{trainers:'bad', maintenance:[42,'bike']}}}));
  const workspace = createTestWorkspace(storage);
  assert.equal(workspace.data.clients.length, 1);
  assert.deepEqual(workspace.gym('studio').trainers, []);
  assert.deepEqual(workspace.gym('studio').maintenance, ['bike']);
  const unavailable = createTestWorkspace(); unavailable.save();
  assert.equal(unavailable.persistent, false);
});
