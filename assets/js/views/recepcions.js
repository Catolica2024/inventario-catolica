// assets/js/views/recepcions.js — Recepción con gestión de documentos (Conformidad + Factura)
let _recepcionResources = { locs: [] };
let _recepcionCurrentTab = 'pending'; // 'pending' | 'history'
let _recepcionAllOrders  = [];        // cache de todas las órdenes aprobadas/recibidas/completadas

// ── Resources ────────────────────────────────────────────────────────────────
async function loadRecepcionResources() {
    try {
        const resp = await fetch('api/locations.php').then(r => r.json());
        _recepcionResources.locs = (resp.locations || []).filter(l => l.tipo === 'Depósito' && l.estado === 'activo');
    } catch(e) { console.error('Error loading recepcion resources:', e); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _docState(p) {
    const hasConf  = !!p.conformidad_url;
    const hasComp  = !!p.comprobante_url;
    if (hasConf && hasComp)  return 'complete';   // ambos → historial
    if (hasConf && !hasComp) return 'need-comp';  // solo conformidad → necesita factura
    return 'need-both';                            // ninguno → necesita todo
}

// ── Tab switching ─────────────────────────────────────────────────────────────
window.switchRecepcionTab = function(tab) {
    _recepcionCurrentTab = tab;
    ['pending','history'].forEach(t => {
        const btn = document.getElementById('rec-tab-' + t);
        if (btn) btn.classList.toggle('active-tab', t === tab);
    });
    const banner = document.getElementById('rec-pending-banner');
    if (banner) banner.classList.toggle('hidden', tab !== 'pending');
    renderRecepcionTable();
};

// ── Load data from API ────────────────────────────────────────────────────────
async function loadRecepcions() {
    const tbody = document.getElementById('recepcions-table-body');
    if (!tbody) return;
    try {
        // Traer aprobadas + recibidas + completadas
        const [approved, completed] = await Promise.all([
            fetch('api/purchases.php?approved_only=1').then(r => r.json()),
            fetch('api/purchases.php').then(r => r.json())
        ]);

        const approvedList  = (approved.purchases || []);
        // Incluir Completadas del segundo fetch para el historial
        const completedList = (completed.purchases || []).filter(p =>
            p.estado === 'Completada' && p.comprobante_url && p.conformidad_url
        );

        // Merge: approved_only ya devuelve Aprobada y Recibida
        // Añadir Completadas que tengan ambos docs (historial)
        const allIds = new Set(approvedList.map(p => p.id));
        const merged = [...approvedList];
        completedList.forEach(p => { if (!allIds.has(p.id)) merged.push(p); });

        _recepcionAllOrders = merged;
        _updateRecepcionTabCounts();
        renderRecepcionTable();
    } catch {
        document.getElementById('recepcions-table-body').innerHTML =
            '<tr><td colspan="6" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>';
    }
}

function _updateRecepcionTabCounts() {
    let pending = 0, history = 0;
    _recepcionAllOrders.forEach(p => {
        _docState(p) === 'complete' ? history++ : pending++;
    });
    const cp = document.getElementById('rec-count-pending');
    const ch = document.getElementById('rec-count-history');
    if (cp) cp.textContent = pending;
    if (ch) ch.textContent = history;
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderRecepcionTable() {
    const tbody = document.getElementById('recepcions-table-body');
    if (!tbody) return;

    const list = _recepcionAllOrders.filter(p =>
        _recepcionCurrentTab === 'history'
            ? _docState(p) === 'complete'
            : _docState(p) !== 'complete'
    );

    if (list.length === 0) {
        const msg = _recepcionCurrentTab === 'history'
            ? 'No hay órdenes con documentación completa aún.'
            : 'No hay órdenes pendientes de documentación. ¡Todo al día!';
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-muted-foreground">${msg}</td></tr>`;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = list.map(p => {
        const ds = _docState(p);
        // ¿Es OC/OS en cuotas?
        const esCuotas = parseInt(p.total_cuotas_reg) > 0;
        const cuotasConFac = parseInt(p.cuotas_con_factura) || 0;
        const totalCuotas = parseInt(p.total_cuotas_reg) || 0;

        // ── Badge de estado documental ──
        let docBadge = '';
        if (ds === 'complete') {
            docBadge = `
                <div class="flex flex-col gap-1">
                    <span class="badge badge-green w-fit flex items-center gap-1">
                        <i data-lucide="check-check" class="w-3 h-3"></i> Documentación completa
                    </span>
                    <div class="flex gap-2 mt-0.5">
                        ${p.conformidad_url ? `<a href="${p.conformidad_url}" target="_blank" class="text-[10px] text-primary hover:underline flex items-center gap-1"><i data-lucide="file-check" class="w-3 h-3"></i>Acta</a>` : ''}
                        ${p.comprobante_url ? `<a href="${p.comprobante_url}" target="_blank" class="text-[10px] text-primary hover:underline flex items-center gap-1"><i data-lucide="file-text" class="w-3 h-3"></i>Factura</a>` : ''}
                    </div>
                </div>`;
        } else if (ds === 'need-comp') {
            docBadge = `
                <div class="flex flex-col gap-1">
                    <span class="badge badge-blue w-fit flex items-center gap-1">
                        <i data-lucide="file-check" class="w-3 h-3"></i> Conformidad ✓
                    </span>
                    <span class="text-[10px] text-orange-600 font-bold flex items-center gap-1">
                        <i data-lucide="alert-circle" class="w-3 h-3"></i> Factura pendiente
                    </span>
                </div>`;
        } else {
            docBadge = `
                <span class="badge badge-green w-fit flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Por Recibir
                </span>`;
        }

        // ── Badge de cuotas con factura ──
        let cuotasBadge = '';
        if (esCuotas) {
            const allFac = cuotasConFac >= totalCuotas;
            cuotasBadge = `
                <div class="mt-1">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        allFac
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                    }">
                        <i data-lucide="receipt" class="w-3 h-3"></i>
                        ${cuotasConFac}/${totalCuotas} facturas de cuota
                    </span>
                </div>`;
        }

        // ── Botón de acción ──
        let actionBtn = '';
        if (ds === 'complete') {
            actionBtn = `<span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Completo
            </span>`;
        } else if (ds === 'need-comp') {
            actionBtn = `
                <button class="btn btn-amber-outline btn-sm btn-sm-auto"
                        onclick="uploadFactura(${p.id}, '${p.numero_oc}')">
                    <i data-lucide="upload" class="w-3.5 h-3.5"></i>
                    Subir Factura
                </button>`;
        } else {
            // Estado Aprobada — primera recepción
            actionBtn = `
                <button class="btn btn-primary btn-sm btn-sm-auto"
                        onclick="processRecepcion(${p.id}, '${p.numero_oc}')">
                    <i data-lucide="package-check" class="w-3.5 h-3.5"></i>
                    Subir Conformidad y Factura
                </button>`;
        }

        // Botón extra para facturas de cuotas (si tiene cuotas registradas)
        const cuotaBtn = esCuotas ? `
            <button class="btn btn-outline btn-sm btn-sm-auto text-blue-600 border-blue-200 hover:bg-blue-50"
                    onclick="gestionarFacturasCuotas(${p.id}, '${p.numero_oc}')" title="Ver y subir facturas de cuotas">
                <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                Fact. Cuotas
            </button>` : '';

        return `
        <tr class="${ds === 'complete' ? 'opacity-75' : ''}">
            <td class="font-mono text-xs font-bold text-primary">${p.numero_oc}</td>
            <td>
                <div class="font-bold text-sm">${p.proveedor_nombre}</div>
                <div class="text-[10px] text-muted-foreground uppercase">${p.area_nombre || 'Sin área'}</div>
            </td>
            <td class="text-xs font-medium">${p.fecha || '—'}</td>
            <td>${docBadge}${cuotasBadge}</td>
            <td class="text-right">
                <div class="flex justify-end items-center gap-1.5 flex-wrap">
                    <button class="btn btn-ghost p-1.5" title="Ver Detalles" onclick="viewOrderDetails(${p.id})">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    ${cuotaBtn}
                    ${actionBtn}
                </div>
            </td>
        </tr>`;
    }).join('');

    lucide.createIcons();
}

// ── Gestionar facturas de cuotas ─────────────────────────────────────────────
window.gestionarFacturasCuotas = async function(id, numero_oc) {
    UI.loading('Cargando cuotas...');
    let cuotas = [];
    let moneda = 'PEN';
    try {
        const data = await fetch(`api/purchases.php?id=${id}`).then(r => r.json());
        cuotas = data.purchase?.cuotas || [];
        moneda = data.purchase?.moneda || 'PEN';
    } catch(e) {
        UI.stopLoading();
        UI.toast('Error al cargar cuotas', 'error');
        return;
    }
    UI.stopLoading();
    if (cuotas.length === 0) {
        UI.toast('Esta orden no tiene cuotas registradas', 'warning');
        return;
    }
    const monSym = moneda === 'USD' ? '$' : (moneda === 'EUR' ? '€' : 'S/');
    const cuotasHTML = cuotas.map(c => {
        const tieneFac = !!c.comprobante_url;
        return `
        <div class="border border-border rounded-xl p-4 flex items-center justify-between gap-3 ${
            tieneFac ? 'bg-emerald-50 border-emerald-200' : 'bg-white'
        }">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${
                    tieneFac ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'
                }">${c.numero_cuota}</div>
                <div>
                    <div class="text-sm font-bold">${c.descripcion || `Cuota ${c.numero_cuota} de ${c.total_cuotas}`}</div>
                    <div class="text-[10px] text-muted-foreground">Vence: ${c.fecha_vencimiento} · ${monSym} ${parseFloat(c.monto_cuota).toFixed(2)}</div>
                    ${tieneFac ? `<a href="${c.comprobante_url}" target="_blank" class="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-0.5"><i data-lucide="file-text" class="w-3 h-3"></i> Ver factura subida</a>` : ''}
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                ${tieneFac
                    ? `<span class="badge badge-green text-[10px]"><i data-lucide="check" class="w-2.5 h-2.5"></i> Factura OK</span>`
                    : `<button class="btn btn-outline btn-sm text-amber-700 border-amber-300 hover:bg-amber-50"
                          onclick="uploadFacturaCuota(${id}, '${numero_oc}', ${c.id}, ${c.numero_cuota}, ${c.total_cuotas})">
                           <i data-lucide="upload" class="w-3.5 h-3.5"></i> Subir Factura
                       </button>`
                }
            </div>
        </div>`;
    }).join('');

    UI.modal({
        title: `📋 Facturas por Cuota — ${numero_oc}`,
        body: `
            <div class="space-y-3">
                <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                    <i data-lucide="info" class="w-4 h-4 shrink-0 mt-0.5"></i>
                    <span>Cada cuota de esta orden requiere su propia factura del proveedor. Suba la factura correspondiente a cada cuota conforme la reciba.</span>
                </div>
                <div class="space-y-2">${cuotasHTML}</div>
            </div>`,
        confirmText: 'Cerrar',
        onConfirm: () => { loadRecepcions(); return true; }
    });
    setTimeout(() => lucide.createIcons(), 80);
};

// ── Subir factura a una cuota individual ──────────────────────────────────────
window.uploadFacturaCuota = async function(orden_id, numero_oc, cuota_id, numero_cuota, total_cuotas) {
    UI.modal({
        title: `📄 Factura — Cuota ${numero_cuota}/${total_cuotas} · ${numero_oc}`,
        body: `
            <div class="space-y-4">
                <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <i data-lucide="info" class="w-5 h-5 text-blue-600 mt-0.5 shrink-0"></i>
                    <div>
                        <p class="text-sm font-bold text-blue-800">Factura de Cuota ${numero_cuota} de ${total_cuotas}</p>
                        <p class="text-xs text-blue-700 mt-0.5">Suba la factura que el proveedor le entregó correspondiente a esta cuota.</p>
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block">Factura / Comprobante de la Cuota <span class="text-destructive">*</span></label>
                    <div class="relative group">
                        <input type="file" id="fac-cuota-archivo" class="hidden" accept="image/*,application/pdf"
                               onchange="document.getElementById('fac-cuota-name').textContent = this.files[0]?.name || 'Seleccionar archivo...';">
                        <label for="fac-cuota-archivo" class="flex items-center justify-between p-3 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                    <i data-lucide="file-text"></i>
                                </div>
                                <span id="fac-cuota-name" class="text-sm font-medium text-muted-foreground">Subir factura de la cuota ${numero_cuota}...</span>
                            </div>
                            <span class="btn btn-ghost btn-sm">Explorar</span>
                        </label>
                    </div>
                    <p class="text-[10px] text-muted-foreground mt-2 italic">El archivo se subirá a Google Drive y solo se guardará el enlace.</p>
                </div>
            </div>`,
        confirmText: `✓ Registrar Factura Cuota ${numero_cuota}`,
        onConfirm: async () => {
            const file = document.getElementById('fac-cuota-archivo').files[0];
            if (!file) { UI.toast('Debe seleccionar la factura de la cuota', 'error'); return false; }

            UI.loading(`Subiendo factura de cuota ${numero_cuota} a Google Drive...`);
            const driveLink = await uploadReceptionFileToDrive(file, `FACTURA_CUOTA${numero_cuota}_${numero_oc}`);
            if (!driveLink) {
                UI.stopLoading();
                UI.toast('No se pudo subir el archivo a Drive. Intente de nuevo.', 'error');
                return false;
            }

            UI.loading('Registrando factura en el sistema...');
            const res = await fetch('api/recepcions.php', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upload_cuota_factura',
                    purchase_id: orden_id,
                    cuota_id: cuota_id,
                    comprobante_url: driveLink
                })
            }).then(r => r.json());

            UI.stopLoading();
            if (res.ok) {
                UI.toast(`✅ Factura de Cuota ${numero_cuota}/${total_cuotas} registrada correctamente.`, 'success');
                // Reabrir el gestor actualizado
                await gestionarFacturasCuotas(orden_id, numero_oc);
                return true;
            } else {
                UI.toast('Error: ' + res.error, 'error');
                return false;
            }
        }
    });
    setTimeout(() => lucide.createIcons(), 60);
};

