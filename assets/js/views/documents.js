window.Views = window.Views || {};
window.Views.documents = function() {
  const docs = [
    ['Manual_Inventario_2026.pdf','PDF','1.2 MB','2026-04-12'],
    ['Politica_Compras.pdf','PDF','420 KB','2026-03-28'],
    ['Catalogo_Proveedores.xlsx','XLSX','85 KB','2026-04-05'],
  ];
  return `
    ${UI.pageHeader('Documentos','Archivos y manuales del sistema',`
      <button class="btn btn-primary"><i data-lucide="upload"></i>Subir documento</button>
    `)}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${docs.map(([n,t,s,d])=>`
        <div class="card p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="badge badge-blue w-10 h-10 rounded-xl !p-0 flex items-center justify-center"><i data-lucide="file-text"></i></div>
            <span class="badge badge-gray">${t}</span>
          </div>
          <div class="font-semibold truncate">${n}</div>
          <div class="text-xs text-muted-foreground mt-0.5">${s} · ${d}</div>
          <div class="flex gap-2 mt-4">
            <button class="btn btn-outline flex-1"><i data-lucide="eye" class="w-4 h-4"></i>Ver</button>
            <button class="btn btn-outline flex-1"><i data-lucide="download" class="w-4 h-4"></i>Descargar</button>
          </div>
        </div>`).join('')}
    </div>`;
};
