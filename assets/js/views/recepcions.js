// assets/js/views/recepcions.js — Recepción de Mercaderías

async function loadRecepcions() {
  const tbody = document.getElementById('recepcions-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/purchases.php?approved_only=1').then(r => r.json());
    const all = data.purchases || [];
    if (all.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay órdenes aprobadas pendientes de recepción.</td></tr>';
      return;
    }
    tbody.innerHTML = all.map(p => `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${p.numero_oc}</td>
        <td>
          <div class="font-bold text-sm">${p.proveedor_nombre}</div>
          <div class="text-[10px] text-muted-foreground uppercase">${p.area_nombre || 'Sin área'}</div>
        </td>
        <td class="text-xs">${p.fecha || '—'}</td>
        <td><span class="badge ${p.estado === 'Completada' ? 'badge-blue' : 'badge-green'}">${p.estado === 'Completada' ? 'Recibido' : 'Por Recibir'}</span></td>
        <td class="text-right">
          ${p.estado === 'Aprobada' ? `
            <button class="btn btn-primary btn-sm" onclick="processRecepcion(${p.id})"><i data-lucide="package-check" class="w-4 h-4 mr-1"></i>Recibir Todo</button>
          ` : `
            <span class="text-xs text-muted-foreground font-medium italic">Completado</span>
          `}
        </td>
      </tr>`).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>'; }
}

window.processRecepcion = async function(id) {
    UI.modal({
        title: 'Confirmar Recepción de Mercadería',
        body: `<p>¿Confirmas que has recibido todos los ítems de esta orden y que están en buen estado? Esto actualizará el stock automáticamente.</p>`,
        confirmText: 'Sí, recibir todo',
        onConfirm: async () => {
            UI.loading('Procesando ingreso a almacén...');
            const res = await fetch('api/recepcions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchase_id: id })
            }).then(r => r.json());
            UI.stopLoading();
            if (res.ok) { UI.toast('Mercadería ingresada al inventario', 'success'); loadRecepcions(); }
            else UI.toast('Error: ' + res.error, 'error');
        }
    });
};

window.Views.recepcions = function() {
  return `
    ${UI.pageHeader('Recepción de Almacén', 'Control de ingreso de mercadería y equipos')}
    <div class="card overflow-hidden">
      <table class="data">
        <thead>
          <tr><th>N° OC/OS</th><th>Proveedor / Área</th><th>Fecha</th><th>Estado</th><th class="text-right">Acciones</th></tr>
        </thead>
        <tbody id="recepcions-table-body">
          <tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando...</td></tr>
        </tbody>
      </table>
    </div>`;
};

window.Views.recepcions.afterMount = loadRecepcions;