// ── Upload solo factura (cuando conformidad ya existe) ────────────────────────
window.uploadFactura = async function(id, numero_oc) {
    UI.modal({
        title: `📄 Subir Factura — ${numero_oc}`,
        body: `
            <div class="space-y-4">
                <div class="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                    <i data-lucide="info" class="w-5 h-5 text-orange-600 mt-0.5 shrink-0"></i>
                    <div>
                        <p class="text-sm font-bold text-orange-800">Conformidad ya registrada ✓</p>
                        <p class="text-xs text-orange-700 mt-0.5">Solo falta subir la factura o comprobante de pago para completar el ciclo documental.</p>
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block">Factura / Comprobante de Pago <span class="text-destructive">*</span></label>
                    <div class="relative group">
                        <input type="file" id="fac-archivo" class="hidden" accept="image/*,application/pdf"
                               onchange="document.getElementById('fac-file-name').textContent = this.files[0]?.name || 'Seleccionar archivo...'">
                        <label for="fac-archivo" class="flex items-center justify-between p-3 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:border-orange-500 hover:bg-orange-50/50 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                    <i data-lucide="file-text"></i>
                                </div>
                                <span id="fac-file-name" class="text-sm font-medium text-muted-foreground">Subir factura, boleta o RxH...</span>
                            </div>
                            <span class="btn btn-ghost btn-sm">Explorar</span>
                        </label>
                    </div>
                    <p class="text-[10px] text-muted-foreground mt-2 italic">El archivo se subirá a Google Drive y solo se guardará el enlace en la base de datos.</p>
                </div>
            </div>`,
        confirmText: '✓ Confirmar y Completar Orden',
        onConfirm: async () => {
            const file = document.getElementById('fac-archivo').files[0];
            if (!file) { UI.toast('Debe seleccionar la factura o comprobante', 'error'); return false; }

            UI.loading(`Subiendo "${file.name}" a Google Drive...`);
            const driveLink = await uploadReceptionFileToDrive(file, `FACTURA_${numero_oc}`);
            if (!driveLink) {
                UI.stopLoading();
                UI.toast('No se pudo subir el archivo a Drive. Intente de nuevo.', 'error');
                return false;
            }

            UI.loading('Registrando factura en el sistema...');
            const res = await fetch('api/recepcions.php', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchase_id: id, comprobante_url: driveLink })
            }).then(r => r.json());

            UI.stopLoading();
            if (res.ok) {
                UI.toast(res.completada
                    ? '🎉 ¡Orden completada! Documentación al 100%.'
                    : 'Factura registrada con éxito.', 'success');
                await loadRecepcions();
            } else {
                UI.toast('Error: ' + res.error, 'error');
            }
        }
    });
    setTimeout(() => lucide.createIcons(), 60);
};

