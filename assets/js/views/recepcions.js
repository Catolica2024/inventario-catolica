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

        return `
        <tr class="${ds === 'complete' ? 'opacity-75' : ''}">
            <td class="font-mono text-xs font-bold text-primary">${p.numero_oc}</td>
            <td>
                <div class="font-bold text-sm">${p.proveedor_nombre}</div>
                <div class="text-[10px] text-muted-foreground uppercase">${p.area_nombre || 'Sin área'}</div>
            </td>
            <td class="text-xs font-medium">${p.fecha || '—'}</td>
            <td>${docBadge}</td>
            <td class="text-right">
                <div class="flex justify-end items-center gap-1.5">
                    <button class="btn btn-ghost p-1.5" title="Ver Detalles" onclick="viewOrderDetails(${p.id})">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    ${actionBtn}
                </div>
            </td>
        </tr>`;
    }).join('');

    lucide.createIcons();
}

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
                        <label for="rec-archivo" class="flex items-center justify-between p-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <i data-lucide="file-check"></i>
                                </div>
                                <div>
                                    <span id="rec-file-name" class="text-sm font-medium text-muted-foreground block">Subir acta o guía de remisión...</span>
                                    <span class="text-[10px] text-muted-foreground">PDF, JPG, PNG aceptados</span>
                                </div>
                            </div>
                            <span class="btn btn-ghost btn-sm">Explorar</span>
                        </label>
                    </div>
                </div>

                <!-- Factura (opcional) -->
                <div>
                    <label class="text-xs font-bold uppercase tracking-wider mb-1 block">
                        Factura / Comprobante
                        <span class="text-[10px] font-normal text-muted-foreground ml-1">(opcional — puedes subirla luego)</span>
                    </label>
                    <div class="relative group">
                        <input type="file" id="fac-archivo-init" class="hidden" accept="image/*,application/pdf"
                               onchange="document.getElementById('fac-file-name-init').textContent = this.files[0]?.name || 'Seleccionar archivo...'">
                        <label for="fac-archivo-init" class="flex items-center justify-between p-3 border-2 border-dashed border-orange-200 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                    <i data-lucide="file-text"></i>
                                </div>
                                <div>
                                    <span id="fac-file-name-init" class="text-sm font-medium text-muted-foreground block">Subir factura, boleta o RxH...</span>
                                    <span class="text-[10px] text-muted-foreground">Si la tienes disponible ahora</span>
                                </div>
                            </div>
                            <span class="btn btn-ghost btn-sm">Explorar</span>
                        </label>
                    </div>
                    <p class="text-[10px] text-muted-foreground mt-2 italic">
                        ℹ️ Si no subes la factura ahora, el sistema mantendrá la orden en <strong>Pendientes</strong> hasta que la subas.
                    </p>
                </div>
            </div>`,
        confirmText: 'Confirmar Recepción',
        onConfirm: async () => {
            const confFile = document.getElementById('rec-archivo').files[0];
            const facFile  = document.getElementById('fac-archivo-init')?.files[0];

            if (!confFile) { UI.toast('El acta de conformidad es obligatoria', 'error'); return false; }

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

                // 2. Subir factura si se adjuntó
                let facLink = null;
                if (facFile) {
                    UI.loading(`Subiendo factura "${facFile.name}" a Drive...`);
                    facLink = await uploadReceptionFileToDrive(facFile, `FACTURA_${numero_oc}`);
                    if (!facLink) {
                        UI.toast('No se pudo subir la factura, pero la conformidad se guardará.', 'warning');
                    }
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
                        const msg = res.estado === 'Completada'
                            ? 'Recepción completa. Iniciando asistente de equipos...'
                            : 'Conformidad guardada. Recuerda subir la factura. Iniciando asistente de equipos...';
                        UI.toast(msg, 'info');
                        openEquipmentOnboarding(equipment);
                    } else {
                        UI.toast(
                            res.estado === 'Completada'
                                ? '🎉 ¡Orden completada con documentación al 100%!'
                                : '✓ Recepción registrada. Recuerda subir la factura para completar el ciclo.',
                            res.estado === 'Completada' ? 'success' : 'info'
                        );
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
