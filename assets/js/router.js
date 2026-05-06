// Router por hash (#dashboard, #inventory, ...)
window.Router = {
  current: 'dashboard',
  listeners: [],
  init() {
    window.addEventListener('hashchange', ()=> this._emit());
    this._emit();
  },
  go(section) { location.hash = section; },
  onChange(fn) { this.listeners.push(fn); },
  _emit() {
    const s = (location.hash || '#dashboard').replace('#','');
    this.current = s || 'dashboard';
    this.listeners.forEach(fn => fn(this.current));
  }
};
