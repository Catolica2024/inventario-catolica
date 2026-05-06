window.Views = window.Views || {};
window.Views.search = function() {
  return `
    ${UI.pageHeader('Buscador global','Encuentra activos, ítems, proveedores o personal')}
    <div class="card p-5">
      <div class="relative">
        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
        <input class="input pl-12 h-12 text-base" placeholder="Escribe para buscar en todo el sistema..." />
      </div>
      <div class="flex flex-wrap gap-2 mt-4">
        ${['Todos','Activos','Ítems','Proveedores','Ubicaciones','Personal','Compras'].map((t,i)=>`
          <button class="badge ${i===0?'badge-blue':'badge-gray'} px-3 py-1.5 text-xs">${t}</button>`).join('')}
      </div>
    </div>
    <div class="mt-4 card p-10 text-center text-muted-foreground">
      <i data-lucide="search" class="mx-auto mb-2"></i>
      Empieza a escribir para ver resultados.
    </div>`;
};
