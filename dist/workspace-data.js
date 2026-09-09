// Local-only demo content for Trainer/Business workspaces: plans, templates and gym profile.
// Simulation only, like test-workspace.js — no backend, no real analytics.
const KEY = 'gymflow-workspace-content-v1';
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const today = () => new Date().toISOString().slice(0, 10);

function hash(value) { let h = 0; const s = String(value); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
export function demoNumber(id, min, max) { return min + (hash(id) % (max - min + 1)); }
export function demoPick(id, list) { return list[hash(id) % list.length]; }

const seedPlans = () => ([
  { id: 'plan-full-body', name: 'Full Body Foundations', type: 'Strength', exercises: 6, clients: 7, updated: '2026-08-28' },
  { id: 'plan-fat-loss', name: 'Fat Loss Circuit', type: 'Conditioning', exercises: 8, clients: 5, updated: '2026-09-02' },
  { id: 'plan-upper-lower', name: 'Upper / Lower Split', type: 'Strength', exercises: 10, clients: 4, updated: '2026-08-15' },
]);
const seedTemplates = () => ([
  { id: 'tpl-beginner', name: 'Beginner Full Body', category: 'General fitness', difficulty: 'Beginner', exercises: 6, duration: 40 },
  { id: 'tpl-hiit', name: 'HIIT Metabolic', category: 'Conditioning', difficulty: 'Intermediate', exercises: 8, duration: 30 },
  { id: 'tpl-strength', name: 'Strength Foundations', category: 'Strength', difficulty: 'Intermediate', exercises: 7, duration: 50 },
]);
const seedProfile = () => ({
  name: 'GymFlow Demo Gym', city: 'Gdańsk', address: 'ul. Przykładowa 12, 80-001 Gdańsk',
  hours: 'Mon–Fri 06:00–22:00 · Sat–Sun 08:00–20:00', phone: '+48 000 000 000', website: 'https://gymflow-demo.example',
  description: 'A full-service training studio with strength, cardio and functional training areas.',
  instagram: '@gymflow.demo', facebook: 'GymFlowDemo',
  amenities: ['Showers', 'Lockers', 'Free parking', 'Sauna'], floors: 1, verified: true,
});
const empty = () => ({ plans: seedPlans(), templates: seedTemplates(), profile: seedProfile() });

const validList = (list, extra = {}) => Array.isArray(list) ? list.filter(row => row && typeof row.id === 'string' && typeof row.name === 'string').map(row => ({ ...extra, ...row, name: String(row.name).slice(0, 60) })) : null;
const sanitizeProfile = profile => {
  const base = seedProfile();
  if (!profile || typeof profile !== 'object') return base;
  const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
  return {
    ...base,
    name: text(profile.name, 80) || base.name, city: text(profile.city, 60) || base.city,
    address: text(profile.address, 160), hours: text(profile.hours, 160), phone: text(profile.phone, 40),
    website: text(profile.website, 160), description: text(profile.description, 400),
    instagram: text(profile.instagram, 60), facebook: text(profile.facebook, 60),
    amenities: Array.isArray(profile.amenities) ? profile.amenities.filter(a => typeof a === 'string').slice(0, 20) : base.amenities,
    floors: Number.isInteger(profile.floors) ? Math.min(20, Math.max(1, profile.floors)) : base.floors,
    verified: profile.verified !== false,
  };
};

export function createWorkspaceContent(storage) {
  let data = empty(), persistent = Boolean(storage);
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      data.plans = validList(saved.plans, { type: 'Custom', exercises: 0, clients: 0, updated: today() }) || data.plans;
      data.templates = validList(saved.templates, { category: 'General fitness', difficulty: 'Beginner', exercises: 0, duration: 30 }) || data.templates;
      data.profile = sanitizeProfile(saved.profile);
    }
  } catch { persistent = false; }
  function save() { try { if (!storage) throw new Error('No storage'); storage.setItem(KEY, JSON.stringify(data)); persistent = true; } catch { persistent = false; } }
  return {
    get data() { return data; },
    get persistent() { return persistent; },
    addPlan() { data.plans.unshift({ id: uid(), name: 'New plan', type: 'Custom', exercises: 0, clients: 0, updated: today() }); save(); },
    duplicatePlan(id) { const p = data.plans.find(p => p.id === id); if (p) data.plans.unshift({ ...p, id: uid(), name: p.name + ' (copy)', updated: today() }); save(); },
    removePlan(id) { data.plans = data.plans.filter(p => p.id !== id); save(); },
    addTemplate() { data.templates.unshift({ id: uid(), name: 'New template', category: 'General fitness', difficulty: 'Beginner', exercises: 0, duration: 30 }); save(); },
    duplicateTemplate(id) { const tpl = data.templates.find(t => t.id === id); if (tpl) data.templates.unshift({ ...tpl, id: uid(), name: tpl.name + ' (copy)' }); save(); },
    removeTemplate(id) { data.templates = data.templates.filter(t => t.id !== id); save(); },
    updateProfile(patch) { data.profile = sanitizeProfile({ ...data.profile, ...patch }); save(); },
    reset() { data = empty(); save(); },
    save,
  };
}
