// Generic themed dropdown: a trigger button plus a fixed-position portal menu
// (appended to body so it is never clipped by a scrolling ancestor). Shared by
// the plan picker, gym picker and the dev preview selector.
export function createDropdown(trigger, { onOpen, onSelect, fit = 'trigger' } = {}) {
  const menu = document.createElement('div');
  menu.className = 'plan-picker-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;
  document.body.append(menu);
  let anchorRect = null;
  function position() {
    const r = trigger.getBoundingClientRect();
    menu.style.left = Math.round(r.left) + 'px';
    menu.style.top = Math.round(r.bottom + 6) + 'px';
    if (fit === 'content') {
      menu.style.width = 'max-content';
      menu.style.minWidth = Math.round(r.width) + 'px';
      menu.style.maxWidth = Math.round(window.innerWidth - r.left - 16) + 'px';
    } else {
      menu.style.width = Math.round(r.width) + 'px';
    }
    menu.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 16) + 'px';
  }
  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    anchorRect = null;
    trigger.setAttribute('aria-expanded', 'false');
  }
  function closeIfAnchorMoved() {
    if (menu.hidden || !anchorRect) return;
    const r = trigger.getBoundingClientRect();
    if (Math.abs(r.left - anchorRect.left) > 4 || Math.abs(r.top - anchorRect.top) > 4) close();
  }
  function refresh() { if (!menu.hidden) onOpen?.(menu); }
  function open() {
    onOpen?.(menu);
    position();
    anchorRect = trigger.getBoundingClientRect();
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.onclick = () => (menu.hidden ? open() : close());
  menu.addEventListener('click', event => {
    const row = event.target.closest('[data-option]');
    if (!row || row.disabled) return;
    const value = row.dataset.option;
    close();
    trigger.focus();
    onSelect?.(value);
  });
  document.addEventListener('click', event => {
    if (menu.hidden || menu.contains(event.target) || trigger.contains(event.target)) return;
    close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) { close(); trigger.focus(); }
  });
  window.addEventListener('resize', closeIfAnchorMoved);
  window.addEventListener('scroll', closeIfAnchorMoved, true);
  return { menu, open, close, refresh };
}
