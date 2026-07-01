window.Views = window.Views || {};

// DRIVE_CLIENT_ID y DRIVE_FOLDER_ID definidas en purchases.js (alcance global)

window.Views.treasury = function () {
    return `
    ${UI.pageHeader('Tesorería', 'Gestión de pagos, créditos y cuotas de OC/OS', `
      <div class="flex flex-col sm:flex-row gap-2">
        <button class="btn btn-outline text-emerald-600" onclick="exportTreasuryExcel()"><i data-lucide="file-spreadsheet" class="w-4 h-4 mr-2"></i>Exportar Excel</button>
        <button class="btn btn-outline" onclick="loadTreasuryData()"><i data-lucide="refresh-cw" class="w-4 h-4 mr-2"></i>Actualizar</button>
      </div>
    `)}

    <div class="space-y-4">
      <!-- Tabs premium con indicador activo, scrollable horizontalmente en móvil -->
      <div class="flex overflow-x-auto whitespace-nowrap gap-0 border-b border-border scrollbar-none">
        <button id="tab-pending" class="treasury-tab active-tab flex-shrink-0" onclick="switchTreasuryTab('pending')">
          <i data-lucide="clock" class="w-4 h-4"></i>
          <span>Pendientes de Pago</span>
          <span id="count-pending" class="tab-count">0</span>
        </button>
        <button id="tab-history" class="treasury-tab flex-shrink-0" onclick="switchTreasuryTab('history')">
          <i data-lucide="history" class="w-4 h-4"></i>
          <span>Historial de Pagos</span>
          <span id="count-history" class="tab-count">0</span>
        </button>
      </div>

      <!-- Filtros (solo visibles en Historial) -->
      <div id="history-filters" class="hidden">
        <div class="card p-4 bg-muted/30">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
            <div class="col-span-1 sm:col-span-2 md:col-span-4">
              <label class="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Buscar documento / proveedor</label>
              <div class="relative">
                <i data-lucide="search" class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
                <input type="text" id="filter-search" class="input w-full h-9 pl-8 text-sm" placeholder="Ej: OC-2024-001 o Nombre proveedor..." oninput="applyHistoryFilters()">
              </div>
            </div>
            <div class="col-span-1 md:col-span-2">
              <label class="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Desde</label>
              <input type="date" id="filter-from" class="input w-full h-9 text-sm" onchange="applyHistoryFilters()">
            </div>
            <div class="col-span-1 md:col-span-2">
              <label class="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Hasta</label>
              <input type="date" id="filter-to" class="input w-full h-9 text-sm" onchange="applyHistoryFilters()">
            </div>
            <div class="col-span-1 md:col-span-2">
              <label class="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Tipo</label>
              <select id="filter-type" class="select w-full h-9 text-sm" onchange="applyHistoryFilters()">
                <option value="">Todos</option>
                <option value="compra">Órdenes de Compra</option>
                <option value="servicio">Órdenes de Servicio</option>
              </select>
            </div>
            <div class="col-span-1 md:col-span-2">
              <button class="btn btn-ghost h-9 text-xs text-muted-foreground w-full flex justify-center items-center gap-1 border border-dashed border-border hover:border-primary/40 rounded-lg" onclick="clearHistoryFilters()">
                <i data-lucide="x" class="w-3.5 h-3.5"></i> Limpiar
              </button>
            </div>
          </div>
        </div>
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
              <tr><td colspan="7" class="text-center py-10 text-muted-foreground">Cargando datos...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <style>
      .treasury-tab {
        display: flex; align-items: center; gap: 6px;
        padding: 10px 20px; font-size: 13px; font-weight: 600;
        color: var(--muted-foreground, #64748b);
        border-bottom: 2px solid transparent;
        margin-bottom: -1px; cursor: pointer;
        background: transparent; border-top: none; border-left: none; border-right: none;
        transition: color 0.15s, border-color 0.15s;
        flex-shrink: 0;
      }
      .treasury-tab:hover { color: var(--foreground, #1e293b); }
      .treasury-tab.active-tab {
        color: #1b5cff;
        border-bottom-color: #1b5cff;
      }
      .tab-count {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 20px; height: 20px; padding: 0 6px;
        border-radius: 10px; font-size: 10px; font-weight: 700;
        background: #e2e8f0; color: #64748b;
        transition: background 0.15s, color 0.15s;
      }
      .treasury-tab.active-tab .tab-count {
        background: #dbeafe; color: #1b5cff;
      }
    </style>`;
};

let _treasuryData = [];
let _treasuryCurrentTab = 'pending';

function parseDateAndDiff(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const dueDate = new Date(parts[0], parts[1] - 1, parts[2]);
    dueDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    return { diffDays, formattedDate };
}

// Filtros activos en historial (se leen directo del DOM en renderTreasuryTable)
// No usamos variable intermedia para evitar datos obsoletos.

window.switchTreasuryTab = function (tab) {
    _treasuryCurrentTab = tab;
    ['pending', 'history'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        if (!btn) return;
        btn.classList.toggle('active-tab', t === tab);
    });
    // Mostrar/ocultar filtros según tab
    const filterBar = document.getElementById('history-filters');
    if (filterBar) filterBar.classList.toggle('hidden', tab !== 'history');
    if (tab === 'history') applyHistoryFilters();
    else renderTreasuryTable();
    lucide.createIcons();
};

// applyHistoryFilters: simplemente re-renderiza (la lógica de filtro vive en renderTreasuryTable)
window.applyHistoryFilters = function() {
    renderTreasuryTable();
};

window.clearHistoryFilters = function() {
    const s = document.getElementById('filter-search');
    const f = document.getElementById('filter-from');
    const t = document.getElementById('filter-to');
    const tp = document.getElementById('filter-type');
    if (s) s.value = '';
    if (f) f.value = '';
    if (t) t.value = '';
    if (tp) tp.value = '';
    renderTreasuryTable();
};

