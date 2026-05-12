window.Router = {
  current: 'dashboard',
  listeners: [],
  init() {
    window.addEventListener('hashchange', ()=> this._emit());
    this._emit();
  },
  go(section, params = null) {
    this.params = params;
    if (location.hash === '#' + section) {
      // Misma sección: forzar recarga llamando emit directamente
      this._emit();
    } else {
      location.hash = section;
    }
  },
  onChange(fn) { this.listeners.push(fn); },
  _emit() {
    const s = (location.hash || '#dashboard').replace('#','');
    this.current = s || 'dashboard';
    this.listeners.forEach(fn => fn(this.current, this.params));
    setTimeout(() => { if (this.current === s) this.params = null; }, 500);
  }
};
