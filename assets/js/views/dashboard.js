window.Views = window.Views || {};
window.Views.dashboard = function(user) {
  return `
    ${UI.pageHeader(`Hola, ${user.name} 👋`, 'Resumen general del inventario escolar')}
    <div id="dashboard-content">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${[1,2,3,4].map(()=>`<div class="kpi animate-pulse bg-muted h-24"></div>`).join('')}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="card p-5 lg:col-span-2 h-64 animate-pulse bg-muted"></div>
        <div class="card p-5 h-64 animate-pulse bg-muted"></div>
      </div>
    </div>`;
};

window.Views.dashboard.afterMount = async function(user) {
  const container = document.getElementById('dashboard-content');
  try {
    const resp = await fetch('api/dashboard.php');
    const data = await resp.json();

    const kpis = [
      { label:'Activos totales', value: data.kpis.activos, icon:'boxes', tint:'badge-blue' },
      { label:'Stock bajo',      value: data.kpis.stock_bajo, icon:'alert-triangle', tint:'badge-yellow' },
      { label:'Mantenimientos',  value: data.kpis.mantenimientos, icon:'wrench', tint:'badge-cyan' },
      { label:'Compras del mes', value: data.kpis.compras, icon:'shopping-cart', tint:'badge-green' },
    ];

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${kpis.map(k => `
          <div class="kpi flex items-center justify-between">
            <div>
              <div class="label">${k.label}</div>
              <div class="value">${k.value}</div>
            </div>
            <div class="badge ${k.tint} w-10 h-10 rounded-xl !p-0 flex items-center justify-center">
              <i data-lucide="${k.icon}"></i>
            </div>
          </div>`).join('')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="card p-5 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold">Items por categoría</h3>
            <span class="badge badge-gray">Distribución actual</span>
          </div>
          <div class="space-y-3">
            ${data.distribucion.length ? data.distribucion.map((c, i)=>`
              <div>
                <div class="flex justify-between text-sm mb-1"><span>${c.nombre}</span><span class="text-muted-foreground">${c.cantidad}</span></div>
                <div class="h-2 rounded-full bg-muted overflow-hidden">
                  <div class="h-full bg-primary" style="width:${Math.min(100, (c.cantidad / (data.kpis.activos || 1)) * 100)}%"></div>
                </div>
              </div>`).join('') : '<p class="text-muted-foreground text-sm">No hay categorías registradas.</p>'}
          </div>
        </div>
        <div class="card p-5">
          <h3 class="font-semibold mb-4">Mantenimientos recientes</h3>
          <ul class="space-y-3 text-sm">
            ${data.recientes.length ? data.recientes.map(m=>`
              <li class="flex items-center gap-3">
                <span class="w-2 h-2 rounded-full ${m.estado === 'Completado' ? 'bg-green-500' : 'bg-yellow-500'}"></span>
                <span class="flex-1 truncate" title="${m.item_nombre}">${m.item_nombre}</span>
                <span class="badge badge-blue text-[10px]">${m.numero_serie}</span>
              </li>`).join('') : '<li class="text-muted-foreground italic text-center py-4">Sin registros recientes</li>'}
          </ul>
        </div>
      </div>
    `;
    lucide.createIcons();

  } catch (err) {
    console.error('Error loading dashboard:', err);
    container.innerHTML = `<div class="card p-10 text-center text-destructive">Error al cargar estadísticas.</div>`;
  }
};