// ── Primera recepción: conformidad + (opcional) factura ───────────────────────
window.processRecepcion = async function(id, numero_oc) {
    await loadRecepcionResources();
    UI.modal({
        title: 'Confirmar Recepción de Mercadería',
        body: `
            <div class="space-y-5">
                <div class="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p class="text-sm text-foreground">
                        ¿Confirmas que has recibido todos los ítems de la orden
                        <strong>${numero_oc}</strong> y que están en buen estado?
                    </p>
                </div>

                <div>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block">
                        Almacén de Destino <span class="text-destructive">*</span>
                    </label>
                    <select id="rec-ubicacion" class="select w-full h-11">
                        ${_recepcionResources.locs.map(l => `<option value="${l.id}">${l.nombre} (${l.sede_nombre})</option>`).join('')}
                        ${_recepcionResources.locs.length === 0 ? '<option value="13">Almacén General (Default)</option>' : ''}
                    </select>
                </div>

                <!-- Conformidad -->
                <div>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block">
                        Acta de Conformidad <span class="text-destructive">*</span>
                    </label>
                    <div class="relative group">
                        <input type="file" id="rec-archivo" class="hidden" accept="image/*,application/pdf"
                               onchange="document.getElementById('rec-file-name').textContent = this.files[0]?.name || 'Seleccionar archivo...'">
                        <div class="flex items-center justify-between p-3 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all">
                            <label for="rec-archivo" class="flex items-center gap-3 cursor-pointer flex-1">
                                <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <i data-lucide="file-check"></i>
                                </div>
                                <div>
                                    <span id="rec-file-name" class="text-sm font-medium text-muted-foreground block">Subir acta o guía de remisión...</span>
                                    <span class="text-[10px] text-muted-foreground">PDF, JPG, PNG aceptados</span>
                                </div>
                            </label>
                            <div class="flex items-center gap-2 shrink-0">
                                <button type="button" onclick="openConformidadCamera()"
                                        class="btn btn-primary btn-sm flex items-center gap-1.5 px-3 shrink-0"
                                        title="Tomar foto del acta con la cámara">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                                        <circle cx="12" cy="13" r="3"/>
                                    </svg>
                                    <span class="text-xs font-semibold">Tomar foto</span>
                                </button>
                                <label for="rec-archivo" class="btn btn-ghost btn-sm cursor-pointer">Explorar</label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Factura (obligatoria) -->
                <div>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block">
                        Factura / Comprobante <span class="text-destructive">*</span>
                    </label>
                    <div class="relative group">
                        <input type="file" id="fac-archivo-init" class="hidden" accept="image/*,application/pdf"
                               onchange="document.getElementById('fac-file-name-init').textContent = this.files[0]?.name || 'Seleccionar archivo...'">
                        <label for="fac-archivo-init" class="flex items-center justify-between p-3 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:border-orange-500 hover:bg-orange-50/50 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                    <i data-lucide="file-text"></i>
                                </div>
                                <div>
                                    <span id="fac-file-name-init" class="text-sm font-medium text-muted-foreground block">Subir factura, boleta o RxH...</span>
                                    <span class="text-[10px] text-muted-foreground">PDF, JPG, PNG aceptados</span>
                                </div>
                            </div>
                            <span class="btn btn-ghost btn-sm">Explorar</span>
                        </label>
                    </div>
                    <p class="text-[10px] text-orange-700 font-semibold mt-2 flex items-center gap-1">
                        <i data-lucide="alert-circle" class="w-3 h-3 shrink-0"></i>
                        Este documento es obligatorio para completar la recepción.
                    </p>
                </div>
            </div>`,
        confirmText: 'Confirmar Recepción',
        onConfirm: async () => {
            const confFile = document.getElementById('rec-archivo').files[0];
            const facFile  = document.getElementById('fac-archivo-init')?.files[0];

            if (!confFile) { UI.toast('El acta de conformidad es obligatoria', 'error'); return false; }
            if (!facFile)  { UI.toast('La factura o comprobante es obligatorio', 'error'); return false; }

            UI.loading('Procesando recepción...');
            try {
                // 1. Subir conformidad
                UI.loading(`Subiendo conformidad "${confFile.name}" a Drive...`);
                const confLink = await uploadReceptionFileToDrive(confFile, `CONFORMIDAD_${numero_oc}`);
                if (!confLink) {
                    UI.toast('No se pudo subir el acta de conformidad. Operación cancelada.', 'error');
                    UI.stopLoading();
                    return false;
                }

                // 2. Subir factura (obligatoria)
                UI.loading(`Subiendo factura "${facFile.name}" a Drive...`);
                const facLink = await uploadReceptionFileToDrive(facFile, `FACTURA_${numero_oc}`);
                if (!facLink) {
                    UI.toast('No se pudo subir la factura. Operación cancelada.', 'error');
                    UI.stopLoading();
                    return false;
                }

                // 3. Registrar recepción en backend
                UI.loading('Actualizando inventario...');
                const res = await fetch('api/recepcions.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        purchase_id:      id,
                        conformidad_url:  confLink,
                        comprobante_url:  facLink || null,
                        ubicacion_id:     document.getElementById('rec-ubicacion')?.value || 13
                    })
                }).then(r => r.json());

                UI.stopLoading();

                if (res.ok) {
                    const equipment = (res.received_items || []).filter(i => i.tipo === 'equipo');
                    if (equipment.length > 0) {
                        UI.toast('🎉 Recepción completa. Iniciando asistente de equipos...', 'info');
                        openEquipmentOnboarding(equipment);
                    } else {
                        UI.toast('🎉 ¡Orden completada con documentación al 100%!', 'success');
                    }
                    await loadRecepcions();
                } else {
                    UI.toast('Error: ' + res.error, 'error');
                }
            } catch (err) {
                UI.stopLoading();
                UI.toast('Error de red: ' + (err.message || 'El servidor no respondió.'), 'error');
                console.error('Reception Error:', err);
            }
        }
    });
    setTimeout(() => lucide.createIcons(), 60);
};

