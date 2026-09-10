import { PLANS, subscription } from './subscription.js';
import { st } from './workspace-i18n.js';
import { createTestWorkspace } from './test-workspace.js';
import { createWorkspaceContent, demoNumber, demoPick } from './workspace-data.js';
import { getRoute, navigate, onRoute, requiredCapability, defaultRouteForPlan } from './router.js';
import { machine, t, getLanguage, zoneName, preset } from './i18n.js';
import { createDropdown } from './dropdown.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cryptoId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const PRICES = { free: null, premium: '24.99 PLN', trainer: '59.99 PLN', business: '299+ PLN' };
const FEATURES = { free: ['featureGym'], premium: ['featureGym', 'featurePremium'], trainer: ['featureGym', 'featurePremium', 'featureClients'], business: ['featureGym', 'featureBusiness'] };
const ACCOUNT_TABS = ['profile', 'appearance', 'language', 'notifications', 'subscription'];
const PLAN_LABELS = ['General Fitness', 'Strength Foundations', 'Fat Loss Circuit', 'Upper/Lower Split', 'Mobility & Core'];
const SPECIALTIES = ['Strength & Conditioning', 'Functional Training', 'Weight Loss', 'Mobility', 'Powerlifting'];
const NOTIF_KEY = 'gymflow-notification-prefs-v1';

