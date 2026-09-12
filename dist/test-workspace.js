import {gyms} from './gyms.js';
const KEY = 'gymflow-test-workspace-v1';
const empty = () => ({ clients: [], gyms: {} });
const validRows = rows => Array.isArray(rows) ? rows.filter(row => row && typeof row.id === 'string' && typeof row.name === 'string').map(row => ({ id: row.id, name: row.name.slice(0, 60), note: String(row.note || '').slice(0, 200), active: row.active !== false })) : [];
export function createTestWorkspace(storage) {
  let data = empty(), persistent = Boolean(storage);
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      data.clients = validRows(saved.clients);
      for (const id of gyms.map(g=>g.id)) {
        const gym = saved.gyms?.[id];
        if (gym) data.gyms[id] = { trainers: validRows(gym.trainers), promotions: validRows(gym.promotions), maintenance: Array.isArray(gym.maintenance) ? gym.maintenance.filter(id => typeof id === 'string') : [] };
      }
    }
  } catch { persistent = false; }
  const gymData = id => data.gyms[id] ||= { trainers: [], promotions: [], maintenance: [] };
  return {
    get data() { return data; },
    get persistent() { return persistent; },
    gym: gymData,
    rows(kind, gymId) { return kind === 'clients' ? data.clients : gymData(gymId)[kind]; },
    save() {
      try { if (!storage) throw new Error('No storage'); storage.setItem(KEY, JSON.stringify(data)); persistent = true; }
      catch { persistent = false; }
    },
    reset() { data = empty(); this.save(); },
  };
}