// ── Cámara para Acta de Conformidad ──────────────────────────────────────────
window.openConformidadCamera = function() {
    // Detener stream anterior si existe
    if (window._conformidadStream) {
        window._conformidadStream.getTracks().forEach(t => t.stop());
        window._conformidadStream = null;
    }

    UI.modal({
        title: '📷 Fotografiar Acta de Conformidad',
        body: `
            <div class="space-y-3">
                <div class="relative w-full rounded-xl overflow-hidden bg-slate-950" style="aspect-ratio:3/4;">
                    <video id="conf-cam-video"
                           class="absolute inset-0 w-full h-full object-cover"
                           autoplay playsinline muted></video>
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div class="relative" style="width:78%;height:84%;">
                            <div class="absolute inset-0 rounded-lg" style="box-shadow:0 0 0 9999px rgba(0,0,0,0.45);"></div>
                            <div class="absolute inset-0 border-2 border-white/80 rounded-lg"></div>
                            <div class="absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] border-white rounded-tl-lg"></div>
                            <div class="absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] border-white rounded-tr-lg"></div>
                            <div class="absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] border-white rounded-bl-lg"></div>
                            <div class="absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] border-white rounded-br-lg"></div>
                            <div class="absolute -top-6 left-0 right-0 flex justify-center">
                                <span class="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full tracking-wide">Coloca el acta dentro del marco</span>
                            </div>
                        </div>
                    </div>
                    <div class="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
                        <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span class="text-white text-[10px] font-bold">EN VIVO</span>
                    </div>
                </div>
                <canvas id="conf-cam-canvas" class="hidden"></canvas>
                <div id="conf-cam-preview" class="hidden space-y-2">
                    <div class="relative w-full rounded-xl overflow-hidden border-2 border-emerald-400" style="aspect-ratio:3/4;">
                        <img id="conf-cam-img" class="w-full h-full object-contain bg-slate-100" alt="Foto capturada">
                    </div>
                    <p class="text-xs text-center text-emerald-600 font-bold flex items-center justify-center gap-1">
                        ✅ Foto capturada — revisa que el acta sea legible
                    </p>
                </div>
                <div class="flex gap-2 justify-center">
                    <button type="button" id="conf-cam-capture-btn" onclick="_captureConformidadPhoto()" class="btn btn-primary gap-2">
                        📷 Capturar foto
                    </button>
                    <button type="button" id="conf-cam-retake-btn" onclick="_retakeConformidadPhoto()" class="btn btn-outline gap-2 hidden">
                        🔄 Volver a tomar
                    </button>
                </div>
                <p class="text-[10px] text-muted-foreground text-center italic">
                    Asegúrate que el texto del acta sea legible antes de confirmar.
                </p>
            </div>`,
        confirmText: '✓ Usar esta foto',
        onConfirm: () => {
            const canvas = document.getElementById('conf-cam-canvas');
            if (!canvas || canvas.width === 0) {
                UI.toast('Primero debes capturar una foto', 'error');
                return false;
            }
            canvas.toBlob(blob => {
                const fileName = `conformidad_foto_${Date.now()}.jpg`;
                const file = new File([blob], fileName, { type: 'image/jpeg' });
                const dt = new DataTransfer();
                dt.items.add(file);
                const input = document.getElementById('rec-archivo');
                if (input) {
                    input.files = dt.files;
                    const lbl = document.getElementById('rec-file-name');
                    if (lbl) lbl.textContent = '📷 ' + fileName;
                }
            }, 'image/jpeg', 0.95);
            if (window._conformidadStream) {
                window._conformidadStream.getTracks().forEach(t => t.stop());
                window._conformidadStream = null;
            }
            return true;
        }
    });

    setTimeout(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1944 }, height: { ideal: 2592 }, aspectRatio: { ideal: 3/4 } }
            });
            window._conformidadStream = stream;
            const video = document.getElementById('conf-cam-video');
            if (video) { video.srcObject = stream; }
        } catch(e) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
                window._conformidadStream = stream;
                const video = document.getElementById('conf-cam-video');
                if (video) { video.srcObject = stream; }
            } catch(e2) {
                const video = document.getElementById('conf-cam-video');
                if (video) video.innerHTML =
                    `<div class="flex flex-col items-center justify-center h-full gap-2 text-white p-6 text-center">
                        <span class="text-4xl">📷</span>
                        <p class="text-sm font-medium">No se pudo acceder a la cámara</p>
                        <p class="text-[10px] text-white/60">${e2.message}</p>
                    </div>`;
            }
        }
    }, 400);
};