export function mountWorkspaceUI(getWorkout) {
  let storage; try { storage = localStorage; } catch {}
  const workspace = createTestWorkspace(storage);
  const content = createWorkspaceContent(storage);

  const header = document.querySelector('header');
  const mainEl = document.querySelector('main');
  const mainParent = mainEl.parentNode, mainNext = mainEl.nextSibling;
  const restoreMain = () => { if (mainEl.parentNode !== mainParent) mainParent.insertBefore(mainEl, mainNext); };
  const embedMain = container => { if (mainEl.parentNode !== container) container.appendChild(mainEl); };

  const devWrap = document.createElement('div');
  devWrap.className = 'dev-select';
  devWrap.innerHTML = '<b></b><button type="button" class="plan-picker-trigger" id="dev-plan-trigger" aria-haspopup="listbox" aria-expanded="false"><span id="dev-plan-label"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>';
  header.querySelector('.header-actions').prepend(devWrap);
  const devTrigger = devWrap.querySelector('#dev-plan-trigger');
  const devLabel = devWrap.querySelector('#dev-plan-label');
  const devPicker = createDropdown(devTrigger, {
    fit: 'content',
    onOpen: menu => { menu.innerHTML = Object.entries(PLANS).map(([id, p]) => `<button type="button" class="plan-option nowrap ${id === subscription.getSnapshot().plan ? 'active' : ''}" data-option="${id}" role="option"><span class="plan-option-main"><span class="plan-option-name">${esc(p.name.replace('GymFlow ', ''))}</span></span></button>`).join(''); },
    onSelect: value => { subscription.setPlan(value); navigate(defaultRouteForPlan(value)); },
  });

  const shellBar = document.createElement('div');
  shellBar.id = 'gym-shell-bar';
  header.after(shellBar);

  const root = document.createElement('div');
  root.id = 'workspace-root';
  shellBar.after(root);

  const progressDialog = document.createElement('dialog');
  progressDialog.id = 'progress-dialog';
  document.body.append(progressDialog);
  progressDialog.addEventListener('close', () => { if (getRoute().segments[0] === 'progress') navigate('/workout'); });

  let toastTimer;
  function toast(message) {
    const el = document.querySelector('#toast');
    if (!el) return;
    el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function doExport() {
    if (!subscription.can('export')) return;
    const snapshot = getWorkout();
    const blob = new Blob([JSON.stringify({ simulation: true, version: 1, gymId: snapshot.gym.id, workout: snapshot.steps, completedSets: snapshot.completedSets }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'gymflow-workout.json'; link.hidden = true;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderDevSelect(plan) {
    devWrap.querySelector('b').textContent = st('devMode');
    devTrigger.setAttribute('aria-label', st('previewAs') + ': ' + PLANS[plan].name.replace('GymFlow ', ''));
    devTrigger.title = st('devModeHint');
    devLabel.textContent = PLANS[plan].name.replace('GymFlow ', '');
    devPicker.refresh();
  }

  function renderShellBar(route, context) {
    if (context === 'trainer') {
      shellBar.innerHTML = `<button type="button" class="shell-pill shell-back" data-nav="/trainer">← ${esc(st('backToTrainer'))}</button>`;
      return;
    }
    const current = route.segments[0] || 'workout';
    const items = [['workout', 'navWorkout'], ['gyms', 'navGyms'], ['progress', 'navProgress'], ['exercises', 'navExercises']];
    shellBar.innerHTML = items.map(([id, key]) => `<button type="button" class="shell-pill" data-nav="/${id}" ${current === id ? 'aria-current="page"' : ''}>${esc(st(key))}</button>`).join('')
      + `<button type="button" class="shell-pill" data-nav="/account">${esc(st('navAccount'))}</button>`;
  }

  function renderProgressDialog() {
    const snapshot = getWorkout();
    const canInsights = subscription.can('insights');
    const total = snapshot.steps.reduce((sum, step) => sum + step.sets, 0);
    progressDialog.innerHTML = `<div class="progress-dialog-inner">
      <div class="progress-dialog-head"><div><div class="eyebrow">${esc(snapshot.gym.name)}</div><h2>${esc(st('navProgress'))}</h2></div><button type="button" class="progress-close" data-close-progress aria-label="${esc(st('close'))}">×</button></div>
      ${canInsights ? `<p>${esc(st('sessionNote'))}</p><div class="stat-grid">
          <div class="stat-card"><strong>${snapshot.steps.length}</strong><span>${esc(st('exercises'))}</span></div>
          <div class="stat-card"><strong>${snapshot.completedSets} / ${total}</strong><span>${esc(st('sets'))}</span></div>
          <div class="stat-card"><strong>${total ? Math.round(snapshot.completedSets / total * 100) : 0}%</strong><span>${esc(st('progress'))}</span></div>
        </div>${subscription.can('export') ? `<button type="button" class="chip-btn" data-export>${esc(st('export'))}</button>` : ''}`
        : `<div class="workspace-card"><span class="badge badge-premium">${esc(st('locked'))}</span><p style="margin-top:10px">${esc(st('lockedText'))}</p><button type="button" class="chip-btn" data-nav="/account/subscription">${esc(st('viewPlans'))}</button></div>`}
    </div>`;
  }
  function openProgressDialog() { renderProgressDialog(); if (!progressDialog.open) progressDialog.showModal(); }

  function handleGymSideEffects(seg0) {
    if (seg0 === 'gyms') requestAnimationFrame(() => document.querySelector('#gym-select')?.focus());
    else if (seg0 === 'exercises') {
      const catalog = document.querySelector('.catalog');
      if (catalog) { catalog.open = true; requestAnimationFrame(() => document.querySelector('#search')?.focus()); }
    } else if (seg0 === 'progress') openProgressDialog();
  }

  function renderAccessRequired(cap) {
    const planLabel = cap === 'clients' ? PLANS.trainer.name : PLANS.business.name;
    root.innerHTML = `<div class="access-required">
      <span class="badge badge-premium">${esc(planLabel)}</span>
      <h1>${esc(st('accessRequiredTitle', { plan: planLabel }))}</h1>
      <p>${esc(st('accessRequiredText', { plan: planLabel }))}</p>
      <button type="button" class="chip-btn" data-nav="/account/subscription">${esc(st('viewPlans'))}</button>
    </div>`;
  }

  function navLink(item) { return `<a href="#${item.path}" data-nav="${item.path}" ${item.active ? 'aria-current="page"' : ''}>${esc(item.label)}</a>`; }
  function renderSidebarShell({ brandTitle, brandSubtitle, primaryNav, secondaryNav, backLabel, backPath, content: renderContent }) {
    const navBlock = items => items.map(navLink).join('');
    root.innerHTML = `<div class="workspace-shell">
      <aside class="workspace-sidebar">
        <div class="workspace-brand">${esc(brandTitle)}${brandSubtitle ? `<span>${esc(brandSubtitle)}</span>` : ''}</div>
        <nav class="workspace-nav">${navBlock(primaryNav)}</nav>
        ${secondaryNav.length ? `<div class="workspace-nav-divider"></div><nav class="workspace-nav">${navBlock(secondaryNav)}</nav>` : ''}
        <div class="workspace-nav-divider"></div>
        <nav class="workspace-nav"><a href="#${backPath}" data-nav="${backPath}">← ${esc(backLabel)}</a></nav>
      </aside>
      <details class="workspace-mobile-nav"><summary>${esc(brandTitle)}</summary>
        <nav class="workspace-nav">${navBlock(primaryNav)}${secondaryNav.length ? navBlock(secondaryNav) : ''}<a href="#${backPath}" data-nav="${backPath}">← ${esc(backLabel)}</a></nav>
      </details>
      <div class="workspace-content" id="workspace-page"></div>
    </div>`;
    renderContent(root.querySelector('#workspace-page'));
  }

  function renderAccountBody(el, subtab, plan) {
    if (subtab === 'appearance') return renderAppearanceTab(el);
    if (subtab === 'language') return renderLanguageTab(el);
    if (subtab === 'notifications') return renderNotificationsTab(el);
    if (subtab === 'subscription') return renderSubscriptionTab(el, plan);
    return renderProfileTab(el, plan);
  }
  function renderProfileTab(el, plan) {
    el.innerHTML = `<div class="workspace-card">
      <div class="account-field"><span>${esc(st('profileName'))}</span><span>Preview account</span></div>
      <div class="account-field"><span>${esc(st('profileEmail'))}</span><span>preview@example.com</span></div>
      <div class="account-field"><span>${esc(st('profileRole'))}</span><span>${esc(PLANS[plan].name)}</span></div>
      <div class="account-field"><span>${esc(st('profileMember'))}</span><span>2026</span></div>
    </div>
    <p class="mock-note">${esc(st('profilePlaceholderNote'))}</p>
    <button type="button" class="chip-btn" disabled data-mock-action>${esc(st('editProfile'))}</button>`;
  }
  function renderAppearanceTab(el) {
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    el.innerHTML = `<div class="workspace-card"><div class="radio-row">
      <label><input type="radio" name="theme-pref" value="dark" ${theme === 'dark' ? 'checked' : ''}> ${esc(t('dark'))}</label>
      <label><input type="radio" name="theme-pref" value="light" ${theme === 'light' ? 'checked' : ''}> ${esc(t('light'))}</label>
    </div></div>`;
  }
  function renderLanguageTab(el) {
    const lang = getLanguage();
    el.innerHTML = `<div class="workspace-card"><div class="radio-row">
      <label><input type="radio" name="lang-pref" value="en" ${lang === 'en' ? 'checked' : ''}> English</label>
      <label><input type="radio" name="lang-pref" value="pl" ${lang === 'pl' ? 'checked' : ''}> Polski</label>
    </div></div>`;
  }
  function loadNotifPrefs() {
    try { const saved = JSON.parse(localStorage.getItem(NOTIF_KEY) || 'null'); return { reminders: true, trainerMessages: true, promotions: false, ...(saved && typeof saved === 'object' ? saved : {}) }; }
    catch { return { reminders: true, trainerMessages: true, promotions: false }; }
  }
  function renderNotificationsTab(el) {
    const prefs = loadNotifPrefs();
    el.innerHTML = `<div class="workspace-card">
      <div class="toggle-row"><span>${esc(st('workoutReminders'))}</span><input type="checkbox" data-notif="reminders" ${prefs.reminders ? 'checked' : ''}></div>
      <div class="toggle-row"><span>${esc(st('trainerMessages'))}</span><input type="checkbox" data-notif="trainerMessages" ${prefs.trainerMessages ? 'checked' : ''}></div>
      <div class="toggle-row"><span>${esc(st('promoNotifications'))}</span><input type="checkbox" data-notif="promotions" ${prefs.promotions ? 'checked' : ''}></div>
    </div><p class="mock-note">${esc(st('notificationsNote'))}</p>`;
  }
  function renderSubscriptionTab(el, plan) {
    const snap = subscription.getSnapshot();
    el.innerHTML = `<p>${esc(st('introSubscription'))}</p>
      <div class="workspace-card" style="margin-bottom:20px">
        <div class="eyebrow">${esc(st('currentPlan'))}</div>
        <h3 style="margin:6px 0 4px">${esc(PLANS[plan].name)}</h3>
        <p style="margin:0">${PRICES[plan] ? esc(PRICES[plan]) + esc(st('perMonth')) : esc(st('free'))} · ${esc(st('testingModePreview'))}</p>
        <p class="mock-note">${esc(st('noPaymentConnected'))}</p>
      </div>
      <div class="plan-grid">${Object.entries(PLANS).map(([id, p]) => `
        <article class="plan-card ${id === plan ? 'is-current' : ''}">
          <span class="badge badge-${id}">${esc(p.name.replace('GymFlow ', ''))}</span>
          <h3>${esc(p.name)}</h3>
          <div class="plan-price">${PRICES[id] ? esc(PRICES[id]) + esc(st('perMonth')) : esc(st('free'))}</div>
          <ul>${FEATURES[id].map(key => `<li>${esc(st(key))}</li>`).join('')}</ul>
          <button type="button" class="chip-btn" data-plan="${id}" data-plan-navigate ${id === plan ? 'disabled' : ''}>${id === plan ? esc(st('currentPlanBadge')) : esc(st('previewPlanBtn'))}</button>
        </article>`).join('')}
      </div>
      <div class="workspace-card">
        <p class="mock-note">${esc(st('resetTestNote'))}</p>
        <button type="button" class="chip-btn" data-reset-workspace>${esc(st('resetTestData'))}</button>
        <p class="mock-note">${esc(snap.persistent && workspace.persistent && content.persistent ? st('saved') : st('unsaved'))}</p>
      </div>`;
  }

  function renderAccountStandalone(seg, plan) {
    const subtab = ACCOUNT_TABS.includes(seg[1]) ? seg[1] : 'profile';
    renderSidebarShell({
      brandTitle: st('navAccount'), brandSubtitle: null,
      primaryNav: ACCOUNT_TABS.map(id => ({ path: '/account/' + id, label: st(id), active: subtab === id })),
      secondaryNav: [],
      backLabel: st('backToGymFlow'), backPath: defaultRouteForPlan(plan),
      content: el => { el.innerHTML = '<div id="account-body"></div>'; renderAccountBody(el.querySelector('#account-body'), subtab, plan); },
    });
  }
  function renderAccountEmbedded(el, subtabRaw, basePath, plan) {
    const subtab = ACCOUNT_TABS.includes(subtabRaw) ? subtabRaw : 'profile';
    el.innerHTML = `<div class="workspace-header"><h1>${esc(st('navAccount'))}</h1></div>
      <div class="account-tabs">${ACCOUNT_TABS.map(id => `<a href="#${basePath}/${id}" data-nav="${basePath}/${id}" ${subtab === id ? 'aria-current="page"' : ''}>${esc(st(id))}</a>`).join('')}</div>
      <div id="account-body"></div>`;
    renderAccountBody(el.querySelector('#account-body'), subtab, plan);
  }

  function personEntry(row, kind, gymId, subtitle, metaHtml) {
    const initial = (row.name || '?').trim().charAt(0).toUpperCase() || '?';
    return `<div class="entry-card">
      <span class="entry-avatar">${esc(initial)}</span>
      <div class="entry-main"><strong>${esc(row.name)}</strong><p>${esc(subtitle)}</p></div>
      <div class="entry-meta">${metaHtml}</div>
      <div class="entry-actions">
        <select data-entry-status="${esc(row.id)}" data-entry-kind="${kind}" data-entry-gym="${esc(gymId)}">
          <option value="active" ${row.active ? 'selected' : ''}>${esc(st('active'))}</option>
          <option value="paused" ${!row.active ? 'selected' : ''}>${esc(st('paused'))}</option>
        </select>
        <button type="button" class="chip-btn danger" data-remove-entry="${esc(row.id)}" data-entry-kind="${kind}" data-entry-gym="${esc(gymId)}">${esc(st('remove'))}</button>
      </div>
    </div>`;
  }
  function bindAddForm(formEl, kind, gymId) {
    formEl.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = form.elements.name.value.trim();
      if (!name) { form.elements.name.setCustomValidity(st('name')); form.elements.name.reportValidity(); return; }
      workspace.rows(kind, gymId).push({ id: cryptoId(), name, note: form.elements.note.value.trim(), active: true });
      workspace.save(); render();
    });
  }

  function renderTrainerOverview(el, plan) {
    const gymId = getWorkout().gym.id;
    const clients = workspace.rows('clients', gymId);
    const attention = clients.filter(c => demoNumber(c.id, 0, 100) < 40).slice(0, 3);
    el.innerHTML = `<div class="workspace-header">
        <div><p class="eyebrow">${esc(st('welcomeBack'))}</p><h1>${esc(st('trainerTitle'))}</h1></div>
        <button type="button" class="chip-btn" data-nav="/trainer/clients">${esc(st('addClient'))}</button>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><strong>18</strong><span>${esc(st('activeClients'))}</span></div>
        <div class="stat-card"><strong>54</strong><span>${esc(st('workoutsThisWeek'))}</span></div>
        <div class="stat-card"><strong>86%</strong><span>${esc(st('avgCompletion'))}</span></div>
        <div class="stat-card"><strong>12</strong><span>${esc(st('plansAssigned'))}</span></div>
      </div>
      <p class="mock-note">${esc(st('demoDataNote'))}</p>
      <div class="workspace-section"><div class="workspace-section-heading"><h2>${esc(st('recentActivity'))}</h2></div>
        <div class="entry-list">${clients.length ? clients.slice(0, 4).map(row => clientEntry(row, gymId)).join('') : `<p class="empty">${esc(st('empty'))}</p>`}</div></div>
      <div class="workspace-section"><div class="workspace-section-heading"><h2>${esc(st('needsAttention'))}</h2></div>
        <div class="entry-list">${attention.length ? attention.map(row => clientEntry(row, gymId)).join('') : `<p class="empty">${esc(st('empty'))}</p>`}</div></div>
      <div class="workspace-section"><div class="workspace-section-heading"><h2>${esc(st('quickActions'))}</h2></div>
        <div class="quick-actions">
          <button type="button" data-nav="/trainer/clients">${esc(st('addClient'))}</button>
          <button type="button" data-nav="/trainer/plans">${esc(st('createPlan'))}</button>
          <button type="button" data-mock-action>${esc(st('assignWorkout'))}</button>
        </div></div>`;
  }
  function clientEntry(row, gymId) {
    const completion = demoNumber(row.id, 55, 98), daysAgo = demoNumber(row.id + '-last', 0, 6), nextIn = demoNumber(row.id + '-next', 1, 5);
    const meta = `<div>${esc(st('lastWorkout'))}<b>${esc(st('daysAgo', { n: daysAgo }))}</b></div>
      <div>${esc(st('completion'))}<b>${completion}%</b><span class="progress-mini"><i style="width:${completion}%"></i></span></div>
      <div>${esc(st('nextWorkout'))}<b>${esc(st('inDays', { n: nextIn }))}</b></div>`;
    return personEntry(row, 'clients', gymId, demoPick(row.id, PLAN_LABELS), meta);
  }
  function renderTrainerClients(el) {
    const gymId = getWorkout().gym.id;
    const rows = workspace.rows('clients', gymId);
    el.innerHTML = `<div class="workspace-header"><div><h1>${esc(st('clients'))}</h1><p>${esc(st('sample'))}</p></div></div>
      <form class="workspace-form workspace-card" id="add-form" style="margin-bottom:20px">
        <label>${esc(st('name'))}<input name="name" required maxlength="60" autocomplete="off"></label>
        <label>${esc(st('note'))}<input name="note" maxlength="200" autocomplete="off"></label>
        <label class="full"><button class="chip-btn" type="submit">${esc(st('add'))}</button></label>
      </form>
      <div class="entry-list">${rows.length ? rows.map(row => clientEntry(row, gymId)).join('') : `<p class="empty">${esc(st('empty'))}</p>`}</div>`;
    bindAddForm(el.querySelector('#add-form'), 'clients', gymId);
  }
  function planRow(plan) {
    return `<div class="entry-card">
      <div class="entry-main"><strong>${esc(plan.name)}</strong><p>${esc(plan.type)}</p></div>
      <div class="entry-meta">
        <div>${esc(st('exerciseCount'))}<b>${plan.exercises}</b></div>
        <div>${esc(st('assignedClients'))}<b>${plan.clients}</b></div>
        <div>${esc(st('lastUpdated'))}<b>${esc(plan.updated)}</b></div>
      </div>
      <div class="entry-actions">
        <button type="button" class="chip-btn" data-mock-action>${esc(st('edit'))}</button>
        <button type="button" class="chip-btn" data-plan-action="duplicate:${esc(plan.id)}">${esc(st('duplicate'))}</button>
        <button type="button" class="chip-btn" data-mock-action>${esc(st('assign'))}</button>
        <button type="button" class="chip-btn danger" data-plan-action="delete:${esc(plan.id)}">${esc(st('delete'))}</button>
      </div>
    </div>`;
  }
  function renderTrainerPlans(el) {
    const plans = content.data.plans;
    el.innerHTML = `<div class="workspace-header"><div><h1>${esc(st('plans'))}</h1><p>${esc(st('sample'))}</p></div>
      <button type="button" class="chip-btn" data-plan-action="create">${esc(st('createPlan'))}</button></div>
      <div class="entry-list">${plans.length ? plans.map(planRow).join('') : `<p class="empty">${esc(st('empty'))}</p>`}</div>`;
  }
  function templateRow(tpl) {
    return `<div class="entry-card">
      <div class="entry-main"><strong>${esc(tpl.name)}</strong><p>${esc(tpl.category)} · ${esc(tpl.difficulty)}</p></div>
      <div class="entry-meta">
        <div>${esc(st('exerciseCount'))}<b>${tpl.exercises}</b></div>
        <div>${esc(st('duration'))}<b>${esc(st('minutes', { n: tpl.duration }))}</b></div>
      </div>
      <div class="entry-actions">
        <button type="button" class="chip-btn" data-mock-action>${esc(st('edit'))}</button>
        <button type="button" class="chip-btn" data-template-action="duplicate:${esc(tpl.id)}">${esc(st('duplicate'))}</button>
        <button type="button" class="chip-btn danger" data-template-action="delete:${esc(tpl.id)}">${esc(st('delete'))}</button>
      </div>
    </div>`;
  }
  function renderTrainerTemplates(el) {
    const templates = content.data.templates;
    el.innerHTML = `<div class="workspace-header"><div><h1>${esc(st('templates'))}</h1><p>${esc(st('sample'))}</p></div>
      <button type="button" class="chip-btn" data-template-action="create">${esc(st('createTemplate'))}</button></div>
      <div class="entry-list">${templates.length ? templates.map(templateRow).join('') : `<p class="empty">${esc(st('empty'))}</p>`}</div>`;
  }

  function renderBusinessDashboard(el) {
    const profile = content.data.profile;
    el.innerHTML = `<div class="workspace-header">
        <div><div class="workspace-header-meta">
          <span class="badge badge-business">${esc(PLANS.business.name)}</span>
          ${profile.verified ? `<span class="badge badge-verified">${esc(st('verifiedGym'))}</span>` : ''}
        </div><h1>${esc(profile.name)} — ${esc(profile.city)}</h1></div>
        <button type="button" class="chip-btn" data-nav="/business/profile">${esc(st('editGym'))}</button>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><strong>1,284</strong><span>${esc(st('activeUsers'))}</span></div>
        <div class="stat-card"><strong>7,840</strong><span>${esc(st('workoutsThisMonth'))}</span></div>
        <div class="stat-card"><strong>42</strong><span>${esc(st('equipmentStat'))}</span></div>
        <div class="stat-card"><strong>8</strong><span>${esc(st('trainersStat'))}</span></div>
        <div class="stat-card"><strong>4,932</strong><span>${esc(st('profileViews'))}</span></div>
        <div class="stat-card"><strong>3.4</strong><span>${esc(st('avgWeeklyWorkouts'))}</span></div>
      </div>
      <p class="mock-note">${esc(st('demoDataNote'))}</p>
      <div class="workspace-section"><div class="workspace-section-heading"><h2>${esc(st('quickActions'))}</h2></div>
        <div class="quick-actions">
          <button type="button" data-nav="/business/equipment">${esc(st('addEquipment'))}</button>
          <button type="button" data-nav="/business/trainers">${esc(st('addTrainer'))}</button>
          <button type="button" data-nav="/business/promotions">${esc(st('createPromotion'))}</button>
        </div></div>`;
  }
  function renderBusinessProfile(el) {
    const profile = content.data.profile;
    el.innerHTML = `<div class="workspace-header"><div><h1>${esc(st('gymProfile'))}</h1><p>${esc(st('sample'))}</p></div>
      <button type="button" class="chip-btn" data-mock-action>${esc(st('previewPublic'))}</button></div>
      <form class="workspace-form workspace-card" id="profile-form">
        <label>${esc(st('gymName'))}<input name="name" value="${esc(profile.name)}" maxlength="80"></label>
        <label>${esc(st('address'))}<input name="address" value="${esc(profile.address)}" maxlength="160"></label>
        <label>${esc(st('hours'))}<input name="hours" value="${esc(profile.hours)}" maxlength="160"></label>
        <label>${esc(st('phone'))}<input name="phone" value="${esc(profile.phone)}" maxlength="40"></label>
        <label>${esc(st('website'))}<input name="website" value="${esc(profile.website)}" maxlength="160"></label>
        <label>${esc(st('floorsLabel'))}<input name="floors" type="number" min="1" max="20" value="${profile.floors}"></label>
        <label class="full">${esc(st('description'))}<textarea name="description" maxlength="400">${esc(profile.description)}</textarea></label>
        <label>Instagram<input name="instagram" value="${esc(profile.instagram)}" maxlength="60"></label>
        <label>Facebook<input name="facebook" value="${esc(profile.facebook)}" maxlength="60"></label>
        <label class="full">${esc(st('amenities'))}<div class="amenity-tags">${profile.amenities.map(a => `<span>${esc(a)}</span>`).join('')}</div></label>
        <label class="full">${esc(st('photos'))}<span class="mock-note">${esc(st('photosPlaceholder'))}</span></label>
        <label class="full"><button class="chip-btn" type="submit">${esc(st('saveChanges'))}</button></label>
      </form>`;
    el.querySelector('#profile-form').addEventListener('submit', event => {
      event.preventDefault();
      const f = event.currentTarget;
      content.updateProfile({ name: f.elements.name.value, address: f.elements.address.value, hours: f.elements.hours.value, phone: f.elements.phone.value, website: f.elements.website.value, floors: Number(f.elements.floors.value) || 1, description: f.elements.description.value, instagram: f.elements.instagram.value, facebook: f.elements.facebook.value });
      toast(st('updated')); render();
    });
  }
  function renderBusinessEquipment(el) {
    const snap = getWorkout();
    const gymData = workspace.gym(snap.gym.id);
    el.innerHTML = `<div class="workspace-header"><div><h1>${esc(st('equipment'))}</h1><p>${esc(st('sample'))}</p></div>
      <button type="button" class="chip-btn" data-mock-action>${esc(st('addEquipment'))}</button></div>
      <div class="equipment-grid">${snap.equipment.map(e => {
        const m = machine(e), inMaint = gymData.maintenance.includes(e.id);
        return `<div class="workspace-card">
          <strong>${esc(m.name)}</strong>
          <p class="mock-note">${esc(st('zone'))}: ${esc(zoneName(m.zone))} · ${esc(st('floor'))}: ${e.floor}</p>
          <label class="account-field"><span>${esc(st('status'))}</span>
            <select data-maintenance="${esc(e.id)}">
              <option value="ready" ${!inMaint ? 'selected' : ''}>${esc(st('ready'))}</option>
              <option value="maintenance" ${inMaint ? 'selected' : ''}>${esc(st('maintenance'))}</option>
            </select>
          </label>
        </div>`;
      }).join('')}</div>`;
  }
  function renderBusinessLayout(el) {
    const snap = getWorkout();
    const profile = content.data.profile;
    el.innerHTML = `<div class="workspace-header"><div><div class="workspace-header-meta"><span class="badge badge-business">${esc(profile.name)} — ${esc(profile.city)}</span></div><h1>${esc(st('layout'))} · ${esc(st('floor'))} 1</h1></div>
        <button type="button" class="chip-btn" data-mock-action>${esc(st('editLayout'))}</button></div>
      <div class="layout-frame" id="layout-frame"></div>
      <div class="layout-stats">
        <div class="stat-card"><strong>${snap.equipment.length}</strong><span>${esc(st('machines'))}</span></div>
        <div class="stat-card"><strong>${snap.gym.floors}</strong><span>${esc(st('floors'))}</span></div>
        <div class="stat-card"><strong>${esc(st('layoutUpToDate'))}</strong><span>${esc(st('layoutStatus'))}</span></div>
      </div>
      <div class="quick-actions" style="margin-top:14px">
        <button type="button" data-mock-action>${esc(st('addZone'))}</button>
        <button type="button" data-mock-action>${esc(st('switchFloor'))}</button>
        <button type="button" data-nav="/business/equipment">${esc(st('addEquipment'))}</button>
      </div>`;
    embedMain(el.querySelector('#layout-frame'));
  }
  function renderBusinessTrainers(el) {
    const gymId = getWorkout().gym.id;
    const rows = workspace.rows('trainers', gymId);
    el.innerHTML = `<div class="workspace-header"><div><h1>${esc(st('trainers'))}</h1><p>${esc(st('sample'))}</p></div></div>
      <form class="workspace-form workspace-card" id="add-form" style="margin-bottom:20px">
        <label>${esc(st('name'))}<input name="name" required maxlength="60" autocomplete="off"></label>
        <label>${esc(st('note'))}<input name="note" maxlength="200" autocomplete="off"></label>
        <label class="full"><button class="chip-btn" type="submit">${esc(st('addTrainer'))}</button></label>
      </form>
      <div class="entry-list">${rows.length ? rows.map(row => {
        const meta = `<div>${esc(st('sessions'))}<b>${demoNumber(row.id, 4, 40)}</b></div><div>${esc(st('profileStatus'))}<b>${esc(st('complete'))}</b></div>`;
        return personEntry(row, 'trainers', gymId, demoPick(row.id, SPECIALTIES), meta);
      }).join('') : `<p class="empty">${esc(st('empty'))}</p>`}</div>`;
    bindAddForm(el.querySelector('#add-form'), 'trainers', gymId);
  }
  function renderBusinessAnalytics(el) {
    const snap = getWorkout();
    const gymData = workspace.gym(snap.gym.id);
    el.innerHTML = `<div class="workspace-header"><div><h1>${esc(st('analytics'))}</h1></div></div>
      <div class="stat-grid">
        <div class="stat-card"><strong>1,284</strong><span>${esc(st('activeUsers'))}</span></div>
        <div class="stat-card"><strong>7,840</strong><span>${esc(st('workoutsCompleted'))}</span></div>
        <div class="stat-card"><strong>68%</strong><span>${esc(st('returnUsers'))}</span></div>
        <div class="stat-card"><strong>146</strong><span>${esc(st('newUsers'))}</span></div>
        <div class="stat-card"><strong>${snap.equipment.length}</strong><span>${esc(st('equipmentUsage'))}</span></div>
        <div class="stat-card"><strong>${gymData.trainers.filter(row => row.active).length}</strong><span>${esc(st('trainersStat'))}</span></div>
      </div>
      <p class="mock-note">${esc(st('demoDataNote'))} · ${esc(st('peakHours'))}: 17:00–20:00</p>
      <div class="workspace-section"><div class="workspace-section-heading"><h2>${esc(st('mostUsedMachines'))}</h2></div>
        <div class="entry-list">${snap.equipment.slice(0, 5).map(e => { const m = machine(e), usage = demoNumber(e.id, 40, 98); return `<div class="entry-card"><div class="entry-main"><strong>${esc(m.name)}</strong></div><span class="progress-mini"><i style="width:${usage}%"></i></span><div class="entry-meta"><b>${usage}%</b></div></div>`; }).join('')}</div></div>
      <div class="workspace-section"><div class="workspace-section-heading"><h2>${esc(st('popularPlans'))}</h2></div>
        <div class="entry-list">${(snap.gym.presets || []).slice(0, 3).map(p => `<div class="entry-card"><div class="entry-main"><strong>${esc(preset(p).name)}</strong></div></div>`).join('')}</div></div>`;
  }
  function renderBusinessPromotions(el) {
    const gymId = getWorkout().gym.id;
    const rows = workspace.rows('promotions', gymId);
    el.innerHTML = `<div class="workspace-header"><div><h1>${esc(st('promotions'))}</h1><p>${esc(st('sample'))}</p></div></div>
      <form class="workspace-form workspace-card" id="add-form" style="margin-bottom:20px">
        <label>${esc(st('promoName'))}<input name="name" required maxlength="60" autocomplete="off"></label>
        <label>${esc(st('cta'))}<input name="note" maxlength="200" autocomplete="off"></label>
        <label class="full"><button class="chip-btn" type="submit">${esc(st('createPromotion'))}</button></label>
      </form>
      <div class="entry-list">${rows.length ? rows.map(row => {
        const impressions = demoNumber(row.id, 120, 4200), clicksN = demoNumber(row.id + 'c', 4, 260);
        return `<div class="entry-card">
          <div class="entry-main"><strong>${esc(row.name)}</strong><p>${esc(row.note) || esc(st('cta'))}</p></div>
          <div class="entry-meta">
            <div>${esc(st('impressions'))}<b>${impressions.toLocaleString()}</b></div>
            <div>${esc(st('clicks'))}<b>${clicksN.toLocaleString()}</b></div>
            <div>${esc(st('status'))}<b>${row.active ? esc(st('active')) : esc(st('paused'))}</b></div>
          </div>
          <div class="entry-actions">
            <select data-entry-status="${esc(row.id)}" data-entry-kind="promotions" data-entry-gym="${esc(gymId)}">
              <option value="active" ${row.active ? 'selected' : ''}>${esc(st('active'))}</option>
              <option value="paused" ${!row.active ? 'selected' : ''}>${esc(st('paused'))}</option>
            </select>
            <button type="button" class="chip-btn danger" data-remove-entry="${esc(row.id)}" data-entry-kind="promotions" data-entry-gym="${esc(gymId)}">${esc(st('delete'))}</button>
          </div>
        </div>`;
      }).join('') : `<p class="empty">${esc(st('empty'))}</p>`}</div>`;
    bindAddForm(el.querySelector('#add-form'), 'promotions', gymId);
  }

  function renderTrainerShell(seg, plan) {
    const page = ['clients', 'plans', 'templates', 'account'].includes(seg[1]) ? seg[1] : 'overview';
    renderSidebarShell({
      brandTitle: st('trainerTitle'), brandSubtitle: st('welcomeBack'),
      primaryNav: [
        { path: '/trainer', label: st('overview'), active: page === 'overview' },
        { path: '/trainer/clients', label: st('clients'), active: page === 'clients' },
        { path: '/trainer/plans', label: st('plans'), active: page === 'plans' },
        { path: '/trainer/templates', label: st('templates'), active: page === 'templates' },
        { path: '/trainer/my-workout', label: st('myWorkout'), active: false },
      ],
      secondaryNav: [{ path: '/trainer/account', label: st('navAccount'), active: page === 'account' }],
      backLabel: st('backToGymFlow'), backPath: '/workout',
      content: el => {
        if (page === 'clients') renderTrainerClients(el);
        else if (page === 'plans') renderTrainerPlans(el);
        else if (page === 'templates') renderTrainerTemplates(el);
        else if (page === 'account') renderAccountEmbedded(el, seg[2], '/trainer/account', plan);
        else renderTrainerOverview(el, plan);
      },
    });
  }
  function renderBusinessShell(seg, plan) {
    const page = ['profile', 'equipment', 'layout', 'trainers', 'analytics', 'promotions', 'account'].includes(seg[1]) ? seg[1] : 'dashboard';
    renderSidebarShell({
      brandTitle: st('businessTitle'), brandSubtitle: content.data.profile.name,
      primaryNav: [
        { path: '/business/dashboard', label: st('dashboard'), active: page === 'dashboard' },
        { path: '/business/profile', label: st('gymProfile'), active: page === 'profile' },
        { path: '/business/equipment', label: st('equipment'), active: page === 'equipment' },
        { path: '/business/layout', label: st('layout'), active: page === 'layout' },
        { path: '/business/trainers', label: st('trainers'), active: page === 'trainers' },
        { path: '/business/analytics', label: st('analytics'), active: page === 'analytics' },
        { path: '/business/promotions', label: st('promotions'), active: page === 'promotions' },
      ],
      secondaryNav: [{ path: '/business/account', label: st('navAccount'), active: page === 'account' }],
      backLabel: st('backToGymFlow'), backPath: '/workout',
      content: el => {
        if (page === 'profile') renderBusinessProfile(el);
        else if (page === 'equipment') renderBusinessEquipment(el);
        else if (page === 'layout') renderBusinessLayout(el);
        else if (page === 'trainers') renderBusinessTrainers(el);
        else if (page === 'analytics') renderBusinessAnalytics(el);
        else if (page === 'promotions') renderBusinessPromotions(el);
        else if (page === 'account') renderAccountEmbedded(el, seg[2], '/business/account', plan);
        else renderBusinessDashboard(el);
      },
    });
  }

  function computeShell(route) {
    const seg = route.segments;
    if (seg[0] === 'trainer' && seg[1] === 'my-workout') return { kind: 'gym', context: 'trainer' };
    if (!seg[0] || ['workout', 'gyms', 'progress', 'exercises'].includes(seg[0])) return { kind: 'gym', context: 'consumer' };
    return { kind: 'workspace' };
  }
  function renderWorkspaceRoot(route, plan) {
    restoreMain();
    const seg = route.segments;
    if (seg[0] === 'trainer') renderTrainerShell(seg, plan);
    else if (seg[0] === 'business') renderBusinessShell(seg, plan);
    else renderAccountStandalone(seg, plan);
  }

  let lastSideEffectPath = null;
  function render() {
    const route = getRoute();
    const { plan } = subscription.getSnapshot();
    const cap = requiredCapability(route.segments);
    const blocked = Boolean(cap) && !subscription.can(cap);
    const shell = blocked ? { kind: 'workspace' } : computeShell(route);
    document.body.dataset.shell = shell.kind;
    renderDevSelect(plan);
    if (shell.kind === 'gym') {
      restoreMain();
      renderShellBar(route, shell.context);
      if (route.path !== lastSideEffectPath) { lastSideEffectPath = route.path; handleGymSideEffects(route.segments[0] || 'workout'); }
      else if (route.segments[0] === 'progress' && progressDialog.open) renderProgressDialog();
    } else {
      lastSideEffectPath = null;
      if (progressDialog.open) progressDialog.close();
      if (blocked) { restoreMain(); renderAccessRequired(cap); }
      else renderWorkspaceRoot(route, plan);
    }
  }

  document.addEventListener('click', event => {
    const navEl = event.target.closest('[data-nav]');
    if (navEl) { navigate(navEl.dataset.nav); return; }
    const planEl = event.target.closest('[data-plan]');
    if (planEl) { subscription.setPlan(planEl.dataset.plan); if (planEl.hasAttribute('data-plan-navigate')) navigate(defaultRouteForPlan(planEl.dataset.plan)); return; }
    if (event.target.closest('[data-close-progress]')) { progressDialog.close(); navigate('/workout'); return; }
    if (event.target.closest('[data-export]')) { doExport(); return; }
    if (event.target.closest('[data-reset-workspace]')) {
      if (confirm(st('confirmReset'))) { workspace.reset(); content.reset(); toast(st('updated')); render(); }
      return;
    }
    const removeEl = event.target.closest('[data-remove-entry]');
    if (removeEl) {
      const rows = workspace.rows(removeEl.dataset.entryKind, removeEl.dataset.entryGym);
      const index = rows.findIndex(row => row.id === removeEl.dataset.removeEntry);
      if (index >= 0) rows.splice(index, 1);
      workspace.save(); toast(st('removed')); render();
      return;
    }
    const planAction = event.target.closest('[data-plan-action]');
    if (planAction) {
      const [action, id] = planAction.dataset.planAction.split(':');
      if (action === 'create') { content.addPlan(); toast(st('created')); }
      else if (action === 'duplicate') { content.duplicatePlan(id); toast(st('created')); }
      else if (action === 'delete') { content.removePlan(id); toast(st('removed')); }
      render();
      return;
    }
    const templateAction = event.target.closest('[data-template-action]');
    if (templateAction) {
      const [action, id] = templateAction.dataset.templateAction.split(':');
      if (action === 'create') { content.addTemplate(); toast(st('created')); }
      else if (action === 'duplicate') { content.duplicateTemplate(id); toast(st('created')); }
      else if (action === 'delete') { content.removeTemplate(id); toast(st('removed')); }
      render();
      return;
    }
    if (event.target.closest('[data-mock-action]')) { toast(st('mockActionNote')); return; }
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (target.name === 'theme-pref') { if (document.documentElement.dataset.theme !== target.value) document.querySelector('#theme')?.click(); return; }
    if (target.name === 'lang-pref') { if (getLanguage() !== target.value) document.querySelector('#language')?.click(); return; }
    if (target.dataset.notif) { const prefs = loadNotifPrefs(); prefs[target.dataset.notif] = target.checked; try { localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)); } catch {} return; }
    if (target.dataset.entryStatus) {
      const row = workspace.rows(target.dataset.entryKind, target.dataset.entryGym).find(r => r.id === target.dataset.entryStatus);
      if (row) row.active = target.value === 'active';
      workspace.save(); toast(st('updated')); render();
      return;
    }
    if (target.dataset.maintenance) {
      const gymData = workspace.gym(getWorkout().gym.id);
      gymData.maintenance = gymData.maintenance.filter(id => id !== target.dataset.maintenance);
      if (target.value === 'maintenance') gymData.maintenance.push(target.dataset.maintenance);
      workspace.save(); toast(st('updated')); render();
    }
  });

  onRoute(render);
  subscription.subscribe(({ plan }) => {
    const cap = requiredCapability(getRoute().segments);
    if (cap && !subscription.can(cap)) navigate(defaultRouteForPlan(plan));
    else render();
  });
  render();
  return { refresh: render };
}
