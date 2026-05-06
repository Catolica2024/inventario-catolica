window.Views = window.Views || {};
window.Views.reports = function() {
  return `
    ${UI.pageHeader('Reportes','Genera reportes de inventario, compras y mantenimientos',`
      <button class="btn btn-outline"><i data-lucide="calendar"></i>Rango de fechas</button>
      <button class="btn btn-primary"><i data-lucide="download"></i>Exportar PDF</button>
    `)}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${[
        ['Inventario actual','Estado y valor total del stock','package','badge-blue'],
        ['Compras del mes','Costos por proveedor y categoría','shopping-cart','badge-green'],
        ['Mantenimientos','Preventivos y correctivos','wrench','badge-cyan'],
        ['Activos por ubicación','Distribución física de bienes','map-pin','badge-yellow'],
        ['Personal asignado','Activos a cargo del personal','users','badge-blue'],
        ['Movimientos de insumos','Entradas y salidas por periodo','layers','badge-cyan'],
      ].map(([t,d,i,c])=>`
        <div class="card p-5 hover:shadow-md transition-shadow cursor-pointer">
          <div class="flex items-start justify-between mb-3">
            <div class="badge ${c} w-10 h-10 rounded-xl !p-0 flex items-center justify-center"><i data-lucide="${i}"></i></div>
            <i data-lucide="arrow-up-right" class="text-muted-foreground"></i>
          </div>
          <div class="font-semibold">${t}</div>
          <div class="text-sm text-muted-foreground mt-0.5">${d}</div>
        </div>`).join('')}
    </div>`;
};
