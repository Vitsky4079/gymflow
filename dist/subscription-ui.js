import { PLANS, subscription } from './subscription.js';
import { st } from './subscription-i18n.js';
import { createTestWorkspace } from './test-workspace.js';
import { machine } from './i18n.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pages = Object.freeze({ training: null, account: null, insights: 'insights', clients: 'clients', business: 'business', analytics: 'analytics', equipment: 'equipment', trainers: 'trainers', promotions: 'promotions' });

export function mountSubscriptionUI(getWorkout) {
  let storage;
  try { storage = localStorage; } catch {}
  const workspace = createTestWorkspace(storage);
  const host = document.createElement('div');
  host.id = 'subscription-shell';
  document.querySelector('header').after(host);
  host.innerHTML = '<div class="subscription-toolbar"><div class="subscription-selector"><label for="test-subscription"></label><select id="test-subscription"></select><span class="subscription-badge"></span></div><nav class="subscription-nav"></nav></div><div class="sr-only" role="status" id="subscription-announcement"></div><section class="subscription-panel" aria-labelledby="subscription-title" hidden></section>';
  const select = host.querySelector('select');
  const nav = host.querySelector('nav');
  const panel = host.querySelector('section');
  let page = 'training';
  const permitted = id => Object.hasOwn(pages, id) && (!pages[id] || subscription.can(pages[id]));
  const navigable = id => id === 'insights' || permitted(id);
  const button = (label, attrs = '') => `<button type="button" class="subscription-button" ${attrs}>${esc(label)}</button>`;
  function announce(message) { host.querySelector('[role="status"]').textContent = message; }
  function navigate(id) {
    if (!navigable(id)) id = 'account';
    page = id;
    render();
    if (page !== 'training') panel.querySelector('h2').focus();
    else document.querySelector('#plan-select').focus();
  }
  function render() {
    const { plan, persistent } = subscription.getSnapshot();
    host.querySelector('label').textContent = st('selector');
    select.innerHTML = Object.entries(PLANS).map(([id, p]) => `<option value="${id}">${p.name.replace('GymFlow ', '')}</option>`).join('');
    select.value = plan;
    host.querySelector('.subscription-badge').textContent = st('simulation');
    nav.setAttribute('aria-label', st('account'));
    nav.innerHTML = Object.keys(pages).filter(navigable).map(id => button(st(id) + (id === 'insights' && !permitted(id) ? ' · ' + st('locked') : ''), `data-page="${id}" ${page === id ? 'aria-current="page"' : ''}`)).join('');
    panel.hidden = page === 'training';
    if (panel.hidden) return;
    const snapshot = getWorkout();
    panel.innerHTML = `<div class="subscription-panel-heading"><div><div class="eyebrow">${esc(PLANS[plan].name)} · ${esc(snapshot.gym.name)}</div><h2 id="subscription-title" tabindex="-1">${esc(st(page))}</h2></div>${button(st('back'), 'data-page="training"')}</div><div id="subscription-content"></div><p class="subscription-storage" role="status">${esc(persistent && workspace.persistent ? st('saved') : st('unsaved'))}</p>`;
    const content = panel.querySelector('#subscription-content');
    if (page === 'account') renderAccount(content, plan);
    else if (!permitted(page)) content.innerHTML = `<div class="subscription-lock"><span class="subscription-badge">${st('locked')}</span><h3>${st('premiumFeatures')}</h3><p>${st('lockedText')}</p>${button(st('select') + ' · Premium', 'data-plan="premium"')}</div>`;
    else if (page === 'insights') renderInsights(content, snapshot);
    else if (['clients', 'trainers', 'promotions'].includes(page)) renderRows(content, snapshot);
    else renderBusiness(content, snapshot);
  }
  function renderAccount(content, plan) {
    const features = { free: ['gym'], premium: ['gym', 'premiumFeatures'], trainer: ['gym', 'premiumFeatures', 'clientFeatures'], business: ['gym', 'businessFeatures'] };
    content.innerHTML = `<p>${st('intro')}</p><div class="subscription-plan-grid">${Object.entries(PLANS).map(([id, p]) => `<article class="subscription-card ${id === plan ? 'is-current' : ''}"><h3>${p.name}</h3><ul>${features[id].map(key => `<li>${st(key)}</li>`).join('')}</ul>${button(st(id === plan ? 'current' : 'select'), `data-plan="${id}" ${id === plan ? 'disabled' : ''}`)}</article>`).join('')}</div><div class="subscription-reset"><p>${st('resetNote')}</p>${button(st('reset'), 'data-reset-workspace')}</div>`;
  }
  const metric = (value, label) => `<article class="subscription-card subscription-metric"><strong>${esc(value)}</strong><span>${esc(st(label))}</span></article>`;
  function renderInsights(content, snapshot) {
    const total = snapshot.steps.reduce((sum, step) => sum + step.sets, 0);
    content.innerHTML = `<p>${st('sessionNote')}</p><div class="subscription-metrics">${metric(snapshot.steps.length, 'exercises')}${metric(`${snapshot.completedSets} / ${total}`, 'sets')}${metric(`${total ? Math.round(snapshot.completedSets / total * 100) : 0}%`, 'progress')}</div>${subscription.can('export') ? button(st('export'), 'data-export') : ''}`;
  }
  function renderRows(content, snapshot) {
    const rows = workspace.rows(page, snapshot.gym.id);
    content.innerHTML = `<p>${st('sample')}</p><form class="subscription-form"><label>${st('name')}<input name="name" required maxlength="60" autocomplete="off"></label><label>${st('note')}<input name="note" maxlength="200" autocomplete="off"></label><button class="subscription-button" type="submit">${st('add')}</button></form><div class="subscription-entries">${rows.length ? rows.map(row => `<article class="subscription-entry"><div><strong>${esc(row.name)}</strong><p>${esc(row.note)}</p></div><label>${st('status')}<select data-entry-status="${esc(row.id)}"><option value="active" ${row.active ? 'selected' : ''}>${st('active')}</option><option value="paused" ${!row.active ? 'selected' : ''}>${st('paused')}</option></select></label>${button(st('remove'), `data-remove-entry="${esc(row.id)}" aria-label="${esc(st('remove') + ': ' + row.name)}"`)}</article>`).join('') : `<p class="empty">${st('empty')}</p>`}</div>`;
    content.querySelector('form').onsubmit = event => {
      event.preventDefault();
      if (!permitted(page)) return;
      const form = event.currentTarget;
      const name = form.elements.name.value.trim();
      if (!name) { form.elements.name.setCustomValidity(st('name')); form.elements.name.reportValidity(); return; }
      rows.push({ id: crypto.randomUUID(), name, note: form.elements.note.value.trim(), active: true });
      persist(st('updated'));
      panel.querySelector('input[name="name"]').focus();
    };
    content.querySelector('input[name="name"]').oninput = event => event.target.setCustomValidity('');
  }
  function renderBusiness(content, snapshot) {
    const gym = workspace.gym(snapshot.gym.id);
    if (page === 'equipment') {
      content.innerHTML = `<p>${st('inventoryNote')}</p><div class="subscription-inventory">${snapshot.equipment.map(e => `<article class="subscription-entry"><div><strong>${esc(machine(e).name)}</strong><p>${st('floor')}: ${e.floor}</p></div><label>${st('status')}<select data-maintenance="${e.id}"><option value="ready" ${!gym.maintenance.includes(e.id) ? 'selected' : ''}>${st('ready')}</option><option value="maintenance" ${gym.maintenance.includes(e.id) ? 'selected' : ''}>${st('maintenance')}</option></select></label></article>`).join('')}</div>`;
      return;
    }
    content.innerHTML = `<p>${st('analyticsNote')}</p><div class="subscription-metrics">${metric(snapshot.equipment.length, 'totalEquipment')}${metric(snapshot.gym.floors, 'floors')}${metric(gym.maintenance.length, 'maintenance')}${metric(gym.trainers.filter(r => r.active).length, 'trainers')}${metric(gym.promotions.filter(r => r.active).length, 'promotions')}</div>`;
    if (page === 'business') content.innerHTML += `<div class="subscription-links">${['analytics', 'equipment', 'trainers', 'promotions'].map(id => button(st(id), `data-page="${id}"`)).join('')}</div>`;
  }
  function announceSaved(message) {
    const persistent = workspace.persistent && subscription.getSnapshot().persistent;
    const status = panel.querySelector('.subscription-storage');
    if (status) status.textContent = st(persistent ? 'saved' : 'unsaved');
    announce(workspace.persistent ? message : st('unsaved'));
  }
  function persist(message) { workspace.save(); render(); announceSaved(message); }
  select.onchange = () => subscription.setPlan(select.value);
  host.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.page) navigate(target.dataset.page);
    else if (target.dataset.plan) subscription.setPlan(target.dataset.plan);
    else if (target.hasAttribute('data-reset-workspace') && page === 'account' && confirm(st('confirmReset'))) { workspace.reset(); render(); announce(st('updated')); }
    else if (target.dataset.removeEntry && permitted(page) && ['clients', 'trainers', 'promotions'].includes(page)) {
      const rows = workspace.rows(page, getWorkout().gym.id);
      const index = rows.findIndex(row => row.id === target.dataset.removeEntry);
      if (index >= 0) rows.splice(index, 1);
      persist(st('removed'));
      panel.querySelector('input[name="name"]').focus();
    } else if (target.hasAttribute('data-export') && subscription.can('export')) {
      const snapshot = getWorkout();
      const blob = new Blob([JSON.stringify({ simulation: true, version: 1, gymId: snapshot.gym.id, workout: snapshot.steps, completedSets: snapshot.completedSets }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'gymflow-workout.json'; link.hidden = true;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  host.addEventListener('change', event => {
    const target = event.target;
    if (target.dataset.entryStatus && permitted(page) && ['clients', 'trainers', 'promotions'].includes(page)) {
      const row = workspace.rows(page, getWorkout().gym.id).find(row => row.id === target.dataset.entryStatus);
      if (row) row.active = target.value === 'active';
      workspace.save(); announceSaved(st('updated'));
    } else if (target.dataset.maintenance && subscription.can('equipment')) {
      const gym = workspace.gym(getWorkout().gym.id);
      gym.maintenance = gym.maintenance.filter(id => id !== target.dataset.maintenance);
      if (target.value === 'maintenance') gym.maintenance.push(target.dataset.maintenance);
      workspace.save(); announceSaved(st('updated'));
    }
  });
  subscription.subscribe(({ plan, persistent }) => {
    const hadPanelFocus = panel.contains(document.activeElement);
    if (!permitted(page) && page !== 'insights') page = 'training';
    render();
    if (hadPanelFocus) select.focus();
    announce(`${PLANS[plan].name}. ${st('simulation')}${persistent ? '' : '. ' + st('unsaved')}`);
  });
  render();
  return { refresh: render };
}
