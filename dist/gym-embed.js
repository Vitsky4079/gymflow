// Standalone embeddable page for the 3D gym scene, reusing the same map.js /
// gyms.js / i18n.js modules as the main app — no second renderer. Talks to its
// host (a React Native WebView today; conceivably an <iframe> tomorrow) with a
// small postMessage protocol so the host never needs to know how the scene is
// implemented. See docs/ARCHITECTURE.md.
import { getGym, equipmentForGym } from './gyms.js';
import { setLanguage } from './i18n.js';

const post = message => { try { window.ReactNativeWebView?.postMessage(JSON.stringify(message)); } catch {} };

let map = null, gymId = 'studio', floor = 0, theme = 'dark', compact = false, lastUpdate = null, lastFocusId = null;

function applyTheme() {
  document.body.style.background = theme === 'dark' ? '#0c1012' : '#e6e9e7';
  map?.theme(theme);
}
function applyCompact() {
  const controls = document.querySelector('#view-controls');
  if (controls) controls.hidden = compact;
}
function applyUpdate() {
  if (map && lastUpdate) map.update(lastUpdate.selected, lastUpdate.ids, lastUpdate.doneIds, lastUpdate.showRoute);
}
function applyFocus() {
  if (map && lastFocusId) map.focus(lastFocusId);
}

async function mount() {
  map?.dispose();
  map = null;
  const gym = getGym(gymId);
  const equipment = equipmentForGym(gymId);
  try {
    const { createMap } = await import('./map.js');
    map = await createMap(equipment, id => post({ type: 'select', id }), gym, floor, () => {
      floor = floor === 0 ? 1 : 0;
      post({ type: 'floor', floor });
      mount();
    });
    // Re-apply state that may have arrived (and been dropped, since `map`
    // was still null) while the scene was loading.
    applyTheme();
    applyCompact();
    applyUpdate();
    applyFocus();
    if (compact) for (let i = 0; i < 3; i++) document.querySelector('#zoom-in')?.click();
    document.querySelector('#map-loading').hidden = true;
    post({ type: 'ready', floor, floors: gym.floors, gymId });
  } catch (error) {
    document.querySelector('#map-loading').hidden = true;
    document.querySelector('#webgl-error').hidden = false;
    post({ type: 'error', message: String((error && error.message) || error) });
  }
}

function handle(message) {
  if (!message || typeof message !== 'object') return;
  if (message.type === 'init') {
    gymId = message.gymId || 'studio';
    floor = message.floor ?? 0;
    if (typeof message.compact === 'boolean') compact = message.compact;
    if (message.language) setLanguage(message.language);
    mount();
  } else if (message.type === 'floor' && message.floor !== floor) {
    floor = message.floor;
    mount();
  } else if (message.type === 'update') {
    lastUpdate = { selected: message.selected, ids: message.ids || [], doneIds: message.doneIds || [], showRoute: message.showRoute !== false };
    applyUpdate();
  } else if (message.type === 'focus') {
    lastFocusId = message.id || null;
    applyFocus();
  } else if (message.type === 'theme') {
    theme = message.value === 'dark' ? 'dark' : 'light';
    applyTheme();
  } else if (message.type === 'language') {
    setLanguage(message.value);
    map?.language();
  }
}

function onMessage(event) {
  let message = event.data;
  if (typeof message === 'string') { try { message = JSON.parse(message); } catch { return; } }
  handle(message);
}
window.addEventListener('message', onMessage);
// Android's WebView delivers postMessage on `document`, not `window`.
document.addEventListener('message', onMessage);

post({ type: 'boot' });