window._captureConformidadPhoto = function() {
    const video   = document.getElementById('conf-cam-video');
    const canvas  = document.getElementById('conf-cam-canvas');
    const img     = document.getElementById('conf-cam-img');
    const preview = document.getElementById('conf-cam-preview');
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    if (img)     img.src = canvas.toDataURL('image/jpeg', 0.92);
    if (preview) preview.classList.remove('hidden');
    video.classList.add('hidden');
    document.getElementById('conf-cam-capture-btn')?.classList.add('hidden');
    document.getElementById('conf-cam-retake-btn')?.classList.remove('hidden');
};

window._retakeConformidadPhoto = function() {
    const video   = document.getElementById('conf-cam-video');
    const preview = document.getElementById('conf-cam-preview');
    const canvas  = document.getElementById('conf-cam-canvas');
    if (video)   video.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
    document.getElementById('conf-cam-capture-btn')?.classList.remove('hidden');
    document.getElementById('conf-cam-retake-btn')?.classList.add('hidden');
    if (canvas) { canvas.width = 0; canvas.height = 0; }
};

// ── Google Drive upload helper ────────────────────────────────────────────────
async function uploadReceptionFileToDrive(file, name) {
    return new Promise((resolve) => {
        if (typeof google === 'undefined') { resolve(null); return; }
        const metadata = {
            name: name + '_' + Date.now() + '_' + file.name,
            parents: [DRIVE_FOLDER_ID]
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        google.accounts.oauth2.initTokenClient({
            client_id: DRIVE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (token) => {
                try {
                    const uploadResp = await fetch(
                        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
                        { method: 'POST', headers: { Authorization: 'Bearer ' + token.access_token }, body: form }
                    );
                    if (uploadResp.ok) {
                        const fileData = await uploadResp.json();
                        await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
                            method: 'POST',
                            headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role: 'reader', type: 'anyone' })
                        });
                        resolve(fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`);
                    } else { resolve(null); }
                } catch { resolve(null); }
            }
        }).requestAccessToken();
    });
}

// ── Equipment onboarding wizard (unchanged) ───────────────────────────────────
function openEquipmentOnboarding(items) {
    let currentItemIndex = 0;
    let unitsProcessed = 0;

    const renderStep = () => {
        const item = items[currentItemIndex];
        const totalUnits = parseInt(item.cantidad);

        UI.modal({
            title: `Asistente de Registro: ${item.nombre}`,
            body: `
                <div class="space-y-4">
                    <div class="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                        <div class="text-[10px] font-bold text-primary uppercase">Artículo Recibido</div>
                        <div class="text-lg font-bold">${item.nombre}</div>
                        <div class="text-xs text-muted-foreground">Unidad ${unitsProcessed + 1} de ${totalUnits}</div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Marca / Fabricante</label>
                            <input type="text" id="ob-brand" class="input w-full h-10" placeholder="Ej: Lenovo, HP, etc.">
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Modelo / Especificación</label>
                            <input type="text" id="ob-model" class="input w-full h-10" placeholder="Ej: ThinkPad E14">
                        </div>
                        <div class="md:col-span-2">
                            <label class="text-xs font-bold mb-1 block uppercase">Número de Serie <span class="text-destructive">*</span></label>
                            <div class="flex gap-2">
                                <input type="text" id="ob-serie" class="input flex-1 h-10 font-mono" placeholder="Ingrese o escanee serie...">
                                <button class="btn btn-outline p-2 h-10" onclick="startAssetQRScannerForOnboarding()">
                                    <i data-lucide="qr-code" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                        <div class="md:col-span-2">
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Ubicación Destino <span class="text-destructive">*</span></label>
                            <select id="ob-loc" class="select w-full h-10">
                                ${_recepcionResources.locs.map(l => `
                                    <option value="${l.id}" ${l.id == (document.getElementById('rec-ubicacion')?.value || 13) ? 'selected' : ''}>
                                        ${l.nombre} (${l.sede_nombre})
                                    </option>`).join('')}
                                ${_recepcionResources.locs.length === 0 ? '<option value="13">Almacén General</option>' : ''}
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Código Patrimonial / Interno</label>
                            <input type="text" id="ob-codigo" class="input w-full h-10 bg-muted" readonly placeholder="Se generará al guardar">
                        </div>
                    </div>
                    <p class="text-[10px] text-muted-foreground italic mt-2">Nota: Al finalizar, el activo quedará en estado 'Operativo' y se generará su historial de ingreso.</p>
                </div>`,
            afterMount: async () => {
                try {
                    const resp = await fetch(`api/assets.php?action=next_code&item_id=${item.item_id}`).then(r => r.json());
                    if (resp.next_code) {
                        const input = document.getElementById('ob-codigo');
                        if (input) { input.value = resp.next_code; input.style.opacity = '1'; }
                    }
                } catch(e) { console.error('Error auto-generating code:', e); }
                lucide.createIcons();
            },
            confirmText: (unitsProcessed + 1 === totalUnits && currentItemIndex + 1 === items.length) ? 'Finalizar Todo' : 'Siguiente Unidad',
            onConfirm: async () => {
                const serie  = document.getElementById('ob-serie').value.trim();
                const loc_id = document.getElementById('ob-loc').value;
                if (!serie) { UI.toast('Debe ingresar el número de serie', 'error'); return false; }

                UI.loading('Registrando bien individual...');
                try {
                    const reg = await fetch('api/assets.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            item_id:       item.item_id,
                            numero_serie:  serie,
                            codigo_interno: document.getElementById('ob-codigo').value.trim() || null,
                            ubicacion_id:  loc_id,
                            estado:        'Operativo',
                            marca:         document.getElementById('ob-brand').value.trim(),
                            modelo:        document.getElementById('ob-model').value.trim()
                        })
                    }).then(r => r.json());
                    UI.stopLoading();

                    if (reg.ok) {
                        unitsProcessed++;
                        if (unitsProcessed < totalUnits) {
                            renderStep();
                        } else {
                            currentItemIndex++;
                            if (currentItemIndex < items.length) {
                                unitsProcessed = 0;
                                renderStep();
                            } else {
                                UI.toast('Todos los equipos han sido individualizados con éxito', 'success');
                            }
                        }
                    } else {
                        UI.toast('Error al registrar: ' + reg.error, 'error');
                        return false;
                    }
                } catch(e) {
                    UI.stopLoading();
                    UI.toast('Error de conexión', 'error');
                }
            }
        });
        lucide.createIcons();
    };

    renderStep();
}

// ── QR scanner for onboarding ─────────────────────────────────────────────────
window.startAssetQRScannerForOnboarding = function() {
    UI.modal({
        title: 'Escanear Serie / QR',
        body: `
            <div class="space-y-4">
                <div id="qr-reader-ob" class="overflow-hidden rounded-xl bg-slate-900 aspect-square flex items-center justify-center text-white text-xs italic">
                    Iniciando cámara...
                </div>
                <p class="text-[10px] text-muted-foreground text-center italic">Encuadre el código de serie o QR del activo.</p>
            </div>`,
        confirmText: 'Detener Cámara',
        onConfirm: () => {
            if (window._qrScannerOb) window._qrScannerOb.stop().catch(e => console.error(e));
            return true;
        }
    });

    setTimeout(() => {
        const html5QrCode = new Html5Qrcode("qr-reader-ob");
        window._qrScannerOb = html5QrCode;
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                const finalCode = decodedText.split('/').pop();
                const input = document.getElementById('ob-serie');
                if (input) input.value = finalCode;
                UI.toast(`Serie detectada: ${finalCode}`, 'success');
                html5QrCode.stop().catch(err => console.error(err));
            },
            () => {}
        ).catch(err => {
            const container = document.getElementById('qr-reader-ob');
            if (container) container.innerHTML = `<div class="p-6 text-center text-destructive font-medium">Error: ${err}</div>`;
        });
    }, 500);
};

// ── View definition ───────────────────────────────────────────────────────────
window.Views.recepcions = function() {
    return `
    ${UI.pageHeader('Recepción de Almacén', 'Control de ingreso de mercadería, equipos y documentación')}

    <div class="space-y-4">
        <!-- Tabs -->
        <div class="flex overflow-x-auto whitespace-nowrap gap-0 border-b border-border scrollbar-none">
            <button id="rec-tab-pending" class="treasury-tab active-tab flex-shrink-0" onclick="switchRecepcionTab('pending')">
                <i data-lucide="inbox" class="w-4 h-4"></i>
                <span>Pendientes</span>
                <span id="rec-count-pending" class="tab-count">0</span>
            </button>
            <button id="rec-tab-history" class="treasury-tab flex-shrink-0" onclick="switchRecepcionTab('history')">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                <span>Historial Completo</span>
                <span id="rec-count-history" class="tab-count">0</span>
            </button>
        </div>

        <!-- Info banner for pending tab -->
        <div id="rec-pending-banner" class="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <i data-lucide="info" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
            <span>Las órdenes permanecerán aquí hasta que se suba <strong>tanto el Acta de Conformidad como la Factura/Comprobante</strong>. Una vez completas, pasan automáticamente al <strong>Historial Completo</strong>.</span>
        </div>

        <!-- Table -->
        <div class="card">
            <div class="table-container">
                <table class="data">
                    <thead>
                        <tr>
                            <th>N° OC/OS</th>
                            <th>Proveedor / Área</th>
                            <th>Fecha</th>
                            <th>Documentación</th>
                            <th class="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="recepcions-table-body">
                        <tr><td colspan="5" class="text-center py-10 text-muted-foreground">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;
};

window.Views.recepcions.afterMount = loadRecepcions;
