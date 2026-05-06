// Vista principal: monta login o app según sesión
(function(){
  const root = () => document.getElementById('app-root');

  const MENU = [
    { label:'General', items:[
      { id:'dashboard',     label:'Dashboard',         icon:'home' },
      { id:'search',        label:'Buscar',            icon:'search' },
      { id:'notifications', label:'Notificaciones',    icon:'bell' },
    ]},
    { label:'Almacén', items:[
      { id:'inventory',   label:'Inventario',         icon:'package' },
      { id:'assets',      label:'Gestión de Activos', icon:'boxes' },
      { id:'categories',  label:'Categorías',         icon:'tag' },
      { id:'locations',   label:'Ubicaciones',        icon:'map-pin' },
      { id:'movements',   label:'Gestión de Insumos', icon:'layers' },
      { id:'maintenance', label:'Mantenimientos',     icon:'wrench' },
      { id:'add-item',    label:'Agregar Artículo',   icon:'plus', hidden:true },
      { id:'new-purchase', label:'Nueva Orden de Compra', icon:'file-plus', hidden:true },
    ]},
    { label:'Compras', items:[
      { id:'suppliers',  label:'Proveedores',         icon:'truck' },
      { id:'purchases',  label:'Órdenes de Compra',   icon:'shopping-cart' },
      { id:'approvals',  label:'Aprobaciones',        icon:'check-square' },
    ]},
    { label:'Finanzas', items:[
      { id:'treasury',   label:'Tesorería',           icon:'landmark' },
    ]},
    { label:'Personal', items:[
      { id:'staff',      label:'Personal',            icon:'users' },
    ]},
    { label:'Reportes', items:[
      { id:'reports',    label:'Reportes',            icon:'bar-chart-3' },
      { id:'history',    label:'Historial',           icon:'history' },
      { id:'documents',  label:'Documentos',          icon:'file-text' },
    ]},
    { label:'Configuración', items:[
      { id:'users',      label:'Usuarios y Roles',    icon:'shield-check' },
      { id:'settings',   label:'Configuración',       icon:'settings' },
    ]},
  ];

  function renderShell(user) {
    root().innerHTML = `
      <header class="h-16 border-b border-border bg-white sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
        <div class="flex items-center gap-3">
          <button id="menu-toggle" class="md:hidden btn btn-ghost p-2"><i data-lucide="menu"></i></button>
          <div class="w-9 h-9 rounded-lg bg-brand-gradient flex items-center justify-center text-white">
            <i data-lucide="school"></i>
          </div>
          <div class="leading-tight">
            <div class="font-bold">Católica <span class="text-primary">School</span></div>
            <div class="text-xs text-muted-foreground">Sistema de Inventario</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden sm:block text-right">
            <div class="text-sm font-semibold">${user.name}</div>
            <div class="text-xs text-muted-foreground capitalize">${user.role.replace('_',' ')}</div>
          </div>
          <div class="w-9 h-9 rounded-full bg-brand-gradient text-white flex items-center justify-center font-semibold">
            ${(user.name||'?').charAt(0).toUpperCase()}
          </div>
          <button id="logout-btn" class="btn btn-outline" title="Cerrar sesión"><i data-lucide="log-out"></i><span class="hidden md:inline">Salir</span></button>
        </div>
      </header>
      <div class="flex">
        <aside id="sidebar" class="w-64 shrink-0 bg-gradient-to-b from-primary/5 via-secondary/5 to-accent/5 border-r border-border h-[calc(100vh-4rem)] overflow-y-auto p-3">
          <nav id="sidebar-nav" class="space-y-5"></nav>
        </aside>
        <main id="view" class="flex-1 p-4 md:p-6 min-w-0"></main>
      </div>
    `;
    lucide.createIcons();
    document.getElementById('logout-btn').onclick = ()=> Auth.logout();
    document.getElementById('menu-toggle').onclick = ()=> document.getElementById('sidebar').classList.toggle('open');
    renderSidebar(user);
  }

  function renderSidebar(user) {
    const nav = document.getElementById('sidebar-nav');
    const groups = MENU
      .map(g => ({...g, items: g.items.filter(i => canAccess(user.role, i.id))}))
      .filter(g => g.items.length);

    nav.innerHTML = groups.map(g => `
      <div>
        <div class="sidebar-group-title">${g.label}</div>
        <div class="space-y-1">
          ${g.items.map(i => {
            const hasBadge = i.id === 'notifications' && window._unreadCount > 0;
            return `
            <a class="sidebar-link ${Router.current===i.id?'active':''}" data-section="${i.id}">
              <div class="relative">
                <i data-lucide="${i.icon}" class="w-4 h-4"></i>
                ${hasBadge ? `<span class="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white badge-pulse">${window._unreadCount}</span>` : ''}
              </div>
              <span>${i.label}</span>
            </a>`;
          }).join('')}
        </div>
      </div>`).join('');
    lucide.createIcons();
    nav.querySelectorAll('[data-section]').forEach(a => {
      a.onclick = ()=> { Router.go(a.dataset.section); document.getElementById('sidebar').classList.remove('open'); };
    });
  }

  window._unreadCount = 0;
  async function checkNotifications() {
    const user = Auth.getUser();
    if (!user) return;
    try {
        const resp = await fetch(`api/notifications.php?usuario_id=${user.id}`).then(r => r.json());
        const unread = (resp.notifications || []).filter(n => n.leido == 0).length;
        if (unread !== window._unreadCount) {
            window._unreadCount = unread;
            renderSidebar(user);
        }
    } catch (e) {}
  }

  function renderView(user, section) {
    if (section === 'notifications') {
        window._unreadCount = 0;
        renderSidebar(user);
    }
    if (!canAccess(user.role, section)) {
      document.getElementById('view').innerHTML = `
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <i data-lucide="shield-alert" class="w-12 h-12 text-destructive mb-3"></i>
          <h2 class="text-2xl font-bold mb-1">Acceso restringido</h2>
          <p class="text-muted-foreground">Tu rol no tiene permisos para ver esta sección.</p>
        </div>`;
      lucide.createIcons();
      return;
    }
    const fn = window.Views && window.Views[section];
    document.getElementById('view').innerHTML = fn ? fn(user) : `<div class="card p-10 text-center text-muted-foreground">Sección "${section}" en construcción.</div>`;
    lucide.createIcons();
    if (fn && fn.afterMount) fn.afterMount(user);
  }

  function boot() {
    const user = Auth.getUser();
    if (!user) {
      Views.login(onLogin => {
        // callback usado por la vista login
      });
      return;
    }
    renderShell(user);
    checkNotifications();
    setInterval(checkNotifications, 30000); // Cada 30 seg
    Router.onChange(s => { renderView(user, s); renderSidebar(user); });
    Router.init();
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.App = { boot, renderShell, renderView };
})();
