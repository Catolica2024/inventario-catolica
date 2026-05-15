window.Views = window.Views || {};

// DRIVE_CLIENT_ID y DRIVE_FOLDER_ID definidas en purchases.js (alcance global)

window.Views.treasury = function () {
    return `
    ${UI.pageHeader('Tesorería', 'Gestión de pagos, créditos y cuotas de OC/OS', `
      <div class="flex gap-2">
        <button class="btn btn-outline text-emerald-600" onclick="exportTreasuryExcel()"><i data-lucide="file-spreadsheet" class="w-4 h-4 mr-2"></i>Exportar Excel</button>
        <button class="btn btn-outline" onclick="loadTreasuryData()"><i data-lucide="refresh-cw" class="w-4 h-4 mr-2"></i>Actualizar</button>
      </div>
    `)}

    <div class="space-y-6">
      <!-- Tabs -->
      <div class="card p-2 flex gap-1 bg-muted/20 w-fit">
        <button id="tab-pending" class="btn btn-ghost px-6 py-2 rounded-lg bg-white shadow-sm" onclick="switchTreasuryTab('pending')">Pendientes de Pago</button>
        <button id="tab-partial" class="btn btn-ghost px-6 py-2 rounded-lg" onclick="switchTreasuryTab('partial')">Cuotas en Curso</button>
        <button id="tab-history" class="btn btn-ghost px-6 py-2 rounded-lg" onclick="switchTreasuryTab('history')">Historial de Pagos</button>
      </div>

      <!-- Tabla principal -->
      <div class="card">
        <div class="table-container">
          <table class="data">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Proveedor</th>
                <th>Condición de Pago</th>
                <th>Monto Total</th>
                <th>Estado Pago</th>
                <th>Documentación</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="treasury-table-body">
              <tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando datos...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
};

let _treasuryData = [];
let _treasuryCurrentTab = 'pending';

window.switchTreasuryTab = function (tab) {
    _treasuryCurrentTab = tab;
    ['pending', 'partial', 'history'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        if (!btn) return;
        btn.classList.toggle('bg-white', t === tab);
        btn.classList.toggle('shadow-sm', t === tab);
    });
    renderTreasuryTable();
};

window.Views.treasury.afterMount = loadTreasuryData;

async function loadTreasuryData() {
    const tbody = document.getElementById('treasury-table-body');
    if (!tbody) return;
    UI.loading('Cargando datos de tesorería...');
    try {
        const resp = await fetch('api/purchases.php').then(r => r.json());
        _treasuryData = (resp.purchases || []).filter(p => p.estado === 'Aprobada' || p.estado === 'Recibida' || p.estado === 'Completada');
        
        // --- ARCHITECTURE EXPERT: Pro-active payment check (Simulated Cron) ---
        fetch('api/cron_notifications.php').catch(e => console.error('Cron error:', e));

        renderTreasuryTable();
    } catch {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>';
    } finally {
        UI.stopLoading();
    }
}

function renderTreasuryTable() {
    const tbody = document.getElementById('treasury-table-body');
    if (!tbody) return;

    const list = _treasuryData.filter(p => {
        const tieneMovilidad = parseFloat(p.monto_movilidad || 0) > 0;
        const movilidadPagada = tieneMovilidad ? (p.mobility_pagado == 1) : true;
        const ocPagada = p.pagado == 1;

        // 1. Historial: AMBOS deben estar pagados (OC/OS + Movilidad)
        const esHistorial = ocPagada && movilidadPagada;
        if (_treasuryCurrentTab === 'history') return esHistorial;

        // 2. Cuotas en Curso: SOLO para Crédito en Cuotas que no han terminado
        const esCreditoCuotas = p.condicion_pago === 'Credito' && p.total_cuotas_reg > 0;
        const esParcialCuotas = esCreditoCuotas && !esHistorial;

        if (_treasuryCurrentTab === 'partial') return esParcialCuotas;

        // 3. Pendientes: Todo lo demás que no esté pagado totalmente
        // Esto incluye: Al contado, Crédito en Días, Adelanto + Saldo, y OCs pagadas con movilidad pendiente
        return !esHistorial && !esParcialCuotas;
    });

    if (list.length === 0) {
        const msgs = { pending: 'No hay pagos pendientes.', partial: 'No hay cuotas en curso.', history: 'No hay historial de pagos.' };
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-muted-foreground">${msgs[_treasuryCurrentTab]}</td></tr>`;
        return;
    }

    const monSym = p => p.moneda === 'USD' ? '$' : (p.moneda === 'EUR' ? '€' : 'S/');

    tbody.innerHTML = list.map(p => {
        const esCuotas = p.total_cuotas_reg > 0;
        const cuotasPag = parseInt(p.cuotas_pagadas || 0);
        const cuotasTot = parseInt(p.total_cuotas_reg || 0);

        // Badge de condición
        let condBadge = '';
        if (p.condicion_pago === 'Credito') {
            if (esCuotas) {
                condBadge = `<span class="badge badge-blue text-[10px]">Cuotas (${p.condicion_detalle})</span>`;
            } else {
                condBadge = `<span class="badge badge-yellow text-[10px]">Crédito ${p.condicion_detalle ? '(' + p.condicion_detalle + ')' : ''}</span>`;
            }
        } else if (p.condicion_pago === 'Adelanto + Saldo') {
            const aPorc = parseFloat(p.adelanto_porcentaje || 0);
            const sPorc = 100 - aPorc;
            condBadge = `
                <div class="flex flex-col gap-1">
                    <span class="badge badge-purple text-[9px] uppercase font-bold">Adelanto + Saldo</span>
                    <div class="text-[10px] text-muted-foreground font-medium">
                        ${aPorc.toFixed(0)}% adelanto / ${sPorc.toFixed(0)}% saldo
                    </div>
                </div>`;
        } else {
            condBadge = `<span class="badge badge-gray text-[10px]">${p.condicion_pago}</span>`;
        }

        // Badge de estado pago
        let estadoBadge = '';
        if (p.pagado == 1) {
            estadoBadge = '<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Pagado</span>';
        } else if (esCuotas && cuotasPag > 0) {
            estadoBadge = `<div class="flex flex-col gap-1">
                <span class="badge badge-blue text-[10px]">${cuotasPag}/${cuotasTot} cuotas</span>
                <div class="w-full bg-muted rounded-full h-1.5">
                  <div class="bg-primary h-1.5 rounded-full" style="width:${(cuotasPag / cuotasTot * 100).toFixed(0)}%"></div>
                </div>
            </div>`;
        } else if (esCuotas) {
            estadoBadge = `<span class="badge badge-yellow text-[10px]">0/${cuotasTot} cuotas</span>`;
        } else if (p.fecha_vencimiento) {
            const diff = Math.ceil((new Date(p.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
            const cls = diff < 5 ? 'badge-red' : diff < 15 ? 'badge-yellow' : 'badge-yellow';
            estadoBadge = `<div class="flex flex-col gap-0.5">
                <span class="badge ${cls} text-[10px]">Vence: ${new Date(p.fecha_vencimiento).toLocaleDateString('es-PE')}</span>
                <span class="text-[10px] text-muted-foreground">${diff > 0 ? 'En ' + diff + ' días' : 'VENCIDO'}</span>
            </div>`;
        } else if (p.condicion_pago === 'Adelanto + Saldo') {
            if (p.adelanto_pagado == 0) {
                estadoBadge = '<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> Pendiente Adelanto</span>';
            } else {
                estadoBadge = '<span class="badge badge-blue"><i data-lucide="check-circle" class="w-3 h-3"></i> Adelanto Pagado</span>';
            }
        } else {
            estadoBadge = '<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> Pendiente</span>';
        }

        // --- Badge de Documentación ---
        let docStatusBadge = '';
        const hasConf = p.conformidad_url || p.sin_conformidad == 1;
        const hasComp = p.comprobante_url;

        if (!hasConf) {
            docStatusBadge = '<span class="text-[10px] text-red-600 font-bold flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Compras aún no subió conformidad</span>';
        } else if (hasConf && p.pagado == 0) {
            docStatusBadge = '<span class="text-[10px] text-blue-600 font-bold flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3"></i> Conformidad lista, es hora de cancelar</span>';
        } else if (p.pagado == 1 && !hasComp) {
            docStatusBadge = '<span class="text-[10px] text-orange-600 font-bold flex items-center gap-1"><i data-lucide="file-warning" class="w-3 h-3"></i> Compras aún no sube la factura</span>';
        } else if (hasConf && hasComp) {
            docStatusBadge = '<span class="text-[10px] text-green-600 font-bold flex items-center gap-1"><i data-lucide="check-check" class="w-3 h-3"></i> Toda la documentación se subió</span>';
        }

        return `
        <tr>
            <td>
                <div class="font-mono text-xs font-bold">${p.numero_oc}</div>
                <div class="text-[10px] text-muted-foreground">${p.tipo === 'servicio' ? 'Orden de Servicio' : 'Orden de Compra'}</div>
            </td>
            <td class="font-medium text-sm">${p.proveedor_nombre}</td>
            <td>${condBadge}</td>
            <td class="font-bold text-primary">
                ${monSym(p)} ${parseFloat(p.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                ${p.monto_movilidad > 0 ? `<div class="text-[9px] text-orange-600 font-medium flex items-center gap-1 mt-0.5"><i data-lucide="truck" class="w-2.5 h-2.5"></i> + ${monSym(p)} ${parseFloat(p.monto_movilidad).toFixed(2)} Mov.</div>` : ''}
            </td>
            <td>${estadoBadge}</td>
            <td>${docStatusBadge}</td>
            <td class="text-right">
                <button class="btn btn-primary btn-sm" onclick="openPaymentDetails(${p.id})">
                    <i data-lucide="${p.pagado == 1 ? 'eye' : 'credit-card'}" class="w-3.5 h-3.5"></i>
                    ${p.pagado == 1 ? 'Ver Detalle' : esCuotas ? 'Gestionar Cuotas' : 'Procesar Pago'}
                </button>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

window.openPaymentDetails = async function (id) {
    const p = _treasuryData.find(x => x.id == id);
    if (!p) return;

    // Obtener datos extendidos (incluye cuotas)
    const [detResp, supResp] = await Promise.all([
        fetch(`api/purchases.php?id=${id}`).then(r => r.json()),
        fetch('api/suppliers.php').then(r => r.json())
    ]);
    const fullOC = detResp.purchase || p;
    const cuotas = fullOC.cuotas || [];
    const sup = supResp.suppliers.find(s => s.id == p.proveedor_id) || {};
    const monSym = p.moneda === 'USD' ? '$' : (p.moneda === 'EUR' ? '€' : 'S/');
    const esCuotas = cuotas.length > 0;
    const cuotasPag = cuotas.filter(c => c.pagado == 1).length;

    // --- Sección de condición de pago ---
    let condPagoSection = '';
    if (p.condicion_pago === 'Credito') {
        if (esCuotas) {
            // Vista de cuotas
            const cuotasHTML = cuotas.map(c => {
                const isPagada = c.pagado == 1;
                const venc = c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-PE') : '—';
                const fechaPago = c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString('es-PE') : null;
                return `
                <div class="flex items-center justify-between p-2.5 rounded-lg border ${isPagada ? 'bg-green-50 border-green-200' : 'bg-white border-border'}">
                    <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isPagada ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}">
                            ${isPagada ? '✓' : c.numero_cuota}
                        </div>
                        <div>
                            <div class="text-xs font-bold">Cuota ${c.numero_cuota} de ${c.total_cuotas}</div>
                            <div class="text-[10px] text-muted-foreground">Vence: ${venc} ${isPagada ? '· Pagado: ' + fechaPago : ''}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-sm ${isPagada ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(c.monto_cuota).toFixed(2)}</span>
                        ${!isPagada ? `
                            <button class="btn btn-primary btn-sm text-xs px-2 py-1" onclick="pagarCuota(${p.id}, ${c.id}, '${p.numero_oc}-C${c.numero_cuota}')">
                                <i data-lucide="credit-card" class="w-3 h-3"></i> Pagar
                            </button>
                        ` : `
                            ${c.voucher_url ? `<a href="${c.voucher_url}" target="_blank" class="btn btn-ghost btn-sm text-xs px-1.5"><i data-lucide="external-link" class="w-3 h-3"></i></a>` : ''}
                        `}
                    </div>
                </div>`;
            }).join('');

            condPagoSection = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h4 class="font-bold text-sm flex items-center gap-2 text-primary">
                            <i data-lucide="layers" class="w-4 h-4"></i>
                            Cronograma de Cuotas — ${cuotasPag}/${cuotas.length} pagadas
                        </h4>
                        <div class="flex items-center gap-2 text-xs text-muted-foreground">
                            <div class="w-24 bg-muted rounded-full h-2">
                                <div class="bg-primary h-2 rounded-full transition-all" style="width:${(cuotasPag / cuotas.length * 100).toFixed(0)}%"></div>
                            </div>
                            ${(cuotasPag / cuotas.length * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">${cuotasHTML}</div>
                </div>`;
        } else {
            // Crédito simple con fecha vencimiento
            const fVenc = fullOC.fecha_vencimiento ? new Date(fullOC.fecha_vencimiento) : null;
            const diff = fVenc ? Math.ceil((fVenc - new Date()) / (1000 * 60 * 60 * 24)) : null;
            condPagoSection = `
                <div class="p-4 rounded-lg border ${diff !== null && diff < 5 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}">
                    <h4 class="font-bold text-sm flex items-center gap-2 mb-2">
                        <i data-lucide="calendar-clock" class="w-4 h-4 ${diff !== null && diff < 5 ? 'text-red-600' : 'text-yellow-700'}"></i>
                        Crédito — ${p.condicion_detalle || ''}
                    </h4>
                    ${fVenc ? `
                        <p class="text-sm font-medium">Fecha máxima de pago: <strong>${fVenc.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></p>
                        <p class="text-xs mt-1 ${diff < 1 ? 'text-red-600 font-bold' : diff < 5 ? 'text-orange-600' : 'text-muted-foreground'}">
                            ${diff > 0 ? `Faltan ${diff} días para vencer` : `⚠ PLAZO VENCIDO hace ${Math.abs(diff)} días`}
                        </p>
                    ` : '<p class="text-xs text-muted-foreground">Sin fecha de vencimiento registrada.</p>'}
                </div>`;
        }
    } else if (p.condicion_pago === 'Adelanto + Saldo') {
        const isAdelantoPagado = p.adelanto_pagado == 1;
        condPagoSection = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-sm flex items-center gap-2 text-primary">
                        <i data-lucide="percent" class="w-4 h-4"></i>
                        Adelanto y Saldo Final
                    </h4>
                </div>
                <div class="space-y-2">
                    <!-- Adelanto -->
                    <div class="flex items-center justify-between p-2.5 rounded-lg border ${isAdelantoPagado ? 'bg-green-50 border-green-200' : 'bg-white border-border'}">
                        <div>
                            <div class="text-xs font-bold">Adelanto (${p.adelanto_porcentaje}%)</div>
                            <div class="text-[10px] text-muted-foreground">${isAdelantoPagado ? 'Pagado el ' + new Date(p.adelanto_fecha).toLocaleDateString('es-PE') : 'Pendiente de pago'}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-sm ${isAdelantoPagado ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(p.adelanto_monto).toFixed(2)}</span>
                            ${!isAdelantoPagado ? `
                                <button class="btn btn-primary btn-sm text-xs px-2 py-1" onclick="pagarAdelanto(${p.id}, '${p.numero_oc}-ADELANTO')">
                                    <i data-lucide="credit-card" class="w-3 h-3"></i> Pagar Adelanto
                                </button>
                            ` : `
                                ${p.adelanto_voucher ? `<a href="${p.adelanto_voucher}" target="_blank" class="btn btn-ghost btn-sm text-xs px-1.5"><i data-lucide="external-link" class="w-3 h-3"></i></a>` : ''}
                            `}
                        </div>
                    </div>
                    <!-- Saldo -->
                    <div class="flex items-center justify-between p-2.5 rounded-lg border ${p.pagado == 1 ? 'bg-green-50 border-green-200' : 'bg-white border-border'}">
                        <div>
                            <div class="text-xs font-bold">Saldo Final</div>
                            <div class="text-[10px] text-muted-foreground">${p.pagado == 1 ? 'Pagado el ' + new Date(p.fecha_pago).toLocaleDateString('es-PE') : 'Se paga al finalizar/entrega'}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-sm ${p.pagado == 1 ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(p.saldo_monto).toFixed(2)}</span>
                            ${p.pagado == 0 && isAdelantoPagado ? `
                                <button class="btn btn-primary btn-sm text-xs px-2 py-1" onclick="openFinalPayment(${p.id}, '${p.numero_oc}-SALDO', '${p.conformidad_url || ''}', ${p.sin_conformidad})">
                                    <i data-lucide="credit-card" class="w-3 h-3"></i> Pagar Saldo
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // --- Sección de Comprobante / Conformidad (Si ya se subieron) ---
    let docSection = '';
    if (p.conformidad_url || p.comprobante_url) {
        docSection = `
            <div class="mt-4 space-y-2">
                <p class="text-[10px] uppercase font-bold text-muted-foreground ml-1">Documentos de Recepción</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${p.conformidad_url ? `
                    <div class="p-2.5 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i data-lucide="file-check" class="w-3.5 h-3.5 text-primary"></i>
                            <span class="text-[10px] font-bold">Conformidad</span>
                        </div>
                        <a href="${p.conformidad_url}" target="_blank" class="text-[10px] text-primary hover:underline">Ver</a>
                    </div>` : ''}
                    ${p.comprobante_url ? `
                    <div class="p-2.5 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i data-lucide="file-text" class="w-3.5 h-3.5 text-orange-600"></i>
                            <span class="text-[10px] font-bold">Factura / RxH</span>
                        </div>
                        <a href="${p.comprobante_url}" target="_blank" class="text-[10px] text-primary hover:underline">Ver</a>
                    </div>` : ''}
                </div>
            </div>`;
    }

    // --- Sección de pago (solo si no es cuotas ni adelanto o si no está pagado) ---
    const isAdelantoSaldo = p.condicion_pago === 'Adelanto + Saldo';
    const showPayForm = !esCuotas && !isAdelantoSaldo && p.pagado == 0;
    const showPaidInfo = p.pagado == 1;

    const body = `
        <div class="space-y-4">
            <!-- Resumen del documento -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div class="p-3 bg-muted/30 rounded-lg">
                    <div class="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Documento</div>
                    <div class="font-bold font-mono text-xs">${p.numero_oc}</div>
                </div>
                <div class="p-3 bg-muted/30 rounded-lg">
                    <div class="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Total OC</div>
                    <div class="font-bold">${monSym} ${parseFloat(p.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>
                </div>
                ${p.monto_movilidad > 0 ? `
                <div class="p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <div class="text-[10px] uppercase font-bold text-orange-600 mb-0.5">Movilidad (Sep.)</div>
                    <div class="font-bold text-orange-700">${monSym} ${parseFloat(p.monto_movilidad).toFixed(2)}</div>
                </div>
                <div class="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div class="text-[10px] uppercase font-bold text-primary mb-0.5">Total Operación</div>
                    <div class="font-black text-primary">${monSym} ${(parseFloat(p.total) + parseFloat(p.monto_movilidad)).toFixed(2)}</div>
                </div>
                ` : `
                <div class="p-3 bg-muted/30 rounded-lg sm:col-span-2">
                    <div class="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Condición</div>
                    <div class="font-medium text-xs">${p.condicion_pago}${p.condicion_detalle ? ' — ' + p.condicion_detalle : ''}</div>
                </div>
                `}
            </div>

            ${condPagoSection ? `<div class="card p-3 border-primary/20">${condPagoSection}</div>` : ''}
            ${docSection}

            <!-- Datos bancarios -->
            <div class="card p-4 border-primary/20 bg-primary/5">
                <h4 class="font-bold flex items-center gap-2 mb-3 text-primary text-sm"><i data-lucide="landmark" class="w-4 h-4"></i>Datos del Proveedor para Pago</h4>
                <div class="grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <div class="text-muted-foreground uppercase font-bold text-[10px] mb-1">Razón Social</div>
                        <div class="font-medium">${sup.razon_social || '—'}</div>
                    </div>
                    <div>
                        <div class="text-muted-foreground uppercase font-bold text-[10px] mb-1">Banco</div>
                        <div class="font-medium">${sup.banco || 'No especificado'}</div>
                    </div>
                    <div>
                        <div class="text-muted-foreground uppercase font-bold text-[10px] mb-1">N° Cuenta</div>
                        <div class="flex items-center gap-1 bg-white p-1.5 rounded border">
                            <span class="font-mono">${sup.numero_cuenta || 'No registrado'}</span>
                            ${sup.numero_cuenta ? `<button onclick="copyToClipboard('${sup.numero_cuenta}')" class="ml-auto text-primary hover:text-primary/80"><i data-lucide="copy" class="w-3 h-3"></i></button>` : ''}
                        </div>
                    </div>
                    <div>
                        <div class="text-muted-foreground uppercase font-bold text-[10px] mb-1">CCI</div>
                        <div class="flex items-center gap-1 bg-white p-1.5 rounded border">
                            <span class="font-mono">${sup.cci || 'No registrado'}</span>
                            ${sup.cci ? `<button onclick="copyToClipboard('${sup.cci}')" class="ml-auto text-primary hover:text-primary/80"><i data-lucide="copy" class="w-3 h-3"></i></button>` : ''}
                        </div>
                    </div>
                    ${sup.cuenta_detraccion ? `
                    <div class="col-span-2">
                        <div class="flex items-center gap-1.5 mb-1">
                            <div class="text-muted-foreground uppercase font-bold text-[10px]">Cuenta de Detracción</div>
                            <span class="text-[9px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded">SUNAT</span>
                        </div>
                        <div class="flex items-center gap-1 bg-orange-50 border border-orange-200 p-1.5 rounded">
                            <span class="font-mono text-orange-800">${sup.cuenta_detraccion}</span>
                            <button onclick="copyToClipboard('${sup.cuenta_detraccion}')" class="ml-auto text-orange-600 hover:text-orange-800"><i data-lucide="copy" class="w-3 h-3"></i></button>
                        </div>
                    </div>` : ''}
                </div>
            </div>

            ${fullOC.mobility ? `
            <div class="card p-4 border-orange-200 bg-orange-50/50">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold flex items-center gap-2 text-orange-700 text-sm"><i data-lucide="truck" class="w-4 h-4"></i>Pago de Movilidad</h4>
                    ${fullOC.mobility.pagado == 1
                ? '<span class="badge badge-green text-[10px]">PAGADO</span>'
                : '<span class="badge badge-orange text-[10px]">PENDIENTE</span>'}
                </div>
                
                <div class="grid grid-cols-2 gap-3 text-xs mb-4">
                    <div class="col-span-1">
                        <div class="text-orange-600/70 uppercase font-bold text-[10px] mb-1">Proveedor Transportista</div>
                        <div class="font-medium text-orange-900">${fullOC.mobility.proveedor_nombre || '—'}</div>
                    </div>
                    <div class="col-span-1">
                        <div class="text-orange-600/70 uppercase font-bold text-[10px] mb-1">Monto a Pagar</div>
                        <div class="font-bold text-lg text-orange-700">${monSym} ${parseFloat(fullOC.mobility.monto).toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-orange-600/70 uppercase font-bold text-[10px] mb-1">Banco / Cuenta</div>
                        <div class="font-medium text-orange-900">${fullOC.mobility.banco || '—'} / ${fullOC.mobility.numero_cuenta || '—'}</div>
                    </div>
                    <div>
                        <div class="text-orange-600/70 uppercase font-bold text-[10px] mb-1">CCI</div>
                        <div class="font-medium text-orange-900">${fullOC.mobility.cci || '—'}</div>
                    </div>
                </div>

                ${fullOC.mobility.pagado == 0 ? `
                    <div class="space-y-2 border-t border-orange-200 pt-3">
                        <p class="text-[10px] text-orange-800 font-bold uppercase mb-1">Procesar Pago de Movilidad</p>
                        <div class="flex gap-2">
                            <div class="flex-1 border-2 border-dashed border-orange-300 rounded-lg p-2 text-center cursor-pointer hover:bg-orange-100 transition-colors" onclick="document.getElementById('pay-voucher-mob-indep').click()">
                                <i data-lucide="upload-cloud" class="w-4 h-4 text-orange-600 mx-auto"></i>
                                <p id="mob-v-name-indep" class="text-[9px] text-orange-700 font-bold truncate">Subir Voucher Movilidad</p>
                                <input type="file" id="pay-voucher-mob-indep" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('mob-v-name-indep').textContent = this.files[0]?.name || ''">
                            </div>
                            <button class="btn btn-primary btn-sm px-4" onclick="pagarMovilidad(${fullOC.id})">
                                <i data-lucide="check" class="w-4 h-4"></i> Confirmar Pago
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="border-t border-orange-200 pt-2 flex justify-between items-center">
                        <span class="text-[10px] text-green-700 font-medium italic">Pagado el ${new Date(fullOC.mobility.fecha_pago).toLocaleDateString('es-PE')}</span>
                        ${fullOC.mobility.voucher_url ? `<a href="${fullOC.mobility.voucher_url}" target="_blank" class="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"><i data-lucide="external-link" class="w-3 h-3"></i>Ver Voucher</a>` : ''}
                    </div>
                `}
            </div>` : ''}

            ${showPayForm ? `
                <!-- Formulario pago total -->
                <div class="space-y-4">
                    <div class="p-4 border rounded-xl bg-primary/5 border-primary/20">
                        <h4 class="font-bold text-sm flex items-center gap-2 mb-3"><i data-lucide="upload" class="w-4 h-4 text-primary"></i>Voucher Pago Proveedor OC</h4>
                        <div class="border-2 border-dashed border-primary/20 rounded-lg p-4 text-center cursor-pointer hover:bg-primary/10 transition-colors" onclick="document.getElementById('pay-voucher').click()">
                            <i data-lucide="upload-cloud" class="w-6 h-6 text-primary mx-auto mb-1"></i>
                            <p class="text-[10px] text-muted-foreground font-medium">Subir voucher para ${sup.razon_social}</p>
                            <input type="file" id="pay-voucher" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('pay-voucher-name').textContent = this.files[0]?.name || ''">
                        </div>
                        <div id="pay-voucher-name" class="text-[10px] text-primary font-bold text-center mt-2"></div>
                    </div>
                </div>
            ` : ''}

            ${showPaidInfo ? `
                <div class="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <h4 class="font-bold text-green-800 flex items-center gap-2 mb-2 text-sm"><i data-lucide="check-circle" class="w-4 h-4"></i>Pago Confirmado</h4>
                    <p class="text-xs text-green-700">Pagado el ${new Date(p.fecha_pago).toLocaleString('es-PE')}</p>
                    ${p.voucher_url ? `<a href="${p.voucher_url}" target="_blank" class="btn btn-outline btn-sm mt-3 w-full bg-white text-xs"><i data-lucide="external-link"></i>Ver Voucher en Drive</a>` : ''}
                </div>
            ` : ''}
        </div>`;

    UI.modal({
        title: `${p.numero_oc} — ${p.proveedor_nombre}`,
        body,
        confirmText: showPayForm ? 'Confirmar Pago Total' : 'Cerrar',
        hideConfirm: !showPayForm,
        onConfirm: async () => {
            const fileInput = document.getElementById('pay-voucher');
            if (!fileInput?.files[0]) { UI.toast('Adjunte el voucher de pago', 'error'); return; }

            UI.loading('Subiendo voucher a Google Drive...');
            const driveUrl = await uploadVoucherToDrive(fileInput.files[0], p.numero_oc);
            if (!driveUrl) { UI.stopLoading(); return; }

            UI.loading('Registrando pago en el sistema...');
            const resp = await fetch('api/purchases.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: p.id, action: 'pay', voucher_url: driveUrl })
            }).then(r => r.json());

            UI.stopLoading();
            if (resp.ok) {
                UI.toast('Pago registrado con éxito', 'success');
                // Cerrar todos los modales y recargar
                document.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
                setTimeout(() => location.reload(), 800);
            } else { UI.toast('Error: ' + resp.error, 'error'); }
        }
    });
    lucide.createIcons();
};

// Pagar Adelanto
window.pagarAdelanto = function (ordenId, nombre) {
    const body = `
        <div class="space-y-3">
            <p class="text-sm text-muted-foreground">Adjunte el voucher de pago para el <strong>Adelanto</strong>.</p>
            <div class="border-2 border-dashed border-muted rounded-xl p-5 text-center cursor-pointer hover:border-primary/40 transition-colors" onclick="document.getElementById('adelanto-voucher').click()">
                <i data-lucide="upload-cloud" class="w-8 h-8 text-muted-foreground mx-auto mb-2"></i>
                <p class="text-xs text-muted-foreground">Haga clic para subir el voucher</p>
                <input type="file" id="adelanto-voucher" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('adelanto-voucher-name').textContent = this.files[0]?.name || ''">
            </div>
            <div id="adelanto-voucher-name" class="text-xs text-primary font-medium text-center"></div>
        </div>`;

    UI.modal({
        title: 'Pagar Adelanto: ' + nombre,
        body,
        confirmText: 'Confirmar Pago Adelanto',
        onConfirm: async () => {
            const fi = document.getElementById('adelanto-voucher');
            if (!fi?.files[0]) { UI.toast('Adjunte el voucher', 'error'); return; }
            UI.loading('Subiendo a Drive...');
            const driveUrl = await uploadVoucherToDrive(fi.files[0], nombre);
            if (!driveUrl) { UI.stopLoading(); return; }

            UI.loading('Procesando Adelanto...');
            const resp = await fetch('api/purchases.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: ordenId, action: 'pay_adelanto', voucher_url: driveUrl })
            }).then(r => r.json());

            UI.stopLoading();
            if (resp.ok) {
                UI.toast('Adelanto registrado con éxito', 'success');
                // Cerrar todos los modales y recargar
                document.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
                setTimeout(() => location.reload(), 800);
            } else { UI.toast('Error: ' + resp.error, 'error'); }
        }
    });
    lucide.createIcons();
};

window.openFinalPayment = function (ordenId, nombre, comprobanteUrl, sinConformidad) {
    const hasDoc = (comprobanteUrl && comprobanteUrl !== '' && comprobanteUrl !== 'null') || sinConformidad == 1;

    let body = '';
    if (!hasDoc) {
        body = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <i data-lucide="alert-circle" class="w-10 h-10 text-red-500 mx-auto mb-2"></i>
                <h3 class="font-bold text-red-800 text-sm">PAGO BLOQUEADO</h3>
                <p class="text-xs text-red-600 mt-1">El encargado de compras aún no ha subido la <strong>Conformidad de Servicio</strong> o marcado su ausencia.</p>
                <p class="text-[10px] text-red-500 mt-2">Es obligatorio validar la entrega antes de proceder con el saldo final.</p>
            </div>`;
    } else {
        body = `
            <div class="space-y-3">
                <div class="p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 mb-3">
                    <i data-lucide="check-square" class="w-4 h-4 text-green-600"></i>
                    <span class="text-xs text-green-700 font-medium">${sinConformidad == 1 ? 'Ausencia de conformidad física validada' : 'Conformidad de compras verificada'}</span>
                </div>
                <p class="text-sm text-muted-foreground">Adjunte el voucher de pago para el <strong>Saldo Final</strong>.</p>
                <div class="border-2 border-dashed border-muted rounded-xl p-5 text-center cursor-pointer hover:border-primary/40 transition-colors" onclick="document.getElementById('saldo-voucher').click()">
                    <i data-lucide="upload-cloud" class="w-8 h-8 text-muted-foreground mx-auto mb-2"></i>
                    <p class="text-xs text-muted-foreground">Haga clic para subir el voucher</p>
                    <input type="file" id="saldo-voucher" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('saldo-voucher-name').textContent = this.files[0]?.name || ''">
                </div>
                <div id="saldo-voucher-name" class="text-xs text-primary font-medium text-center"></div>
            </div>`;
    }

    UI.modal({
        title: 'Pagar Saldo Final: ' + nombre,
        body,
        confirmText: hasDoc ? 'Confirmar Pago Final' : 'Entendido',
        hideConfirm: !hasDoc,
        onConfirm: async () => {
            if (!hasDoc) return;
            const fi = document.getElementById('saldo-voucher');
            if (!fi?.files[0]) { UI.toast('Adjunte el voucher', 'error'); return; }
            UI.loading('Subiendo a Drive...');
            const driveUrl = await uploadVoucherToDrive(fi.files[0], nombre);
            if (!driveUrl) { UI.stopLoading(); return; }

            UI.loading('Procesando Pago Final...');
            const resp = await fetch('api/purchases.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: ordenId, action: 'pay', voucher_url: driveUrl })
            }).then(r => r.json());

            UI.stopLoading();
            if (resp.ok) {
                UI.toast('Saldo final registrado con éxito', 'success');
                // Cerrar todos los modales y recargar
                document.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
                setTimeout(() => location.reload(), 800);
            } else { UI.toast('Error: ' + resp.error, 'error'); }
        }
    });
    lucide.createIcons();
};

// Pagar una cuota individual
window.pagarCuota = function (ordenId, cuotaId, nombre) {
    const body = `
        <div class="space-y-3">
            <p class="text-sm text-muted-foreground">Adjunte el voucher de pago para registrar esta cuota en el sistema.</p>
            <div class="border-2 border-dashed border-muted rounded-xl p-5 text-center cursor-pointer hover:border-primary/40 transition-colors" onclick="document.getElementById('cuota-voucher').click()">
                <i data-lucide="upload-cloud" class="w-8 h-8 text-muted-foreground mx-auto mb-2"></i>
                <p class="text-xs text-muted-foreground">Haga clic para subir el voucher</p>
                <input type="file" id="cuota-voucher" class="hidden" accept="image/*,application/pdf" onchange="document.getElementById('cuota-voucher-name').textContent = this.files[0]?.name || ''">
            </div>
            <div id="cuota-voucher-name" class="text-xs text-primary font-medium text-center"></div>
        </div>`;

    UI.modal({
        title: 'Pagar: ' + nombre,
        body,
        confirmText: 'Confirmar Pago de Cuota',
        onConfirm: async () => {
            const fi = document.getElementById('cuota-voucher');
            if (!fi?.files[0]) { UI.toast('Adjunte el voucher', 'error'); return; }
            UI.loading('Subiendo a Drive...');
            const driveUrl = await uploadVoucherToDrive(fi.files[0], nombre);
            if (!driveUrl) { UI.stopLoading(); return; }

            UI.loading('Procesando Pago de Cuota...');
            const resp = await fetch('api/purchases.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: ordenId, action: 'pay_cuota', cuota_id: cuotaId, voucher_url: driveUrl })
            }).then(r => r.json());

            UI.stopLoading();
            if (resp.ok) {
                UI.toast('Cuota registrada con éxito', 'success');
                // Cerrar todos los modales y recargar
                document.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
                setTimeout(() => location.reload(), 800);
            } else { UI.toast('Error: ' + resp.error, 'error'); }
        }
    });
    lucide.createIcons();
};

// Pagar movilidad de forma independiente
window.pagarMovilidad = async function (ordenId) {
    const fi = document.getElementById('pay-voucher-mob-indep');
    if (!fi?.files[0]) { UI.toast('Adjunte el voucher de movilidad', 'error'); return; }

    UI.loading('Subiendo voucher a Drive...');
    const driveUrl = await uploadVoucherToDrive(fi.files[0], 'MOB-' + ordenId);
    if (!driveUrl) { UI.stopLoading(); return; }

    UI.loading('Registrando pago de movilidad...');
    const resp = await fetch('api/purchases.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ordenId, action: 'pay_mobility', voucher_url: driveUrl })
    }).then(r => r.json());

    UI.stopLoading();
    if (resp.ok) {
        UI.toast('Pago de movilidad registrado con éxito', 'success');
        // Cerrar todos los modales y recargar
        document.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
        setTimeout(() => location.reload(), 800);
    } else { UI.toast('Error: ' + resp.error, 'error'); }
};

window.copyToClipboard = function (text) {
    navigator.clipboard.writeText(text).then(() => UI.toast('Copiado al portapapeles', 'success'));
};

async function uploadVoucherToDrive(file, docNumber) {
    return new Promise((resolve) => {
        if (typeof google === 'undefined') { UI.toast('Google Drive aún no cargó. Espere 2 segundos.', 'warning'); resolve(null); return; }
        google.accounts.oauth2.initTokenClient({
            client_id: DRIVE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (token) => {
                const metadata = { name: 'VOUCHER_' + docNumber + '_' + Date.now(), parents: [DRIVE_FOLDER_ID] };
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);
                try {
                    const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
                        method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token }, body: form
                    });
                    const res = await resp.json();
                    if (res.id) resolve(res.webViewLink);
                    else { UI.toast('Error al subir a Drive', 'error'); resolve(null); }
                } catch { UI.toast('Error de conexión con Drive', 'error'); resolve(null); }
            }
        }).requestAccessToken();
    });
}
window.exportTreasuryExcel = async function() {
    UI.loading('Preparando datos...');
    try {
        const resp = await fetch('api/purchases.php').then(r => r.json());
        const data = (resp.purchases || []).filter(p => p.estado === 'Aprobada' || p.estado === 'Recibida' || p.estado === 'Completada').map(p => ({
            'OC/OS': p.numero_oc,
            'Proveedor': p.proveedor_nombre,
            'Condición': p.condicion_pago,
            'Monto OC': parseFloat(p.total).toFixed(2),
            'Monto Movilidad': parseFloat(p.monto_movilidad).toFixed(2),
            'Total General': (parseFloat(p.total) + parseFloat(p.monto_movilidad)).toFixed(2),
            'Pagado OC': p.pagado == 1 ? 'SÍ' : (p.adelanto_pagado == 1 ? 'PARCIAL' : 'NO'),
            'Pagado Movilidad': p.monto_movilidad > 0 ? (p.mobility_pagado == 1 ? 'SÍ' : 'NO') : 'N/A',
            'Fecha Vencimiento': p.fecha_vencimiento || '—'
        }));
        UI.exportToExcel(data, 'Reporte_Pagos_Tesorería.xlsx');
    } catch(e) { UI.toast('Error al exportar', 'error'); }
    finally { UI.stopLoading(); }
};