window.Views.treasury.afterMount = loadTreasuryData;

async function loadTreasuryData() {
    const tbody = document.getElementById('treasury-table-body');
    if (!tbody) return;
    
    // Sincronizar UI con el tab actual (evita desincronización al navegar)
    ['pending', 'history'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        if (btn) btn.classList.toggle('active-tab', t === _treasuryCurrentTab);
    });
    const filterBar = document.getElementById('history-filters');
    if (filterBar) filterBar.classList.toggle('hidden', _treasuryCurrentTab !== 'history');

    UI.loading('Cargando datos de tesorería...');
    try {
        const resp = await fetch('api/purchases.php').then(r => r.json());
        // Incluir Aprobada, Recibida y Completada — todas deben ser rastreables
        _treasuryData = (resp.purchases || []).filter(p =>
            p.estado === 'Aprobada' || p.estado === 'Recibida' || p.estado === 'Completada'
        );

        // --- ARCHITECTURE EXPERT: Pro-active payment check (Simulated Cron) ---
        fetch('api/cron_notifications.php').catch(e => console.error('Cron error:', e));

        // Actualizar contadores de tabs
        _updateTabCounts();

        // Si ya estamos en historial, aplicar filtros; si no, render normal
        if (_treasuryCurrentTab === 'history') applyHistoryFilters();
        else renderTreasuryTable();
    } catch {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>';
    } finally {
        UI.stopLoading();
    }
}

function _updateTabCounts() {
    let pending = 0, history = 0;
    _treasuryData.forEach(p => {
        const tieneMovilidad = parseFloat(p.monto_movilidad || 0) > 0;
        const movilidadPagada = tieneMovilidad ? (p.mobility_pagado == 1) : true;
        const esHistorial = (p.pagado == 1 && movilidadPagada);

        if (esHistorial) history++;
        else pending++;
    });
    const cp = document.getElementById('count-pending');
    const ch = document.getElementById('count-history');
    if (cp) cp.textContent = pending;
    if (ch) ch.textContent = history;
}

