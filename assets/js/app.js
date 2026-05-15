// Vista principal: monta login o app según sesión
(function(){
  const root = () => document.getElementById('app-root');

  const MENU = [
    { label:'General', items:[
      { id:'dashboard',     label:'Dashboard',         icon:'home' },
      { id:'notifications', label:'Notificaciones',    icon:'bell' },
    ]},
    { label:'Inventario', items:[
      { id:'registration',   label:'Registrar Bien',      icon:'plus-circle' },
      { id:'inventory',      label:'Inventario General',  icon:'archive' },
      { id:'categories-inv', label:'Categorías',          icon:'tag' },
    ]},
    { label:'Movimientos', items:[
      { id:'assignments',    label:'Asignaciones',        icon:'user-check' },
      { id:'transfers',      label:'Traslados',           icon:'move' },
      { id:'dispatch',       label:'Despacho Insumos',    icon:'send' },
    ]},
    { label:'Mantenimientos y Reparaciones', items:[
      { id:'maintenance',    label:'Mantenimiento',       icon:'wrench' },
    ]},
    { label:'Gestión de Compras', items:[
      { id:'purchases',  label:'Órdenes de Compra',   icon:'shopping-cart' },
      { id:'recepcions', label:'Recepciones',         icon:'package-check' },
      { id:'suppliers',  label:'Proveedores',         icon:'truck' },
      { id:'rubros',     label:'Rubros de Proveedores', icon:'tags' },
    ]},
    { label:'Aprobaciones', items:[
      { id:'approvals',  label:'Aprobaciones',        icon:'check-square' },
    ]},
    { label:'Tesorería', items:[
      { id:'treasury',   label:'Tesorería / Pagos',   icon:'landmark' },
    ]},
    { label:'Organización', items:[
      { id:'staff',      label:'Personal',            icon:'users' },
      { id:'locations',  label:'Aulas y Espacios',    icon:'map-pin' },
      { id:'areas',      label:'Áreas / Niveles',     icon:'building-2' },
    ]},
    { label:'Configuración', items:[
      { id:'users',      label:'Usuarios del Sistema', icon:'shield-check' },
      { id:'settings',   label:'Configuración',       icon:'settings' },
    ]},
  ];

  function renderShell(user) {
    root().innerHTML = `
      <div id="app-shell" class="min-h-screen flex flex-col">
        <header class="h-16 border-b border-border bg-white sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 glass">
          <div class="flex items-center gap-4">
            <button id="menu-toggle" class="lg:hidden btn btn-ghost p-2 -ml-2"><i data-lucide="menu"></i></button>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-sm border border-border">
                <img src="assets/images/icono.png" alt="Logo" class="w-full h-full object-cover">
              </div>
              <div class="hidden sm:block leading-tight">
                <div class="font-black text-lg tracking-tight">Católica <span class="text-primary">School</span></div>
                <div class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gestión de Inventario</div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="hidden md:flex flex-col items-end leading-none">
              <div class="text-sm font-black text-foreground">${user.name}</div>
              <div class="text-[10px] font-bold text-primary uppercase tracking-tighter mt-0.5">${user.role.replace('_',' ')}</div>
            </div>
            <div class="relative group">
              <div class="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center font-black shadow-lg cursor-pointer">
                ${(user.name||'?').charAt(0).toUpperCase()}
              </div>
            </div>
            <button id="logout-btn" class="btn btn-outline p-2 md:px-4" title="Cerrar sesión">
                <i data-lucide="log-out" class="w-4 h-4"></i>
                <span class="hidden md:inline">Salir</span>
            </button>
          </div>
        </header>

        <div class="flex flex-1">
          <div id="mobile-overlay" class="mobile-overlay"></div>
          <aside id="sidebar" class="w-72 shrink-0 border-r border-border h-[calc(100vh-4rem)] lg:sticky lg:top-16 overflow-y-auto p-4 bg-white">
            <nav id="sidebar-nav" class="space-y-6"></nav>
          </aside>
          <main id="view" class="flex-1 p-4 md:p-8 min-w-0 bg-[#f8fafc]"></main>
        </div>
      </div>
    `;
    lucide.createIcons();
    
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    };

    document.getElementById('menu-toggle').onclick = toggleSidebar;
    overlay.onclick = toggleSidebar;
    document.getElementById('logout-btn').onclick = ()=> Auth.logout();
    
    renderSidebar(user);
  }

  function renderSidebar(user) {
    const nav = document.getElementById('sidebar-nav');
    const groups = MENU
      .map(g => ({...g, items: g.items.filter(i => canAccess(user, i.id))}))
      .filter(g => g.items.length);

    nav.innerHTML = groups.map(g => `
      <div>
        <div class="sidebar-group-title">${g.label}</div>
        <div class="space-y-1 mt-2">
          ${g.items.map(i => {
            const hasBadge = i.id === 'notifications' && window._unreadCount > 0;
            const active = Router.current === i.id;
            return `
            <a class="sidebar-link ${active?'active':''}" data-section="${i.id}">
              <div class="relative">
                <i data-lucide="${i.icon}" class="w-4.5 h-4.5 ${active?'text-white':'text-slate-400'}"></i>
                ${hasBadge ? `<span class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white badge-pulse">${window._unreadCount}</span>` : ''}
              </div>
              <span class="${active?'font-bold':''}">${i.label}</span>
            </a>`;
          }).join('')}
        </div>
      </div>`).join('');
    lucide.createIcons();
    
    nav.querySelectorAll('[data-section]').forEach(a => {
      a.onclick = ()=> { 
        Router.go(a.dataset.section); 
        document.getElementById('sidebar').classList.remove('open'); 
        document.getElementById('mobile-overlay').classList.remove('active');
      };
    });
  }

  window._unreadCount = 0;
  async function checkNotifications() {
    const user = Auth.getUser();
    if (!user) return;
    try {
        // Proactivamente pedir al servidor que verifique stock (solo si es admin o encargado)
        if (['admin', 'jefe_almacen'].includes(user.role)) {
            await fetch('api/notifications.php?action=check_stock');
        }

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
    if (!canAccess(user, section)) {
      document.getElementById('view').innerHTML = `
        <div class="flex flex-col items-center justify-center py-24 text-center animate-slide-up">
          <div class="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6">
            <i data-lucide="shield-alert" class="w-10 h-10 text-destructive"></i>
          </div>
          <h2 class="text-2xl font-black mb-2">Acceso restringido</h2>
          <p class="text-muted-foreground max-w-sm">Tu rol no cuenta con los permisos necesarios para acceder a esta sección.</p>
          <button class="btn btn-primary mt-8" onclick="Router.go('dashboard')">Volver al inicio</button>
        </div>`;
      lucide.createIcons();
      return;
    }
    const mainView = document.getElementById('view');
    mainView.innerHTML = `<div class="animate-slide-up h-full">Cargando...</div>`;
    
    setTimeout(() => {
        const fn = window.Views && window.Views[section];
        mainView.innerHTML = `<div class="animate-slide-up">` + (fn ? fn(user) : `<div class="card p-20 text-center text-muted-foreground font-medium italic">La sección "${section}" se encuentra bajo mantenimiento.</div>`) + `</div>`;
        lucide.createIcons();
        if (fn && fn.afterMount) fn.afterMount(user);
    }, 50);
  }

  function boot() {
    const user = Auth.getUser();
    if (!user) {
      if (Views.login) Views.login();
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
