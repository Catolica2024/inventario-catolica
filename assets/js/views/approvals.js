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
    const monSym = p.moneda === 'USD' ? '$' : (p.moneda === 'EUR' ? '€' : 'S/');

    return `
    <div class="card p-5 hover:border-primary transition-colors cursor-pointer" id="oc-card-${p.id}" onclick="viewOrderDetails(${p.id})">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-base font-mono">${p.numero_oc}</span>
            <span class="badge ${p.aprobado_gerente && p.aprobado_finanzas ? 'badge-green' : 'badge-yellow'}">
              ${p.aprobado_gerente && p.aprobado_finanzas ? 'Aprobada' : 'Pendiente'}
            </span>
            <span class="badge ${p.dentro_presupuesto == 1 ? 'badge-green' : 'badge-red'}">
              ${p.dentro_presupuesto == 1 ? 'En Presupuesto' : 'Fuera Presupuesto'}
            </span>
          </div>
          <div class="flex gap-2 mt-2">
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.aprobado_gerente ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">Gerencia</span>
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.aprobado_finanzas ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">Finanzas</span>
          </div>
          <div class="text-sm text-muted-foreground mt-2">${p.proveedor_nombre} · ${p.fecha || '—'}</div>
          <div class="text-2xl font-bold mt-2">
            ${monSym} ${(parseFloat(p.total || 0) + parseFloat(p.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2})}
            ${p.monto_movilidad > 0 ? `<span class="text-[10px] text-orange-600 block mt-0.5 font-normal">Incluye ${monSym} ${parseFloat(p.monto_movilidad).toFixed(2)} de movilidad</span>` : ''}
          </div>
          ${p.observaciones ? `<div class="mt-2 p-2 rounded bg-muted text-[11px] italic text-muted-foreground line-clamp-2">"${p.observaciones}"</div>` : ''}
        </div>
        <div class="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto" onclick="event.stopPropagation()">
          ${canApprove ? `
          <button class="btn btn-primary btn-sm flex-1 sm:flex-initial" onclick="approveOrder(${p.id})">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>Aprobar
          </button>` : ''}
          <button class="btn btn-danger btn-sm flex-1 sm:flex-initial" onclick="rejectOrder(${p.id})">
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

    const monSym = oc.moneda === 'USD' ? '$' : (oc.moneda === 'EUR' ? '€' : 'S/');
    const firstCuotaDate = (oc.cuotas && oc.cuotas.length > 0) ? oc.cuotas[0].fecha_vencimiento : (oc.fecha_vencimiento || '');

    const hasConformidad = !!(oc.conformidad_url);
    const hasFactura = !!(oc.comprobante_url);
    const esSinConformidad = oc.sin_conformidad == 1;

    let docSectionHTML = '';
    if (hasConformidad || hasFactura || esSinConformidad || (oc.estado === 'Recibida' || oc.estado === 'Completada')) {
      docSectionHTML = `
      <div class="space-y-2">
        <p class="text-sm font-semibold mb-2 flex items-center gap-2">
          <i data-lucide="files" class="w-3.5 h-3.5 text-primary"></i>
          Documentación de Recepción y Compras
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${hasConformidad ? `
            <a href="${oc.conformidad_url}" target="_blank" class="flex items-center gap-2.5 p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 hover:shadow-md transition-all cursor-pointer">
              <div class="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
                <i data-lucide="file-check-2" class="w-4.5 h-4.5 text-white"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-green-800 truncate">Acta de Conformidad</p>
                <p class="text-[9px] text-green-600">Ver documento de recepción</p>
              </div>
              <i data-lucide="external-link" class="w-4 h-4 text-green-700 shrink-0"></i>
            </a>
          ` : (esSinConformidad ? `
            <div class="flex items-center gap-2.5 p-3 rounded-lg border border-blue-200 bg-blue-50">
              <div class="w-8 h-8 rounded-lg bg-blue-400 flex items-center justify-center shrink-0">
                <i data-lucide="file-check-2" class="w-4.5 h-4.5 text-white"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-blue-800 truncate">Conformidad</p>
                <p class="text-[9px] text-blue-600">No requiere conformidad física</p>
              </div>
            </div>
          ` : `
            <div class="flex items-center gap-2.5 p-3 rounded-lg border border-dashed border-red-200 bg-red-50/50">
              <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                <i data-lucide="file-x-2" class="w-4.5 h-4.5 text-red-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-red-700 truncate">Acta de Conformidad</p>
                <p class="text-[9px] text-red-500">Pendiente de subir por recepción</p>
              </div>
            </div>
          `)}

          ${hasFactura ? `
            <a href="${oc.comprobante_url}" target="_blank" class="flex items-center gap-2.5 p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 hover:shadow-sm transition-all cursor-pointer">
              <div class="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                <i data-lucide="receipt" class="w-4.5 h-4.5 text-white"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-orange-800 truncate">Factura / Boleta / RxH</p>
                <p class="text-[9px] text-orange-600">Ver comprobante de pago</p>
              </div>
              <i data-lucide="external-link" class="w-4 h-4 text-orange-700 shrink-0"></i>
            </a>
          ` : `
            <div class="flex items-center gap-2.5 p-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/50">
              <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                <i data-lucide="receipt" class="w-4.5 h-4.5 text-amber-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-amber-700 truncate">Factura / Boleta / RxH</p>
                <p class="text-[9px] text-amber-500">Pendiente de subir por compras</p>
              </div>
            </div>
          `}
        </div>
      </div>`;
    }

    const body = `
      <div class="space-y-5">
        ${(oc.es_alquiler == 1 && oc.estado === 'Aprobada' && oc.pagado == 0) ? `
        <div class="p-4 rounded-xl bg-orange-50 border border-orange-200 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse">
          <div class="flex items-center gap-2 text-orange-800">
            <i data-lucide="alert-triangle" class="w-5 h-5 text-orange-500 shrink-0"></i>
            <div>
              <p class="font-bold">Calendario de pagos de alquiler pendiente de confirmar</p>
              <p class="text-xs text-orange-700">El alquiler ha sido aprobado. Confirme el día de pago y la fecha de inicio del servicio.</p>
            </div>
          </div>
          <button class="btn btn-warning btn-sm shrink-0 shadow-sm" onclick="showRentalSetupModal(${oc.id}, ${oc.dia_pago || 30}, '${firstCuotaDate}', ${oc.cuotas ? oc.cuotas.length : 24})">
            <i data-lucide="settings" class="w-3.5 h-3.5 mr-1.5"></i>Configurar
          </button>
        </div>
        ` : ''}

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><p class="text-muted-foreground">Proveedor</p><p class="font-semibold">${oc.proveedor_nombre}</p></div>
          <div><p class="text-muted-foreground">RUC</p><p class="font-semibold">${oc.ruc || '—'}</p></div>
          <div><p class="text-muted-foreground">Área Solicitante</p><p class="font-semibold">${oc.area_nombre || '—'}</p></div>
          <div><p class="text-muted-foreground">Fecha Requerida</p><p class="font-semibold">${oc.fecha_requerida || '—'}</p></div>
          <div>
            <p class="text-muted-foreground">Condición Pago</p>
            <p class="font-semibold">
                ${oc.condicion_pago || '—'} 
                ${oc.condicion_pago === 'Adelanto + Saldo' ? `<span class="text-[10px] text-primary">(${parseFloat(oc.adelanto_porcentaje).toFixed(0)}% / ${(100 - parseFloat(oc.adelanto_porcentaje)).toFixed(0)}%)</span>` : ''}
            </p>
          </div>
          <div><p class="text-muted-foreground">Moneda</p><p class="font-semibold">${oc.moneda || 'PEN'}</p></div>
          <div>
            <p class="text-muted-foreground">Presupuesto</p>
            <p class="font-semibold">
              ${oc.dentro_presupuesto == 1 ? 
                `<span class="text-emerald-600 font-bold flex items-center gap-1.5"><i data-lucide="check-circle" class="w-4 h-4"></i> Dentro de Presupuesto</span>` : 
                `<span class="text-red-500 font-bold flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-4 h-4"></i> Fuera de Presupuesto</span>`
              }
            </p>
          </div>
        </div>

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

        <!-- Secciones de Detalles de Pago (Crédito, Cuotas, Adelanto, Contado, Transferencia) -->
        ${(oc.condicion_pago === 'Al contado' || oc.condicion_pago === 'Transferencia') ? (() => {
          const isPagada = oc.pagado == 1;
          const fPago = oc.fecha_pago ? new Date(oc.fecha_pago).toLocaleDateString('es-PE') : null;
          const monSym = oc.moneda === 'USD' ? '$' : (oc.moneda === 'EUR' ? '€' : 'S/');

          return `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <i data-lucide="wallet" class="w-4 h-4 text-slate-500"></i>
              </div>
              <div>
                <h4 class="font-bold text-xs text-slate-800">Pago Único (${oc.condicion_pago})</h4>
                <p class="text-[10px] text-slate-500 mt-0.5">${isPagada ? `Pagada el ${fPago}` : 'Pendiente de pago'}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPagada ? 'text-green-700 bg-green-50 border-green-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200'}">
                ${isPagada ? 'Pagado' : 'Pendiente'}
              </span>
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-xs ${isPagada ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(oc.total).toFixed(2)}</span>
                ${isPagada && oc.voucher_url ? `
                  <div class="flex items-center gap-1 bg-white border rounded-lg p-0.5 shadow-sm">
                    <a href="${oc.voucher_url}" target="_blank" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Ver comprobante de pago">
                      <i data-lucide="external-link" class="w-3.5 h-3.5 text-primary"></i>
                    </a>
                    <button onclick="resendPaymentEmail(${oc.id}, 'saldo')" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Reenviar confirmación al proveedor">
                      <i data-lucide="mail" class="w-3.5 h-3.5 text-primary"></i>
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          `;
        })() : ''}

        ${oc.condicion_pago === 'Adelanto + Saldo' ? (() => {
          const isAdelantoPagado = oc.adelanto_pagado == 1;
          const isSaldoPagado = oc.pagado == 1;
          const monSym = oc.moneda === 'USD' ? '$' : (oc.moneda === 'EUR' ? '€' : 'S/');
          
          const fAdelanto = oc.adelanto_fecha ? new Date(oc.adelanto_fecha).toLocaleDateString('es-PE') : null;
          const fSaldo = oc.fecha_pago ? new Date(oc.fecha_pago).toLocaleDateString('es-PE') : null;

          return `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
            <h4 class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <i data-lucide="percent" class="w-4 h-4 text-primary"></i>
              Detalle de Adelanto + Saldo
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <!-- Adelanto Card -->
              <div class="p-2.5 rounded-lg border bg-white flex items-center justify-between gap-2">
                <div>
                  <div class="text-[10px] font-bold text-slate-800">Adelanto (${parseFloat(oc.adelanto_porcentaje).toFixed(0)}%)</div>
                  <div class="text-[9px] text-slate-500 mt-0.5">
                    ${isAdelantoPagado ? `Pagado el ${fAdelanto}` : 'Pendiente de pago'}
                  </div>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="font-extrabold text-xs ${isAdelantoPagado ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(oc.adelanto_monto).toFixed(2)}</span>
                  ${isAdelantoPagado && oc.adelanto_voucher ? `
                    <div class="flex items-center gap-1 bg-slate-50 border rounded-lg p-0.5 shadow-sm">
                      <a href="${oc.adelanto_voucher}" target="_blank" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Ver voucher del adelanto">
                        <i data-lucide="external-link" class="w-3.5 h-3.5 text-primary"></i>
                      </a>
                      <button onclick="resendPaymentEmail(${oc.id}, 'adelanto')" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Reenviar confirmación al proveedor">
                        <i data-lucide="mail" class="w-3.5 h-3.5 text-primary"></i>
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
              
              <!-- Saldo Card -->
              <div class="p-2.5 rounded-lg border bg-white flex items-center justify-between gap-2">
                <div>
                  <div class="text-[10px] font-bold text-slate-800">Saldo Final (${(100 - parseFloat(oc.adelanto_porcentaje)).toFixed(0)}%)</div>
                  <div class="text-[9px] text-slate-500 mt-0.5">
                    ${isSaldoPagado ? `Pagado el ${fSaldo}` : 'Se paga a la entrega'}
                  </div>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="font-extrabold text-xs ${isSaldoPagado ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(oc.saldo_monto).toFixed(2)}</span>
                  ${isSaldoPagado && oc.voucher_url ? `
                    <div class="flex items-center gap-1 bg-slate-50 border rounded-lg p-0.5 shadow-sm">
                      <a href="${oc.voucher_url}" target="_blank" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Ver voucher del saldo final">
                        <i data-lucide="external-link" class="w-3.5 h-3.5 text-primary"></i>
                      </a>
                      <button onclick="resendPaymentEmail(${oc.id}, 'saldo')" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Reenviar confirmación al proveedor">
                        <i data-lucide="mail" class="w-3.5 h-3.5 text-primary"></i>
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
          `;
        })() : ''}

        ${oc.cuotas && oc.cuotas.length > 0 ? (() => {
          const cuotas = oc.cuotas;
          const totalCuotas = cuotas.length;
          const pagadas = cuotas.filter(c => c.pagado == 1).length;
          const faltantes = totalCuotas - pagadas;
          const pct = Math.round((pagadas / totalCuotas) * 100);
          const monSym = oc.moneda === 'USD' ? '$' : (oc.moneda === 'EUR' ? '€' : 'S/');
          
          const cuotasHTML = cuotas.map(c => {
            const isPagada = c.pagado == 1;
            const venc = c.fecha_vencimiento ? new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-PE') : '—';
            const fPago = c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString('es-PE') : null;
            
            let statusText = '';
            let statusClass = '';
            if (isPagada) {
              statusText = `Pagada${fPago ? ' el ' + fPago : ''}`;
              statusClass = 'text-green-700 bg-green-50 border-green-200';
            } else if (c.fecha_vencimiento) {
              const today = new Date();
              today.setHours(0,0,0,0);
              const dueDate = new Date(c.fecha_vencimiento + 'T00:00:00');
              const diffTime = dueDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays < 0) {
                statusText = `Vencida hace ${Math.abs(diffDays)} días`;
                statusClass = 'text-red-700 bg-red-50 border-red-200 font-bold';
              } else if (diffDays === 0) {
                statusText = 'Vence hoy';
                statusClass = 'text-orange-700 bg-orange-50 border-orange-200 font-bold';
              } else {
                statusText = `Vence en ${diffDays} días`;
                statusClass = 'text-yellow-700 bg-yellow-50 border-yellow-200';
              }
            } else {
              statusText = 'Pendiente';
              statusClass = 'text-slate-600 bg-slate-50 border-slate-200';
            }
            
            const tieneFactura = c.comprobante_url && c.comprobante_url !== '' && c.comprobante_url !== 'null';
            return `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white gap-2">
              <div class="flex items-center gap-2.5 animate-fade-in">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isPagada ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                  ${isPagada ? '✓' : c.numero_cuota}
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Cuota ${c.numero_cuota} de ${c.total_cuotas}
                    ${c.descripcion ? `<span class="badge badge-gray text-[9px] font-bold">${c.descripcion}</span>` : ''}
                  </div>
                  <div class="text-[10px] text-slate-500 flex items-center gap-1">
                    <i data-lucide="calendar" class="w-3 h-3"></i> Límite: ${venc}
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto flex-wrap">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass}">${statusText}</span>
                
                ${tieneFactura ? `
                  <a href="${c.comprobante_url}" target="_blank" 
                     class="btn btn-outline btn-sm text-[10px] px-2 py-1 text-orange-600 border-orange-200 hover:bg-orange-50 flex items-center gap-1 shrink-0 font-bold" 
                     title="Ver Factura de esta cuota">
                      <i data-lucide="file-text" class="w-3 h-3"></i>
                      <span>Factura Cuota</span>
                  </a>
                ` : `
                  <span class="text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200/60 flex items-center gap-1 shrink-0" title="Pendiente de subir por compras">
                      <i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-500"></i> Sin Factura
                  </span>
                `}

                <div class="flex items-center gap-1.5">
                  <span class="font-extrabold text-xs ${isPagada ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(c.monto_cuota).toFixed(2)}</span>
                  ${isPagada && c.voucher_url ? `
                    <div class="flex items-center gap-1 bg-slate-50 border rounded-lg p-0.5 shadow-sm">
                      <a href="${c.voucher_url}" target="_blank" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Ver comprobante de pago">
                        <i data-lucide="external-link" class="w-3.5 h-3.5 text-primary"></i>
                      </a>
                      <button onclick="resendPaymentEmail(${oc.id}, 'cuota', ${c.id})" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Reenviar confirmación al proveedor">
                        <i data-lucide="mail" class="w-3.5 h-3.5 text-primary"></i>
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>`;
          }).join('');
 
          return `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                ${(oc.es_alquiler == 1 || oc.condicion_pago === 'Alquiler') ? `
                  <h4 class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <i data-lucide="repeat" class="w-4 h-4 text-primary"></i>
                    Cronograma de Alquiler Recurrente
                  </h4>
                  <p class="text-[9px] text-slate-500 font-medium mt-0.5">
                    Estado actual: ${pagadas} pagadas · ${faltantes} pendientes · Día de pago: ${oc.dia_pago || '30'} c/m
                  </p>
                ` : `
                  <h4 class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <i data-lucide="calendar-days" class="w-4 h-4 text-primary"></i>
                    Cronograma de Cuotas
                  </h4>
                  <p class="text-[9px] text-slate-500 font-medium mt-0.5">
                    Estado actual: ${pagadas} pagadas · ${faltantes} pendientes (Faltan ${faltantes})
                  </p>
                `}
              </div>
              <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                <div class="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden border">
                  <div class="bg-green-500 h-1.5 rounded-full transition-all" style="width: ${pct}%"></div>
                </div>
                <span>${pct}% pagado</span>
              </div>
            </div>
            <div class="space-y-1 max-h-48 overflow-y-auto pr-1">
              ${cuotasHTML}
            </div>
          </div>
          `;
        })() : ''}

        ${oc.condicion_pago === 'Credito' && (!oc.cuotas || oc.cuotas.length === 0) ? (() => {
          const isPagada = oc.pagado == 1;
          const venc = oc.fecha_vencimiento ? new Date(oc.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-PE') : '—';
          const fPago = oc.fecha_pago ? new Date(oc.fecha_pago).toLocaleDateString('es-PE') : null;
          const monSym = oc.moneda === 'USD' ? '$' : (oc.moneda === 'EUR' ? '€' : 'S/');
          
          let statusText = '';
          let statusClass = '';
          if (isPagada) {
            statusText = `Pagada el ${fPago}`;
            statusClass = 'text-green-700 bg-green-50 border-green-200';
          } else if (oc.fecha_vencimiento) {
            const today = new Date();
            today.setHours(0,0,0,0);
            const dueDate = new Date(oc.fecha_vencimiento + 'T00:00:00');
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
              statusText = `Vencido hace ${Math.abs(diffDays)} días`;
              statusClass = 'text-red-700 bg-red-50 border-red-200 font-bold';
            } else if (diffDays === 0) {
              statusText = 'Vence hoy';
              statusClass = 'text-orange-700 bg-orange-50 border-orange-200 font-bold';
            } else {
              statusText = `Vence en ${diffDays} días`;
              statusClass = 'text-yellow-700 bg-yellow-50 border-yellow-200';
            }
          } else {
            statusText = 'Pendiente de pago';
            statusClass = 'text-yellow-700 bg-yellow-50 border-yellow-200';
          }

          return `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <i data-lucide="calendar" class="w-4 h-4 text-slate-500"></i>
              </div>
              <div>
                <h4 class="font-bold text-xs text-slate-800">Pago Único a Crédito</h4>
                <p class="text-[10px] text-slate-500 mt-0.5">Fecha límite de pago: ${venc}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass}">${statusText}</span>
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-xs ${isPagada ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(oc.total).toFixed(2)}</span>
                ${isPagada && oc.voucher_url ? `
                  <div class="flex items-center gap-1 bg-slate-50 border rounded-lg p-0.5 shadow-sm">
                    <a href="${oc.voucher_url}" target="_blank" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Ver comprobante de pago">
                      <i data-lucide="external-link" class="w-4 h-4 text-primary"></i>
                    </a>
                    <button onclick="resendPaymentEmail(${oc.id}, 'saldo')" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Reenviar confirmación al proveedor">
                      <i data-lucide="mail" class="w-3.5 h-3.5 text-primary"></i>
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          `;
        })() : ''}

        ${oc.monto_movilidad > 0 ? (() => {
          const isMobPagada = oc.mobility && oc.mobility.pagado == 1;
          const fPago = oc.mobility && oc.mobility.fecha_pago ? new Date(oc.mobility.fecha_pago).toLocaleDateString('es-PE') : null;
          const monSym = oc.moneda === 'USD' ? '$' : (oc.moneda === 'EUR' ? '€' : 'S/');

          return `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <i data-lucide="truck" class="w-4 h-4 text-slate-500"></i>
              </div>
              <div>
                <h4 class="font-bold text-xs text-slate-800">Servicio de Movilidad</h4>
                <p class="text-[10px] text-slate-500 mt-0.5">${isMobPagada ? `Pagada el ${fPago}` : 'Pendiente de pago'}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${isMobPagada ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-slate-500 bg-slate-50 border-slate-200'}">
                ${isMobPagada ? 'Pagado' : 'Pendiente'}
              </span>
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-xs ${isMobPagada ? 'text-orange-700' : 'text-slate-500'}">${monSym} ${parseFloat(oc.monto_movilidad).toFixed(2)}</span>
                ${isMobPagada && oc.mobility.voucher_url ? `
                  <div class="flex items-center gap-1 bg-slate-50 border rounded-lg p-0.5 shadow-sm">
                    <a href="${oc.mobility.voucher_url}" target="_blank" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Ver comprobante de movilidad">
                      <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                    </a>
                    <button onclick="resendPaymentEmail(${oc.id}, 'mobility')" class="p-1 text-slate-400 hover:text-primary transition-colors" title="Reenviar confirmación al transportista">
                      <i data-lucide="mail" class="w-3.5 h-3.5 text-primary"></i>
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
          `;
        })() : ''}


        ${oc.observaciones ? `
        <div class="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
          <p class="text-blue-700 font-semibold mb-1 flex items-center gap-1"><i data-lucide="info" class="w-3.5 h-3.5"></i> Observaciones / Sustento:</p>
          <p class="text-blue-900 italic">"${oc.observaciones}"</p>
        </div>` : ''}

        ${docSectionHTML}

        <div>
          <p class="text-sm font-semibold mb-2 flex items-center gap-2">
            <i data-lucide="list" class="w-3.5 h-3.5 text-primary"></i>
            Detalle de Ítems
          </p>
          <div class="max-h-72 overflow-y-auto border rounded-lg">
            <table class="w-full text-xs">
              <thead class="bg-muted sticky top-0 z-10">
                <tr>
                  <th class="p-2 text-left font-bold">Categoría</th>
                  <th class="p-2 text-left font-bold">Descripción / Detalle</th>
                  <th class="p-2 text-right font-bold w-20">P. Unit.</th>
                  <th class="p-2 text-center font-bold w-12">Cant.</th>
                  <th class="p-2 text-right font-bold w-22">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                ${oc.items.map(it => `
                  <tr class="hover:bg-muted/30 transition-colors">
                    <td class="p-2 font-medium text-primary/80">${it.categoria_nombre || '—'}</td>
                    <td class="p-2 text-muted-foreground">${(it.descripcion && it.descripcion !== it.categoria_nombre) ? it.descripcion : '—'}</td>
                    <td class="p-2 text-right">${monSym} ${parseFloat(it.precio_unitario || 0).toFixed(2)}</td>
                    <td class="p-2 text-center">${it.cantidad}</td>
                    <td class="p-2 text-right font-semibold">${monSym} ${parseFloat(it.total).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot class="bg-muted/50 font-bold border-t-2">
                <tr>
                  <td colspan="4" class="p-2 text-right uppercase text-[9px] tracking-wide">Subtotal OC</td>
                  <td class="p-2 text-right">${monSym} ${parseFloat(oc.total).toFixed(2)}</td>
                </tr>
                ${oc.monto_movilidad > 0 ? `
                <tr>
                  <td colspan="4" class="p-2 text-right uppercase text-[9px] text-orange-600 tracking-wide">Movilidad (Sep.)</td>
                  <td class="p-2 text-right text-orange-600">${monSym} ${parseFloat(oc.monto_movilidad).toFixed(2)}</td>
                </tr>
                <tr class="bg-primary/5 text-primary">
                  <td colspan="4" class="p-2 text-right uppercase text-[10px] font-black tracking-wide">Total Operación</td>
                  <td class="p-2 text-right font-black border-t border-primary/20">${monSym} ${(parseFloat(oc.total) + parseFloat(oc.monto_movilidad)).toFixed(2)}</td>
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
            <p class="text-xl font-bold text-primary">${monSym} ${(parseFloat(oc.total) + parseFloat(oc.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2})}</p>
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
  tbody.innerHTML = _historyOrders.map(p => {
    const monSym = p.moneda === 'USD' ? '$' : (p.moneda === 'EUR' ? '€' : 'S/');
    return `
    <tr>
      <td class="font-mono text-xs font-bold">${p.numero_oc}</td>
      <td>${p.proveedor_nombre}</td>
      <td class="text-xs">${p.fecha || '—'}</td>
      <td class="font-semibold">${monSym} ${(parseFloat(p.monto || 0) + parseFloat(p.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2})}</td>
      <td><span class="badge ${BADGE[p.estado] || 'badge-gray'}">${p.estado}</span></td>
      <td class="text-right">
        <button class="btn btn-ghost p-1.5" onclick="viewOrderDetails(${p.id})"><i data-lucide="eye" class="w-4 h-4"></i></button>
      </td>
    </tr>`;
  }).join('');
}

window.approveOrder = function(id) {
  const oc = _pendingOrders.find(p => p.id == id);
  const monSym = oc ? (oc.moneda === 'USD' ? '$' : (oc.moneda === 'EUR' ? '€' : 'S/')) : 'S/';
  UI.modal({
    title: 'Aprobar orden',
    body: `<p>¿Confirmas la aprobación de la orden <strong>${oc ? oc.numero_oc : ''}</strong> por <strong>${monSym} ${oc ? (parseFloat(oc.monto || 0) + parseFloat(oc.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2}) : ''}</strong>?</p>`,
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
  const monSym = oc ? (oc.moneda === 'USD' ? '$' : (oc.moneda === 'EUR' ? '€' : 'S/')) : 'S/';
  UI.modal({
    title: 'Rechazar orden de compra',
    body: `
      <div class="space-y-4">
        <div class="p-3 rounded-lg bg-muted text-sm">
          <div class="font-semibold">${oc ? oc.numero_oc : ''}</div>
          <div class="text-muted-foreground">${oc ? oc.proveedor_nombre : ''} · ${monSym} ${oc ? (parseFloat(oc.monto || 0) + parseFloat(oc.monto_movilidad || 0)).toLocaleString('es-PE', {minimumFractionDigits:2}) : ''}</div>
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

window.resendPaymentEmail = async function(ordenId, type, cuotaId = null) {
  const confirm = window.confirm("¿Está seguro de que desea reenviar el correo de confirmación de pago al proveedor?");
  if (!confirm) return;

  UI.loading('Reenviando correo...');
  try {
    const res = await fetch('api/purchases.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ordenId,
        action: 'resend_payment_email',
        payment_type: type,
        cuota_id: cuotaId
      })
    }).then(r => r.json());

    UI.stopLoading();
    if (res.ok) {
      UI.toast('Correo de confirmación reenviado con éxito', 'success');
    } else {
      UI.toast('Error: ' + (res.error || 'No se pudo reenviar el correo'), 'error');
    }
  } catch (e) {
    UI.stopLoading();
    UI.toast('Error de red al intentar reenviar el correo', 'error');
  }
};