function renderTreasuryTable() {
    const tbody = document.getElementById('treasury-table-body');
    if (!tbody) return;

    const user = window.Auth.getUser();
    const esContabilidad = user?.role === 'contabilidad';
    const esTesoreria = user?.role === 'tesoreria';

    // --- LÓGICA DE FILTRADO UNIFICADA ---
    // Siempre calculamos desde _treasuryData fresco. Sin variables intermedias.
    let list;

    if (_treasuryCurrentTab === 'history') {
        // HISTORIAL: toda OC pagada O con estado Completada (ciclo operativo terminado)
        // Los filtros de usuario se leen directo del DOM en cada render.
        const search = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
        const from   = document.getElementById('filter-from')?.value || '';
        const to     = document.getElementById('filter-to')?.value || '';
        const type   = document.getElementById('filter-type')?.value || '';

        list = _treasuryData.filter(p => {
            const tieneMovilidad = parseFloat(p.monto_movilidad || 0) > 0;
            const movilidadPagada = tieneMovilidad ? (p.mobility_pagado == 1) : true;

            // REGLA PRINCIPAL: pagada completamente
            const esHistorial = (p.pagado == 1 && movilidadPagada);
            if (!esHistorial) return false;

            // Filtros de usuario (opcionales)
            if (search && !(
                (p.numero_oc || '').toLowerCase().includes(search) ||
                (p.proveedor_nombre || '').toLowerCase().includes(search)
            )) return false;
            if (from && p.fecha && p.fecha < from) return false;
            if (to   && p.fecha && p.fecha > to)   return false;
            if (type && p.tipo !== type) return false;

            return true;
        });
    } else {
        list = _treasuryData.filter(p => {
            const tieneMovilidad = parseFloat(p.monto_movilidad || 0) > 0;
            const movilidadPagada = tieneMovilidad ? (p.mobility_pagado == 1) : true;
            const esHistorial = (p.pagado == 1 && movilidadPagada);
            return !esHistorial;
        });

        // Ordenar por urgencia de pago
        list.sort((a, b) => {
            const getUrgencyDate = (p) => {
                const tieneMovilidad = parseFloat(p.monto_movilidad || 0) > 0;
                const movilidadPagada = tieneMovilidad ? (p.mobility_pagado == 1) : true;
                const esCuotas = parseInt(p.total_cuotas_reg || 0) > 0;
                
                // 1. ¿Está listo para pagar de inmediato (sin vencimiento estructurado)?
                const isContadoOTransferencia = p.condicion_pago !== 'Credito' && p.condicion_pago !== 'Alquiler' && p.condicion_pago !== 'Adelanto + Saldo';
                if (isContadoOTransferencia) {
                    return '1970-01-01'; // Urgencia máxima
                }
                
                // 2. Si es Adelanto + Saldo
                if (p.condicion_pago === 'Adelanto + Saldo') {
                    if (p.adelanto_pagado == 0) {
                        return p.fecha_pago_adelanto || '1970-01-01';
                    } else {
                        return p.fecha_pago_saldo_proyectado || '2100-01-01';
                    }
                }
                
                // 3. Si es cuotas o alquiler
                if (esCuotas && p.proxima_cuota_vencimiento) {
                    return p.proxima_cuota_vencimiento;
                }
                
                // 4. Si es crédito simple
                if (p.fecha_vencimiento) {
                    return p.fecha_vencimiento;
                }
                
                return '2099-12-31'; // Fallback último
            };

            const dateA = getUrgencyDate(a);
            const dateB = getUrgencyDate(b);
            
            if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
            }
            // En caso de misma fecha/prioridad, ordenar por ID descendente
            return parseInt(b.id) - parseInt(a.id);
        });
    }

    if (list.length === 0) {
        const msgs = { pending: 'No hay pagos pendientes.', history: 'No hay historial de pagos.' };
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-muted-foreground">${msgs[_treasuryCurrentTab]}</td></tr>`;
        return;
    }

    const monSym = p => p.moneda === 'USD' ? '$' : (p.moneda === 'EUR' ? '€' : 'S/');

    tbody.innerHTML = list.map(p => {
        const esCuotas = p.total_cuotas_reg > 0;
        const cuotasPag = parseInt(p.cuotas_pagadas || 0);
        const cuotasTot = parseInt(p.total_cuotas_reg || 0);

        let proximaCuotaHTML = '';
        if (esCuotas && p.proxima_cuota_vencimiento) {
            const nextVenc = p.proxima_cuota_vencimiento;
            const nextNum = p.proxima_cuota_numero;
            const parts = nextVenc.split('-');
            const dueDate = new Date(parts[0], parts[1] - 1, parts[2]);
            dueDate.setHours(0,0,0,0);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`; // dd/mm/yyyy
            
            if (diffDays < 0) {
                proximaCuotaHTML = `<div class="text-[10px] text-red-600 font-bold mt-1.5 flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded animate-pulse w-fit">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-red-600"></i>
                    <span>C${nextNum} venció hace ${Math.abs(diffDays)}d (${formattedDate})</span>
                </div>`;
            } else if (diffDays === 0) {
                proximaCuotaHTML = `<div class="text-[10px] text-orange-600 font-bold mt-1.5 flex items-center gap-1 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded animate-pulse w-fit">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-orange-600"></i>
                    <span>C${nextNum} vence hoy! (${formattedDate})</span>
                </div>`;
            } else {
                proximaCuotaHTML = `<div class="text-[10px] text-green-700 font-medium mt-1.5 flex items-center gap-1 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded w-fit">
                    <i data-lucide="calendar" class="w-3.5 h-3.5 text-green-600"></i>
                    <span>C${nextNum} vence: ${formattedDate} (en ${diffDays}d)</span>
                </div>`;
            }
        }

        // Badge de condición
        let condBadge = '';
        if (p.condicion_pago === 'Credito') {
            if (esCuotas) {
                condBadge = `<span class="badge badge-blue text-[10px]">Cuotas (${p.condicion_detalle})</span>`;
            } else {
                condBadge = `<span class="badge badge-yellow text-[10px]">Crédito ${p.condicion_detalle ? '(' + p.condicion_detalle + ')' : ''}</span>`;
            }
        } else if (p.condicion_pago === 'Alquiler') {
            condBadge = `<span class="badge badge-indigo text-[10px] flex items-center gap-1"><i data-lucide="repeat" class="w-3 h-3 animate-spin-slow"></i> Alquiler</span>`;
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
        const esOS = p.tipo === 'servicio';
        const tieneConformidad = p.conformidad_url || p.sin_conformidad == 1;
        const esAdelantoSaldo = p.condicion_pago === 'Adelanto + Saldo';
        const esAlquiler = p.es_alquiler == 1 || p.condicion_pago === 'Alquiler';
        const esPago100 = !esCuotas && !esAlquiler && !esAdelantoSaldo;

        // Función auxiliar para calcular días y mostrar badge estilizado
        const getListoParaPagarBadge = (p, labelExtra = '') => {
            const aprobadoFechaStr = p.fecha_aprobacion;
            if (!aprobadoFechaStr) {
                return `<span class="badge badge-green"><i data-lucide="check" class="w-3 h-3"></i> Listo para pagar${labelExtra}</span>`;
            }
            const parts = aprobadoFechaStr.split(' ')[0].split('-');
            const timeParts = aprobadoFechaStr.split(' ')[1] ? aprobadoFechaStr.split(' ')[1].split(':') : [0, 0, 0];
            const aprobadoDate = new Date(parts[0], parts[1] - 1, parts[2], timeParts[0], timeParts[1], timeParts[2]);
            const hoy = new Date();
            const d1 = new Date(aprobadoDate.getFullYear(), aprobadoDate.getMonth(), aprobadoDate.getDate());
            const d2 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
            
            let badgeText = '';
            let styleClass = '';
            
            if (diffDays <= 0) {
                badgeText = `hoy se aprobó, listo para pagar${labelExtra}`;
            } else if (diffDays === 1) {
                badgeText = `ayer se aprobó, listo para pagar${labelExtra}`;
            } else {
                const accion = (p.condicion_pago === 'Adelanto + Saldo' && p.adelanto_pagado == 0) ? 'listo para pagar' : 'hora de pagar';
                badgeText = `hace ${diffDays} días se aprobó, ${accion}${labelExtra}`;
            }
            
            if (diffDays >= 0 && diffDays <= 3) {
                styleClass = 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded px-2 py-0.5 text-[10px] flex items-center gap-1.5 w-fit';
            } else if (diffDays >= 4 && diffDays <= 5) {
                styleClass = 'bg-orange-50 border border-orange-200 text-orange-800 font-bold rounded px-2 py-0.5 text-[10px] flex items-center gap-1.5 w-fit';
            } else {
                styleClass = 'bg-rose-50 border border-rose-200 text-rose-800 font-bold rounded px-2 py-0.5 text-[10px] flex items-center gap-1.5 w-fit animate-pulse';
            }
            
            return `<span class="${styleClass}"><i data-lucide="check" class="w-3 h-3"></i> ${badgeText}</span>`;
        };

        if (p.pagado == 1) {
            estadoBadge = '<span class="badge badge-green"><i data-lucide="check-circle" class="w-3 h-3"></i> Pagado</span>';
        } else if (esOS && esPago100 && !tieneConformidad) {
            estadoBadge = '<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> A la espera de la conformidad</span>';
        } else if (p.condicion_pago === 'Alquiler' || esCuotas) {
            const labelText = p.condicion_pago === 'Alquiler' ? 'meses' : 'cuotas';
            const badgeCls = p.condicion_pago === 'Alquiler' ? 'badge-indigo' : 'badge-blue';
            const barCls = p.condicion_pago === 'Alquiler' ? 'bg-indigo-600' : 'bg-primary';
            const pct = cuotasTot > 0 ? (cuotasPag / cuotasTot * 100).toFixed(0) : 0;
            
            estadoBadge = `<div class="flex flex-col gap-1 w-full max-w-[170px]">
                <div class="flex items-center gap-2 justify-between">
                    <span class="badge ${badgeCls} text-[10px] font-bold">${cuotasPag}/${cuotasTot} ${labelText}</span>
                    <span class="text-[9px] text-muted-foreground font-semibold">${pct}% pagado</span>
                </div>
                <div class="w-full bg-muted rounded-full h-1.5 overflow-hidden font-normal">
                  <div class="${barCls} h-1.5 rounded-full" style="width:${pct}%"></div>
                </div>
                ${proximaCuotaHTML}
            </div>`;
        } else if (p.condicion_pago === 'Adelanto + Saldo') {
            if (p.adelanto_pagado == 0) {
                const info = parseDateAndDiff(p.fecha_pago_adelanto);
                if (!info) {
                    estadoBadge = `<div class="flex flex-col gap-0.5">
                        <span class="badge badge-yellow text-[10px]">Adelanto Pendiente</span>
                        <span class="text-[9px] text-muted-foreground font-semibold">Sin fecha programada</span>
                    </div>`;
                } else {
                    let cls, diffText;
                    if (info.diffDays < 0) {
                        cls = 'badge-red';
                        diffText = `<span class="text-[10px] text-red-600 font-bold">Adelanto VENCIDO hace ${Math.abs(info.diffDays)}d</span>`;
                    } else if (info.diffDays === 0) {
                        cls = 'badge-orange animate-pulse';
                        diffText = `<span class="text-[10px] text-orange-600 font-bold">¡Adelanto vence hoy!</span>`;
                    } else {
                        cls = 'badge-blue';
                        diffText = `<span class="text-[10px] text-blue-600 font-medium">Adelanto vence en ${info.diffDays}d</span>`;
                    }
                    estadoBadge = `<div class="flex flex-col gap-0.5 w-fit">
                        <span class="badge ${cls} text-[10px] font-bold">F. Pago Adelanto: ${info.formattedDate}</span>
                        ${diffText}
                    </div>`;
                }
            } else {
                const info = parseDateAndDiff(p.fecha_pago_saldo_proyectado);
                const confText = tieneConformidad 
                    ? '' 
                    : `<div class="text-[9px] text-amber-600 font-bold flex items-center gap-0.5 mt-0.5" title="Se requiere conformidad para pagar">
                         <i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-500"></i> Esperando Conf.
                       </div>`;
                
                if (!info) {
                    estadoBadge = `<div class="flex flex-col gap-0.5 w-fit">
                        <span class="badge badge-blue text-[10px]"><i data-lucide="check" class="w-3 h-3"></i> Adelanto Pagado</span>
                        <span class="text-[9px] text-muted-foreground font-semibold">Saldo sin fecha proyectada</span>
                        ${confText}
                    </div>`;
                } else {
                    let cls, diffText;
                    if (info.diffDays < 0) {
                        cls = 'badge-red';
                        diffText = `<span class="text-[10px] text-red-600 font-bold">Saldo VENCIDO hace ${Math.abs(info.diffDays)}d</span>`;
                    } else if (info.diffDays === 0) {
                        cls = 'badge-orange animate-pulse';
                        diffText = `<span class="text-[10px] text-orange-600 font-bold">¡Saldo vence hoy!</span>`;
                    } else {
                        cls = 'badge-green';
                        diffText = `<span class="text-[10px] text-green-700 font-medium">Saldo vence en ${info.diffDays}d</span>`;
                    }
                    estadoBadge = `<div class="flex flex-col gap-0.5 w-fit">
                        <span class="badge ${cls} text-[10px] font-bold">Saldo Proyectado: ${info.formattedDate}</span>
                        <div class="flex items-center gap-1.5 flex-wrap">
                            ${diffText}
                            ${confText}
                        </div>
                    </div>`;
                }
            }
        } else if (p.condicion_pago !== 'Credito' && p.condicion_pago !== 'Alquiler') {
            estadoBadge = getListoParaPagarBadge(p);
        } else if (p.fecha_vencimiento) {
            if (esOS && !tieneConformidad) {
                estadoBadge = '<span class="badge badge-yellow"><i data-lucide="clock" class="w-3 h-3"></i> A la espera de la conformidad</span>';
            } else {
                const parts = p.fecha_vencimiento.split('-');
                const dueDate = new Date(parts[0], parts[1] - 1, parts[2]);
                dueDate.setHours(0,0,0,0);
                const today = new Date();
                today.setHours(0,0,0,0);
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                
                let cls;
                if (diffDays < 0) {
                    cls = 'badge-red';
                } else if (diffDays === 0) {
                    cls = 'badge-orange';
                } else {
                    cls = 'badge-green';
                }
                
                const diffText = diffDays < 0 
                    ? `<span class="text-[10px] text-red-600 font-bold">VENCIDO hace ${Math.abs(diffDays)} días</span>`
                    : diffDays === 0
                        ? `<span class="text-[10px] text-orange-600 font-bold">¡Vence hoy!</span>`
                        : `<span class="text-[10px] text-green-700 font-medium">Faltan ${diffDays} días</span>`;
                
                estadoBadge = `<div class="flex flex-col gap-0.5">
                    <span class="badge ${cls} text-[10px]">Último día de pago: ${formattedDate}</span>
                    ${diffText}
                </div>`;
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

        const budgetBadge = p.dentro_presupuesto == 1 ? 
          `<span class="badge badge-green text-[9px] py-0.5 px-1.5 flex items-center gap-1 w-fit mt-1" title="Dentro de presupuesto"><i data-lucide="check" class="w-2.5 h-2.5"></i> En Ppto</span>` : 
          `<span class="badge badge-red text-[9px] py-0.5 px-1.5 flex items-center gap-1 w-fit mt-1 animate-pulse" title="Fuera de presupuesto"><i data-lucide="alert-triangle" class="w-2.5 h-2.5"></i> Fuera Ppto</span>`;

        return `
        <tr>
            <td>
                <div class="font-mono text-xs font-bold">${p.numero_oc}</div>
                <div class="text-[10px] text-muted-foreground">${p.tipo === 'servicio' ? 'Orden de Servicio' : 'Orden de Compra'}</div>
                ${budgetBadge}
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
                <div class="flex justify-end gap-1.5">
                    <button class="btn btn-ghost btn-sm" onclick="viewOrderDetails(${p.id})" title="Ver detallado de la OC/OS">
                        <i data-lucide="file-search" class="w-3.5 h-3.5"></i>
                        <span class="hidden sm:inline">Ver OC</span>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="openPaymentDetails(${p.id})">
                        <i data-lucide="${(p.pagado == 1 || esContabilidad) ? 'eye' : 'credit-card'}" class="w-3.5 h-3.5"></i>
                        ${(p.pagado == 1 || esContabilidad) ? 'Ver Detalle' : esCuotas ? 'Gestionar Cuotas' : 'Procesar Pago'}
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

window.openPaymentDetails = async function (id) {
    const p = _treasuryData.find(x => x.id == id);
    if (!p) return;

    const user = window.Auth.getUser();
    const esContabilidad = user?.role === 'contabilidad';
    const isAdmin = user?.role === 'admin';

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
    if (p.condicion_pago === 'Credito' || p.condicion_pago === 'Alquiler') {
        if (esCuotas) {
            // Vista de cuotas
            const cuotasHTML = cuotas.map(c => {
                const isPagada = c.pagado == 1;
                const venc = c.fecha_vencimiento ? new Date(c.fecha_vencimiento).toLocaleDateString('es-PE') : '—';
                const fechaPago = c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString('es-PE') : null;
                const descText = c.descripcion ? `<span class="badge badge-gray text-[9px] font-bold">${c.descripcion}</span>` : '';
                const tieneFactura = c.comprobante_url && c.comprobante_url !== '' && c.comprobante_url !== 'null';
                return `
                <div class="flex items-center justify-between p-2.5 rounded-lg border ${isPagada ? 'bg-green-50 border-green-200' : 'bg-white border-border'}">
                    <div class="flex items-center gap-3">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isPagada ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}">
                            ${isPagada ? '✓' : c.numero_cuota}
                        </div>
                        <div>
                            <div class="text-xs font-bold flex items-center gap-1.5">
                                Cuota ${c.numero_cuota} de ${c.total_cuotas}
                                ${descText}
                            </div>
                            <div class="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                <span>Vence: ${venc} ${isPagada ? '· Pagado: ' + fechaPago : ''}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- Factura de la cuota -->
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

                        <span class="font-bold text-sm ${isPagada ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(c.monto_cuota).toFixed(2)}</span>
                        ${!isPagada && !esContabilidad ? `
                            <button class="btn btn-primary btn-sm text-xs px-2 py-1" onclick="pagarCuota(${p.id}, ${c.id}, '${p.numero_oc}-C${c.numero_cuota}')">
                                <i data-lucide="credit-card" class="w-3 h-3"></i> Pagar
                            </button>
                        ` : !isPagada ? `
                            <span class="badge badge-yellow text-[10px]">Pendiente</span>
                        ` : `
                            ${c.voucher_url ? `
                                <div class="flex items-center gap-1">
                                    <a href="${c.voucher_url}" target="_blank" class="btn btn-ghost btn-sm text-xs px-1.5"><i data-lucide="external-link" class="w-3 h-3"></i></a>
                                    ${isAdmin ? `
                                        <button class="btn btn-ghost btn-sm text-xs text-destructive px-1.5" onclick="clearVoucher(${p.id}, 'cuota', ${c.id})" title="Borrar voucher cuota">
                                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            ` : ''}
                        `}
                    </div>
                </div>`;
            }).join('');

            const isAlquiler = p.es_alquiler == 1 || p.condicion_pago === 'Alquiler';
            const titleHtml = isAlquiler ? `
                <div class="flex flex-col gap-0.5">
                    <h4 class="font-bold text-sm flex items-center gap-2 text-primary">
                        <i data-lucide="repeat" class="w-4 h-4 text-primary animate-spin-slow"></i>
                        Cronograma de Alquiler Recurrente
                    </h4>
                    <div class="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <span class="badge badge-indigo text-[9px] py-0.5">🔄 Alquiler Recurrente</span>
                        <span>· Día de pago: ${p.dia_pago || '30'} de cada mes</span>
                    </div>
                </div>
            ` : `
                <h4 class="font-bold text-sm flex items-center gap-2 text-primary">
                    <i data-lucide="layers" class="w-4 h-4"></i>
                    Cronograma de Cuotas — ${cuotasPag}/${cuotas.length} pagadas
                </h4>
            `;

            condPagoSection = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        ${titleHtml}
                        <div class="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
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
        
        let adelantoDesc = '';
        if (isAdelantoPagado) {
            const partsReal = p.adelanto_fecha ? p.adelanto_fecha.split(' ')[0].split('-') : null;
            const formattedReal = partsReal ? `${partsReal[2]}/${partsReal[1]}/${partsReal[0]}` : '—';
            adelantoDesc = `<span class="text-green-600 font-bold">✓ Pagado el ${formattedReal}</span>`;
        } else {
            const info = parseDateAndDiff(p.fecha_pago_adelanto);
            if (info) {
                const daysText = info.diffDays < 0 
                    ? `<span class="text-red-600 font-bold">(VENCIDO hace ${Math.abs(info.diffDays)} días)</span>`
                    : info.diffDays === 0
                        ? `<span class="text-orange-600 font-bold">(¡Vence hoy!)</span>`
                        : `<span class="text-green-700 font-medium">(Faltan ${info.diffDays} días)</span>`;
                adelantoDesc = `<span class="text-slate-600 font-medium">Programado: ${info.formattedDate}</span> ${daysText}`;
            } else {
                adelantoDesc = '<span class="text-muted-foreground font-medium">Pendiente de pago</span>';
            }
        }

        let saldoDesc = '';
        if (p.pagado == 1) {
            const partsReal = p.fecha_pago ? p.fecha_pago.split(' ')[0].split('-') : null;
            const formattedReal = partsReal ? `${partsReal[2]}/${partsReal[1]}/${partsReal[0]}` : '—';
            saldoDesc = `<span class="text-green-600 font-bold">✓ Pagado el ${formattedReal}</span>`;
        } else {
            const info = parseDateAndDiff(p.fecha_pago_saldo_proyectado);
            if (info) {
                const daysText = info.diffDays < 0 
                    ? `<span class="text-red-600 font-bold">(VENCIDO hace ${Math.abs(info.diffDays)} días)</span>`
                    : info.diffDays === 0
                        ? `<span class="text-orange-600 font-bold">(¡Vence hoy!)</span>`
                        : `<span class="text-green-700 font-medium">(Faltan ${info.diffDays} días)</span>`;
                saldoDesc = `<span class="text-slate-600 font-medium">Proyectado: ${info.formattedDate}</span> ${daysText}`;
            } else {
                saldoDesc = '<span class="text-muted-foreground font-medium">Se paga al finalizar/entrega</span>';
            }
        }

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
                            <div class="text-xs font-bold text-slate-800">Adelanto (${p.adelanto_porcentaje}%)</div>
                            <div class="text-[10px] flex items-center gap-1.5 flex-wrap mt-0.5">${adelantoDesc}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-sm ${isAdelantoPagado ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(p.adelanto_monto).toFixed(2)}</span>
                            ${!isAdelantoPagado && !esContabilidad ? `
                                <button class="btn btn-primary btn-sm text-xs px-2 py-1" onclick="pagarAdelanto(${p.id}, '${p.numero_oc}-ADELANTO')">
                                    <i data-lucide="credit-card" class="w-3 h-3"></i> Pagar Adelanto
                                </button>
                            ` : !isAdelantoPagado ? `
                                <span class="badge badge-yellow text-[10px]">Pendiente</span>
                            ` : `
                                ${p.adelanto_voucher ? `
                                    <div class="flex items-center gap-1">
                                        <a href="${p.adelanto_voucher}" target="_blank" class="btn btn-ghost btn-sm text-xs px-1.5"><i data-lucide="external-link" class="w-3 h-3"></i></a>
                                        ${isAdmin ? `
                                            <button class="btn btn-ghost btn-sm text-xs text-destructive px-1.5" onclick="clearVoucher(${p.id}, 'adelanto')" title="Borrar voucher de adelanto">
                                                <i data-lucide="trash-2" class="w-3 h-3"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            `}
                        </div>
                    </div>
                    <!-- Saldo -->
                    <div class="flex items-center justify-between p-2.5 rounded-lg border ${p.pagado == 1 ? 'bg-green-50 border-green-200' : 'bg-white border-border'}">
                        <div>
                            <div class="text-xs font-bold text-slate-800">Saldo Final</div>
                            <div class="text-[10px] flex items-center gap-1.5 flex-wrap mt-0.5">${saldoDesc}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-sm ${p.pagado == 1 ? 'text-green-700' : 'text-primary'}">${monSym} ${parseFloat(p.saldo_monto).toFixed(2)}</span>
                            ${p.pagado == 0 && isAdelantoPagado && !esContabilidad ? `
                                <button class="btn btn-primary btn-sm text-xs px-2 py-1" onclick="openFinalPayment(${p.id}, '${p.numero_oc}-SALDO', '${p.conformidad_url || ''}', ${p.sin_conformidad})">
                                    <i data-lucide="credit-card" class="w-3 h-3"></i> Pagar Saldo
                                </button>
                            ` : p.pagado == 0 && isAdelantoPagado ? `
                                <span class="badge badge-yellow text-[10px]">Pendiente</span>
                            ` : ''}
                        </div>
                    </div>
                </div>`;
    }

    // --- Sección de Comprobante / Conformidad (SIEMPRE visible con estado claro) ---
    const hasConformidad = !!(p.conformidad_url);
    const hasFactura = !!(p.comprobante_url);
    const esSinConformidad = p.sin_conformidad == 1;

    const conformidadCard = hasConformidad ? `
        <a href="${p.conformidad_url}" target="_blank"
           class="group flex flex-col gap-2 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-400 hover:shadow-md transition-all cursor-pointer">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <i data-lucide="file-check-2" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <div class="text-xs font-bold text-green-800">Conformidad</div>
                        <div class="text-[10px] text-green-600">Documento de recepción</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 bg-green-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg group-hover:bg-green-600 transition-colors">
                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                    Abrir
                </div>
            </div>
            <div class="text-[10px] text-green-700 bg-green-100 rounded-md px-2 py-1 flex items-center gap-1 font-medium">
                <i data-lucide="check-circle" class="w-3 h-3"></i> Subida y disponible — clic para visualizar
            </div>
        </a>
    ` : esSinConformidad ? `
        <div class="flex flex-col gap-2 p-4 rounded-xl border-2 border-blue-200 bg-blue-50">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-9 h-9 rounded-lg bg-blue-400 flex items-center justify-center shadow-sm">
                        <i data-lucide="file-check-2" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <div class="text-xs font-bold text-blue-800">Conformidad</div>
                        <div class="text-[10px] text-blue-600">Documento de recepción</div>
                    </div>
                </div>
                <span class="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg border border-blue-200">Sin conformidad</span>
            </div>
            <div class="text-[10px] text-blue-700 bg-blue-100 rounded-md px-2 py-1 flex items-center gap-1 font-medium">
                <i data-lucide="info" class="w-3 h-3"></i> Marcado como "No requiere conformidad"
            </div>
        </div>
    ` : `
        <div class="flex flex-col gap-2 p-4 rounded-xl border-2 border-dashed border-red-200 bg-red-50">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-9 h-9 rounded-lg bg-red-100 border-2 border-red-200 flex items-center justify-center">
                        <i data-lucide="file-x-2" class="w-5 h-5 text-red-400"></i>
                    </div>
                    <div>
                        <div class="text-xs font-bold text-red-700">Conformidad</div>
                        <div class="text-[10px] text-red-500">Pendiente de subir</div>
                    </div>
                </div>
                <span class="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-1 rounded-lg border border-red-200 animate-pulse">No subida</span>
            </div>
            <div class="text-[10px] text-red-600 bg-red-100 rounded-md px-2 py-1 flex items-center gap-1 font-medium">
                <i data-lucide="alert-triangle" class="w-3 h-3"></i> Compras debe subir la conformidad
            </div>
        </div>
    `;

    const facturaCard = hasFactura ? `
        <a href="${p.comprobante_url}" target="_blank"
           class="group flex flex-col gap-2 p-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <i data-lucide="receipt" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <div class="text-xs font-bold text-orange-800">Factura / RxH</div>
                        <div class="text-[10px] text-orange-600">Comprobante de pago</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 bg-orange-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg group-hover:bg-orange-600 transition-colors">
                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                    Abrir
                </div>
            </div>
            <div class="text-[10px] text-orange-700 bg-orange-100 rounded-md px-2 py-1 flex items-center gap-1 font-medium">
                <i data-lucide="check-circle" class="w-3 h-3"></i> Subida y disponible — clic para visualizar
            </div>
        </a>
    ` : `
        <div class="flex flex-col gap-2 p-4 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-9 h-9 rounded-lg bg-amber-100 border-2 border-amber-200 flex items-center justify-center">
                        <i data-lucide="receipt" class="w-5 h-5 text-amber-400"></i>
                    </div>
                    <div>
                        <div class="text-xs font-bold text-amber-700">Factura / RxH</div>
                        <div class="text-[10px] text-amber-500">Pendiente de subir</div>
                    </div>
                </div>
                <span class="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded-lg border border-amber-200">No subida</span>
            </div>
            <div class="text-[10px] text-amber-600 bg-amber-100 rounded-md px-2 py-1 flex items-center gap-1 font-medium">
                <i data-lucide="clock" class="w-3 h-3"></i> ${p.pagado == 1 ? 'Compras debe subir la factura' : 'Disponible tras el pago'}
            </div>
        </div>
    `;

    const docSection = `
        <div class="space-y-2">
            <div class="flex items-center gap-2">
                <div class="w-1 h-4 rounded-full bg-primary"></div>
                <p class="text-xs uppercase font-bold text-foreground/70 tracking-wide">Documentación Adjunta</p>
                <div class="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    ${hasConformidad ? '<span class="flex items-center gap-1 text-green-600 font-semibold"><i data-lucide="check" class="w-3 h-3"></i>Conf.</span>' : ''}
                    ${hasFactura ? '<span class="flex items-center gap-1 text-orange-600 font-semibold"><i data-lucide="check" class="w-3 h-3"></i>Factura</span>' : ''}
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${conformidadCard}
                ${facturaCard}
            </div>
        </div>`;

    // --- Sección de pago (solo si no es cuotas ni adelanto o si no está pagado) ---
    const isAdelantoSaldo = p.condicion_pago === 'Adelanto + Saldo';
    const esOS = p.tipo === 'servicio';
    const tieneConformidad = p.conformidad_url || p.sin_conformidad == 1;
    const esPago100 = !esCuotas && !isAdelantoSaldo;
    const pagoBloqueadoPorConformidad = esOS && esPago100 && !tieneConformidad;

    const showPayForm = !esCuotas && !isAdelantoSaldo && p.pagado == 0 && !esContabilidad && !pagoBloqueadoPorConformidad;
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

            <!-- Detalle de Ítems OC/OS -->
            <div class="card p-0 overflow-hidden">
                <div class="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b">
                    <i data-lucide="list" class="w-3.5 h-3.5 text-primary"></i>
                    <span class="text-xs font-bold uppercase tracking-wide">Detalle de Ítems</span>
                    <span class="ml-auto text-[10px] text-muted-foreground">${(fullOC.items || []).length} ítem(s)</span>
                </div>
                <div class="max-h-64 overflow-y-auto">
                    <table class="w-full text-xs">
                        <thead class="bg-muted sticky top-0 z-10">
                            <tr>
                                <th class="px-3 py-2 text-left font-bold">Categoría</th>
                                <th class="px-3 py-2 text-left font-bold">Descripción / Detalle</th>
                                <th class="px-3 py-2 text-right font-bold w-20">P. Unit.</th>
                                <th class="px-3 py-2 text-center font-bold w-12">Cant.</th>
                                <th class="px-3 py-2 text-right font-bold w-22">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${(fullOC.items || []).map(it => `
                            <tr class="hover:bg-muted/20 transition-colors">
                                <td class="px-3 py-2 font-medium text-primary/80">${it.categoria_nombre || '—'}</td>
                                <td class="px-3 py-2 text-muted-foreground">${(it.descripcion && it.descripcion !== it.categoria_nombre) ? it.descripcion : '—'}</td>
                                <td class="px-3 py-2 text-right">${monSym} ${parseFloat(it.precio_unitario || 0).toFixed(2)}</td>
                                <td class="px-3 py-2 text-center">${it.cantidad}</td>
                                <td class="px-3 py-2 text-right font-semibold">${monSym} ${parseFloat(it.total).toFixed(2)}</td>
                            </tr>`).join('')}
                        </tbody>
                        <tfoot class="bg-muted/50 border-t-2 font-bold">
                            <tr>
                                <td colspan="4" class="px-3 py-2 text-right uppercase text-[9px] tracking-wide">Subtotal OC/OS</td>
                                <td class="px-3 py-2 text-right">${monSym} ${parseFloat(p.total || 0).toFixed(2)}</td>
                            </tr>
                            ${p.monto_movilidad > 0 ? `
                            <tr>
                                <td colspan="4" class="px-3 py-2 text-right uppercase text-[9px] text-orange-600 tracking-wide">Movilidad (Sep.)</td>
                                <td class="px-3 py-2 text-right text-orange-600">${monSym} ${parseFloat(p.monto_movilidad).toFixed(2)}</td>
                            </tr>
                            <tr class="bg-primary/5 text-primary">
                                <td colspan="4" class="px-3 py-2 text-right uppercase text-[10px] font-black tracking-wide">Total Operación</td>
                                <td class="px-3 py-2 text-right font-black">${monSym} ${(parseFloat(p.total) + parseFloat(p.monto_movilidad)).toFixed(2)}</td>
                            </tr>` : ''}
                        </tfoot>
                    </table>
                </div>
            </div>

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
                    ${!esContabilidad ? `
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
                    <div class="border-t border-orange-200 pt-2">
                        <span class="text-[10px] text-orange-700 font-medium italic">Pendiente de pago</span>
                    </div>
                    `}
                ` : `
                    <div class="border-t border-orange-200 pt-2 flex justify-between items-center">
                        <span class="text-[10px] text-green-700 font-medium italic">Pagado el ${new Date(fullOC.mobility.fecha_pago).toLocaleDateString('es-PE')}</span>
                        ${fullOC.mobility.voucher_url ? `
                            <div class="flex items-center gap-1.5">
                                <a href="${fullOC.mobility.voucher_url}" target="_blank" class="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"><i data-lucide="external-link" class="w-3 h-3"></i>Ver Voucher</a>
                                ${isAdmin ? `
                                    <button class="text-destructive hover:underline text-[10px] font-bold flex items-center gap-0.5" onclick="clearVoucher(${p.id}, 'mobility')" title="Borrar voucher movilidad">
                                        <i data-lucide="trash-2" class="w-2.5 h-2.5"></i>Borrar
                                    </button>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                `}
            </div>` : ''}

            ${p.pagado == 0 && !esCuotas && !isAdelantoSaldo && esContabilidad ? `
                <div class="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <h4 class="font-bold text-yellow-800 flex items-center gap-2 mb-2 text-sm"><i data-lucide="clock" class="w-4 h-4"></i>Pago Pendiente</h4>
                    <p class="text-xs text-yellow-700">Esta orden de compra aún no ha sido pagada.</p>
                </div>
            ` : ''}

            ${pagoBloqueadoPorConformidad ? `
                <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                    <i data-lucide="alert-circle" class="w-10 h-10 text-red-500 mx-auto mb-2"></i>
                    <h3 class="font-bold text-red-800 text-sm animate-pulse">PAGO BLOQUEADO</h3>
                    <p class="text-xs text-red-600 mt-1">El encargado de compras aún no ha subido la <strong>Conformidad de Servicio</strong> o marcado su ausencia.</p>
                    <p class="text-[10px] text-red-500 mt-2">Es obligatorio validar la entrega del servicio antes de proceder con el pago.</p>
                </div>
            ` : ''}

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
                    ${p.voucher_url ? `
                        <a href="${p.voucher_url}" target="_blank" class="btn btn-outline btn-sm mt-3 w-full bg-white text-xs"><i data-lucide="external-link"></i>Ver Voucher en Drive</a>
                        ${isAdmin ? `
                            <button class="btn btn-outline btn-sm mt-1.5 w-full bg-red-50 text-destructive border-red-200 text-xs flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors" onclick="clearVoucher(${p.id}, 'saldo')" title="Borrar voucher principal">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Borrar Voucher Principal
                            </button>
                        ` : ''}
                    ` : ''}
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

window.clearVoucher = async function(ordenId, type, cuotaId = null) {
    if (!confirm('¿Está seguro de que desea eliminar este voucher? El pago volverá a figurar como pendiente en el sistema.')) return;
    
    UI.loading('Eliminando voucher...');
    try {
        const user = window.Auth.getUser();
        const resp = await fetch('api/purchases.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'clear_voucher',
                id: ordenId,
                type: type,
                cuota_id: cuotaId,
                usuario_id: user?.id
            })
        });
        const res = await resp.json();
        UI.stopLoading();
        if (res.ok) {
            UI.toast('Voucher eliminado correctamente.', 'success');
            // Cerrar backdrops del modal
            document.querySelectorAll('.modal-backdrop').forEach(m => m.remove());
            setTimeout(() => {
                location.reload();
            }, 500);
        } else {
            UI.toast('Error: ' + (res.error || 'No se pudo eliminar el voucher'), 'error');
        }
    } catch(e) {
        UI.stopLoading();
        console.error(e);
        UI.toast('Error de red al intentar eliminar el voucher', 'error');
    }
};
