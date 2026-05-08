// Helpers de UI reutilizables
window.UI = {
  toast(message, type='info') {
    const t = document.createElement('div');
    t.className = `toast ${type==='success'?'toast-success':type==='error'?'toast-error':''} fade-in`;
    t.textContent = message;
    document.getElementById('toast').appendChild(t);
    setTimeout(()=> t.remove(), 2800);
  },
  modal({title, body, onConfirm, confirmText='Guardar', extraButtons=[]}) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop fade-in';
    wrap.innerHTML = `
      <div class="modal">
        <div class="flex items-center justify-between p-5 border-b border-border">
          <h3 class="text-lg font-bold">${title}</h3>
          <button class="btn btn-ghost" data-close><i data-lucide="x"></i></button>
        </div>
        <div class="p-5">${body}</div>
        <div class="flex justify-end gap-2 p-4 border-t border-border bg-muted/40">
          <div class="flex-1 flex gap-2">
            ${extraButtons.map((b, i) => `<button class="btn ${b.class || 'btn-outline'}" data-extra="${i}">${b.icon ? `<i data-lucide="${b.icon}"></i>` : ''}${b.text}</button>`).join('')}
          </div>
          ${!arguments[0].hideCancel ? '<button class="btn btn-outline" data-close>Cancelar</button>' : ''}
          ${!arguments[0].hideConfirm ? `<button class="btn btn-primary" data-confirm>${confirmText}</button>` : ''}
        </div>
      </div>`;
    document.body.appendChild(wrap);
    lucide.createIcons();
    const close = ()=> wrap.remove();
    wrap.querySelectorAll('[data-close]').forEach(b=> b.onclick = close);
    const btnConfirm = wrap.querySelector('[data-confirm]');
    if (btnConfirm) btnConfirm.onclick = ()=> { onConfirm && onConfirm(wrap); close(); };
    extraButtons.forEach((b, i) => {
      const el = wrap.querySelector(`[data-extra="${i}"]`);
      if (el) el.onclick = () => b.onClick && b.onClick(wrap);
    });
    wrap.addEventListener('click', e=> { if(e.target===wrap) close(); });
  },
  pageHeader(title, subtitle, actionsHTML='') {
    return `
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">${title}</h1>
          ${subtitle?`<p class="text-sm text-muted-foreground mt-1">${subtitle}</p>`:''}
        </div>
        <div class="flex flex-wrap gap-2">${actionsHTML}</div>
      </div>`;
  },
  emptyState(text='Sin datos disponibles') {
    return `<div class="card p-10 text-center text-muted-foreground"><i data-lucide="inbox" class="mx-auto mb-2"></i><div>${text}</div></div>`;
  },
  loading(message = 'Procesando...') {
    let loader = document.getElementById('global-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.className = 'loading-overlay fade-in';
      loader.innerHTML = `
        <div class="spinner"></div>
        <p class="text-sm font-bold text-primary animate-pulse">${message}</p>
      `;
      document.body.appendChild(loader);
    } else {
      loader.querySelector('p').textContent = message;
    }
  },
  stopLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.remove();
  }
};
