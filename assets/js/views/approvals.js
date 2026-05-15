window.Views = window.Views || {};

// ---- APROBACIONES ----
let _pendingOrders = [];
let _historyOrders = [];

async function loadApprovals() {
  try {
    const data = await fetch('api/purchases.php').then(r => r.json());
    const all = data.purchases || [];
    _pendingOrders  = all.filter(p => p.estado === 'Pendiente');
    _historyOrders  = all.filter(p => p.estado !== 'Pendiente');
    renderPending();
    renderHistory();
  } catch {
    document.getElementById('pending-list').innerHTML =
      '<p class="text-destructive text-sm">Error al cargar órdenes.</p>';
  }
}

function renderPending() {
  const el = document.getElementById('pending-list');
  if (!el) return;
  if (_pendingOrders.length === 0) {
    el.innerHTML = `
      <div class="card p-8 text-center text-muted-foreground">
        <i data-lucide="check-circle-2" class="w-10 h-10 mx-auto mb-3 text-green-500 opacity-60"></i>
        <p class="font-medium">No hay solicitudes pendientes.</p>
        <p class="text-xs mt-1">Todas las órdenes han sido procesadas.</p>
      </div>`;
    lucide.createIcons();
    return;
  }
  const user = Auth.getUser();
  el.innerHTML = _pendingOrders.map(p => {
    const isGerente = user?.role === 'gerente_general' || user?.role === 'admin';
    const isFinanzas = user?.role === 'jefe_finanzas' || user?.role === 'admin';
    
    // Solo puede aprobar si es su turno y aún no ha aprobado
    const canApprove = (isGerente && !p.aprobado_gerente) || (isFinanzas && !p.aprobado_finanzas);

    return `
    <div class="card p-5 hover:border-primary transition-colors cursor-pointer" id="oc-card-${p.id}" onclick="viewOrderDetails(${p.id})">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-base font-mono">${p.numero_oc}</span>
            <span class="badge ${p.aprobado_gerente && p.aprobado_finanzas ? 'badge-green' : 'badge-yellow'}">
              ${p.aprobado_gerente && p.aprobado_finanzas ? 'Aprobada' : 'Pendiente'}
            </span>
          </div>
          <div class="flex gap-2 mt-2">
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.aprobado_gerente ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">Gerencia</span>
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.aprobado_finanzas ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">Finanzas</span>
          </div>
          <div class="text-sm text-muted-foreground mt-2">${p.proveedor_nombre} · ${p.fecha || '—'}</div>
          <div class="text-2xl font-bold mt-2">
            S/ ${(parseFloat(p.total || 0) + parseFloat(p.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2})}
            ${p.monto_movilidad > 0 ? `<span class="text-[10px] text-orange-600 block mt-0.5 font-normal">Incluye S/ ${parseFloat(p.monto_movilidad).toFixed(2)} de movilidad</span>` : ''}
          </div>
          ${p.observaciones ? `<div class="mt-2 p-2 rounded bg-muted text-[11px] italic text-muted-foreground line-clamp-2">"${p.observaciones}"</div>` : ''}
        </div>
        <div class="flex flex-col gap-2 shrink-0" onclick="event.stopPropagation()">
          ${canApprove ? `
          <button class="btn btn-primary btn-sm" onclick="approveOrder(${p.id})">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>Aprobar
          </button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="rejectOrder(${p.id})">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>Rechazar
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

window.viewOrderDetails = async function(id) {
  try {
    const data = await fetch(`api/purchases.php?id=${id}`).then(r => r.json());
    const oc = data.purchase;
    if (!oc) return;

    const body = `
      <div class="space-y-5">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><p class="text-muted-foreground">Proveedor</p><p class="font-semibold">${oc.proveedor_nombre}</p></div>
          <div><p class="text-muted-foreground">RUC</p><p class="font-semibold">${oc.ruc || '—'}</p></div>
          <div><p class="text-muted-foreground">Área Solicitante</p><p class="font-semibold">${oc.area_solicitante || '—'}</p></div>
          <div><p class="text-muted-foreground">Fecha Requerida</p><p class="font-semibold">${oc.fecha_requerida || '—'}</p></div>
          <div>
            <p class="text-muted-foreground">Condición Pago</p>
            <p class="font-semibold">
                ${oc.condicion_pago || '—'} 
                ${oc.condicion_pago === 'Adelanto + Saldo' ? `<span class="text-[10px] text-primary">(${parseFloat(oc.adelanto_porcentaje).toFixed(0)}% / ${(100 - parseFloat(oc.adelanto_porcentaje)).toFixed(0)}%)</span>` : ''}
            </p>
          </div>
          <div><p class="text-muted-foreground">Moneda</p><p class="font-semibold">${oc.moneda || 'PEN'}</p></div>
        </div>

        ${oc.condicion_pago === 'Adelanto + Saldo' ? `
        <div class="p-3 rounded-lg bg-blue-50 border border-blue-100 flex justify-between text-xs">
            <div><span class="text-blue-700 font-bold">Adelanto (${parseFloat(oc.adelanto_porcentaje).toFixed(0)}%):</span> S/ ${parseFloat(oc.adelanto_monto).toFixed(2)}</div>
            <div><span class="text-blue-700 font-bold">Saldo:</span> S/ ${parseFloat(oc.saldo_monto).toFixed(2)}</div>
        </div>` : ''}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-muted/20 border border-dashed">
                <p class="text-[10px] text-muted-foreground uppercase font-bold mb-3 flex items-center gap-1.5">
                    <i data-lucide="shield-check" class="w-3 h-3 text-primary"></i> Aprobaciones
                </p>
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="text-[9px] text-muted-foreground uppercase font-bold mb-1">Gerencia</div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="${oc.aprobado_gerente ? 'check-circle' : 'circle'}" class="w-3.5 h-3.5 ${oc.aprobado_gerente ? 'text-green-500' : 'text-gray-300'}"></i>
                            <span class="text-xs font-bold ${oc.aprobado_gerente ? 'text-green-700' : 'text-gray-500'}">${oc.aprobado_gerente ? 'Aprobado' : 'Pendiente'}</span>
                        </div>
                    </div>
                    <div class="flex-1 border-l pl-4">
                        <div class="text-[9px] text-muted-foreground uppercase font-bold mb-1">Finanzas</div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="${oc.aprobado_finanzas ? 'check-circle' : 'circle'}" class="w-3.5 h-3.5 ${oc.aprobado_finanzas ? 'text-green-500' : 'text-gray-300'}"></i>
                            <span class="text-xs font-bold ${oc.aprobado_finanzas ? 'text-green-700' : 'text-gray-500'}">${oc.aprobado_finanzas ? 'Aprobado' : 'Pendiente'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-4 rounded-xl bg-muted/20 border border-dashed">
                <p class="text-[10px] text-muted-foreground uppercase font-bold mb-3 flex items-center gap-1.5">
                    <i data-lucide="wallet" class="w-3 h-3 text-primary"></i> Flujo de Pagos
                </p>
                <div class="flex gap-4">
                    <div class="flex-1">
                        <div class="text-[9px] text-muted-foreground uppercase font-bold mb-1">Items OC</div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="${oc.pagado == 1 ? 'check-circle' : 'clock'}" class="w-3.5 h-3.5 ${oc.pagado == 1 ? 'text-green-500' : 'text-yellow-500'}"></i>
                            <span class="text-xs font-bold ${oc.pagado == 1 ? 'text-green-700' : 'text-yellow-700'}">
                                ${oc.pagado == 1 ? 'Pagado' : oc.adelanto_pagado == 1 ? 'Adelanto' : 'Pendiente'}
                            </span>
                        </div>
                    </div>
                    ${oc.monto_movilidad > 0 ? `
                    <div class="flex-1 border-l pl-4">
                        <div class="text-[9px] text-muted-foreground uppercase font-bold mb-1">Movilidad</div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="truck" class="w-3.5 h-3.5 ${oc.mobility && oc.mobility.pagado == 1 ? 'text-orange-500' : 'text-gray-300'}"></i>
                            <span class="text-xs font-bold ${oc.mobility && oc.mobility.pagado == 1 ? 'text-orange-700' : 'text-gray-500'}">${oc.mobility && oc.mobility.pagado == 1 ? 'Pagado' : 'Pendiente'}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        ${oc.observaciones ? `
        <div class="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
          <p class="text-blue-700 font-semibold mb-1 flex items-center gap-1"><i data-lucide="info" class="w-3.5 h-3.5"></i> Observaciones / Sustento:</p>
          <p class="text-blue-900 italic">"${oc.observaciones}"</p>
        </div>` : ''}

        <div>
          <p class="text-sm font-semibold mb-2">Detalle de Ítems</p>
          <div class="max-h-60 overflow-y-auto border rounded-lg">
            <table class="w-full text-xs">
              <thead class="bg-muted sticky top-0">
                <tr><th class="p-2 text-left">Desc.</th><th class="p-2 text-center w-12">Cant.</th><th class="p-2 text-right w-20">Total</th></tr>
              </thead>
              <tbody class="divide-y">
                ${oc.items.map(it => `
                  <tr>
                    <td class="p-2">${it.descripcion}</td>
                    <td class="p-2 text-center">${it.cantidad}</td>
                    <td class="p-2 text-right font-medium">S/ ${parseFloat(it.total).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot class="bg-muted/50 font-bold border-t">
                <tr>
                  <td colspan="2" class="p-2 text-right uppercase text-[9px]">Subtotal OC</td>
                  <td class="p-2 text-right">S/ ${parseFloat(oc.total).toFixed(2)}</td>
                </tr>
                ${oc.monto_movilidad > 0 ? `
                <tr>
                  <td colspan="2" class="p-2 text-right uppercase text-[9px] text-orange-600">Movilidad (Sep.)</td>
                  <td class="p-2 text-right text-orange-600">S/ ${parseFloat(oc.monto_movilidad).toFixed(2)}</td>
                </tr>
                <tr class="bg-primary/5 text-primary">
                  <td colspan="2" class="p-2 text-right uppercase">Total Operación</td>
                  <td class="p-2 text-right font-black border-t border-primary/20">S/ ${(parseFloat(oc.total) + parseFloat(oc.monto_movilidad)).toFixed(2)}</td>
                </tr>
                ` : ''}
              </tfoot>
            </table>
          </div>
        </div>

        <div class="flex justify-between items-center border-t pt-4">
          <div class="text-muted-foreground text-xs font-mono">ID OC: ${oc.numero_oc}</div>
          <div class="text-right">
            <p class="text-xs text-muted-foreground">Total a aprobar</p>
            <p class="text-xl font-bold text-primary">S/ ${(parseFloat(oc.total) + parseFloat(oc.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2})}</p>
          </div>
        </div>
      </div>`;

    UI.modal({
      title: 'Detalle de Orden de Compra',
      body,
      confirmText: oc.estado === 'Pendiente' ? 'Cerrar' : 'Cerrar',
      hideConfirm: true // Solo ver detalles
    });
    lucide.createIcons();
  } catch (e) {
    UI.toast('No se pudo cargar el detalle', 'error');
  }
};

function renderHistory() {
  const tbody = document.getElementById('approvals-history-body');
  if (!tbody) return;
  if (_historyOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-muted-foreground">Sin historial aún.</td></tr>';
    return;
  }
  const BADGE = { 'Aprobada': 'badge-green', 'Rechazada': 'badge-red' };
  tbody.innerHTML = _historyOrders.map(p => `
    <tr>
      <td class="font-mono text-xs font-bold">${p.numero_oc}</td>
      <td>${p.proveedor_nombre}</td>
      <td class="text-xs">${p.fecha || '—'}</td>
      <td class="font-semibold">S/ ${(parseFloat(p.monto || 0) + parseFloat(p.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2})}</td>
      <td><span class="badge ${BADGE[p.estado] || 'badge-gray'}">${p.estado}</span></td>
      <td class="text-right">
        <button class="btn btn-ghost p-1.5" onclick="viewOrderDetails(${p.id})"><i data-lucide="eye" class="w-4 h-4"></i></button>
      </td>
    </tr>`).join('');
}

window.approveOrder = function(id) {
  const oc = _pendingOrders.find(p => p.id == id);
  UI.modal({
    title: 'Aprobar orden',
    body: `<p>¿Confirmas la aprobación de la orden <strong>${oc ? oc.numero_oc : ''}</strong> por <strong>S/ ${oc ? (parseFloat(oc.monto || 0) + parseFloat(oc.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2}) : ''}</strong>?</p>`,
    confirmText: 'Sí, aprobar',
    onConfirm: async () => {
      UI.loading('Registrando aprobación...');
      const user = Auth.getUser();
      const resp = await fetch('api/purchases.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve', role: user?.role })
      });
      const res = await resp.json();
      UI.stopLoading();
      if (res.ok) { UI.toast('Aprobación registrada', 'success'); loadApprovals(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.rejectOrder = function(id) {
  const oc = _pendingOrders.find(p => p.id == id);
  UI.modal({
    title: 'Rechazar orden de compra',
    body: `
      <div class="space-y-4">
        <div class="p-3 rounded-lg bg-muted text-sm">
          <div class="font-semibold">${oc ? oc.numero_oc : ''}</div>
          <div class="text-muted-foreground">${oc ? oc.proveedor_nombre : ''} · S/ ${oc ? (parseFloat(oc.monto || 0) + parseFloat(oc.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2}) : ''}</div>
        </div>
        <div>
          <label class="text-sm font-medium">Motivo del rechazo <span class="text-destructive">*</span></label>
          <textarea id="reject-motivo" class="textarea mt-1 w-full" rows="3" placeholder="Explica por qué se rechaza esta orden..."></textarea>
        </div>
      </div>`,
    confirmText: 'Confirmar rechazo',
    onConfirm: async () => {
      const motivo = document.getElementById('reject-motivo')?.value.trim();
      if (!motivo) { UI.toast('El motivo de rechazo es obligatorio', 'error'); return; }
      UI.loading('Procesando rechazo...');
      const user = Auth.getUser();
      const resp = await fetch('api/purchases.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reject', role: user?.role, motivo_rechazo: motivo })
      });
      const res = await resp.json();
      UI.stopLoading();
      if (res.ok) { UI.toast(`Orden ${oc ? oc.numero_oc : ''} rechazada`, 'success'); loadApprovals(); }
      else UI.toast('Error: ' + res.error, 'error');
    }
  });
};

window.Views.approvals = function() {
  return `
    ${UI.pageHeader('Aprobaciones', 'Revisión y resolución de órdenes de compra')}
    <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">

      <!-- Pendientes -->
      <div class="xl:col-span-3 space-y-4">
        <div class="flex items-center gap-2 mb-1">
          <i data-lucide="clock" class="w-4 h-4 text-yellow-500"></i>
          <h2 class="font-semibold">Solicitudes pendientes</h2>
        </div>
        <div id="pending-list" class="space-y-3">
          <div class="card p-6 text-center text-muted-foreground">Cargando...</div>
        </div>
      </div>

      <!-- Historial -->
      <div class="xl:col-span-2">
        <div class="flex items-center gap-2 mb-3">
          <i data-lucide="history" class="w-4 h-4 text-muted-foreground"></i>
          <h2 class="font-semibold">Historial de resoluciones</h2>
        </div>
        <div class="card">
          <div class="table-container">
            <table class="data text-sm">
              <thead>
                <tr><th>N° OC</th><th>Proveedor</th><th>Fecha</th><th>Monto</th><th>Estado</th><th class="text-right"></th></tr>
              </thead>
              <tbody id="approvals-history-body">
                <tr><td colspan="5" class="text-center py-8 text-muted-foreground">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>`;
};

window.Views.approvals.afterMount = loadApprovals;
