// assets/js/views/traceability.js — Módulos de Trazabilidad (Asignaciones, Traslados, Despachos)

let _traceResources = { staff: [], locations: [], assets: [], items: [] };

async function loadTraceResources() {
    const [staff, locs, assets, items] = await Promise.all([
        fetch('api/staff.php').then(r => r.json()),
        fetch('api/locations.php').then(r => r.json()),
        fetch('api/assets.php').then(r => r.json()),
        fetch('api/items.php').then(r => r.json())
    ]);
    _traceResources = { 
        staff: staff.staff || [], 
        locations: locs.locations || [], 
        assets: assets.assets || [], 
        items: items.items || [] 
    };
}

// ==========================================
// MÓDULO: ASIGNACIONES (EQUIPOS)
// ==========================================
window.Views.assignments = function() {
    return `
        ${UI.pageHeader('Asignaciones de Equipos', 'Gestión de entrega y devolución de activos al personal', `
            <button class="btn btn-primary" onclick="openAssignmentModal()"><i data-lucide="plus"></i> Nueva Asignación</button>
        `)}

        <div class="card overflow-hidden">
            <table class="data">
                <thead>
                    <tr>
                        <th>Activo / Código</th>
                        <th>Asignado a</th>
                        <th>Fecha Entrega</th>
                        <th>Estado</th>
                        <th>Fecha Devolución</th>
                        <th class="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody id="assignments-table-body">
                    <tr><td colspan="6" class="text-center py-10">Cargando asignaciones...</td></tr>
                </tbody>
            </table>
        </div>
    `;
};

window.Views.assignments.afterMount = async function() {
    await loadTraceResources();
    loadAssignments();
    lucide.createIcons();
};

async function loadAssignments() {
    const tbody = document.getElementById('assignments-table-body');
    if (!tbody) return;
    const resp = await fetch('api/assignments.php').then(r => r.json());
    const data = resp.assignments || [];
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay registros de asignación.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(a => `
        <tr>
            <td>
                <div class="font-bold">${a.activo_nombre}</div>
                <div class="text-[10px] font-mono text-primary">${a.activo_codigo}</div>
            </td>
            <td class="font-medium">${a.personal_nombre}</td>
            <td>${a.fecha_asignacion}</td>
            <td><span class="badge ${a.estado === 'Activo' ? 'badge-blue' : 'badge-green'}">${a.estado}</span></td>
            <td class="italic text-muted-foreground">${a.fecha_devolucion || '—'}</td>
            <td class="text-right whitespace-nowrap">
                ${a.estado === 'Activo' ? 
                    `<button class="btn btn-outline btn-sm mr-2" onclick="returnAsset(${a.id}, '${a.activo_nombre}')">Devolver</button>` : 
                    `<button class="btn btn-ghost p-1.5" onclick="viewAssignmentNote(${a.id})" title="Ver detalles"><i data-lucide="info" class="w-4 h-4"></i></button>`
                }
                <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteTraceRecord('assignments', ${a.id}, 'esta asignación')" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.openAssignmentModal = function(preselectedId = null) {
    let selectedAsset = preselectedId ? _traceResources.assets.find(a => a.id == preselectedId) : null;

    UI.modal({
        title: 'Nueva Asignación de Equipo',
        body: `
            <div class="space-y-4 pt-2">
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-primary">Buscar por Código o Serie <span class="text-destructive">*</span></label>
                    <div class="relative">
                        <input type="text" id="asig-search" class="input w-full pr-10" 
                               placeholder="Ingrese Código Patrimonial o Nro Serie..." 
                               value="${selectedAsset ? (selectedAsset.codigo_patrimonial || selectedAsset.numero_serie) : ''}">
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <i data-lucide="search" class="w-4 h-4"></i>
                        </div>
                    </div>
                    <div id="asig-found-info" class="mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs">
                        ${selectedAsset ? 
                            `<div class="font-bold text-primary">${selectedAsset.item_nombre}</div>
                             <div class="text-muted-foreground">Serie: ${selectedAsset.numero_serie || '—'} | Sede: ${selectedAsset.sede_nombre}</div>` : 
                            '<span class="italic text-muted-foreground">Ingrese un código para identificar el equipo...</span>'
                        }
                    </div>
                    <input type="hidden" id="asig-activo-id" value="${preselectedId || ''}">
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Asignar a (Personal) <span class="text-destructive">*</span></label>
                    <select id="asig-personal" class="select w-full">
                        <option value="">Seleccione personal...</option>
                        ${_traceResources.staff.map(p => `<option value="${p.id}">${p.nombre} (${p.cargo})</option>`).join('')}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Fecha de Entrega <span class="text-destructive">*</span></label>
                        <input type="date" id="asig-fecha" class="input w-full" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Condición de Entrega</label>
                        <input type="text" id="asig-cond" class="input w-full" placeholder="Ej: Bueno, Operativo...">
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Observaciones (Opcional)</label>
                    <textarea id="asig-obs" class="input w-full h-20" placeholder="Detalles adicionales..."></textarea>
                </div>
            </div>
        `,
        confirmText: 'Confirmar Asignación',
        onConfirm: async () => {
            const asset_id = document.getElementById('asig-activo-id').value;
            const data = {
                activo_id: asset_id,
                personal_id: document.getElementById('asig-personal').value,
                fecha_asignacion: document.getElementById('asig-fecha').value,
                condicion_entrega: document.getElementById('asig-cond').value,
                observaciones: document.getElementById('asig-obs').value
            };
            if (!data.activo_id || !data.personal_id) { UI.toast('Debe identificar un equipo válido y seleccionar el personal', 'error'); return; }

            UI.loading('Registrando asignación...');
            const r = await fetch('api/assignments.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) { UI.toast('Asignación registrada', 'success'); loadAssignments(); }
            else UI.toast(r.error, 'error');
        }
    });

    // Lógica de búsqueda en tiempo real
    const searchInput = document.getElementById('asig-search');
    const infoDiv = document.getElementById('asig-found-info');
    const idInput = document.getElementById('asig-activo-id');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (!val) {
            infoDiv.innerHTML = '<span class="italic text-muted-foreground">Ingrese un código para identificar el equipo...</span>';
            idInput.value = '';
            return;
        }

        const found = _traceResources.assets.find(a => 
            (a.codigo_patrimonial && a.codigo_patrimonial.toLowerCase() === val) || 
            (a.numero_serie && a.numero_serie.toLowerCase() === val) ||
            (a.codigo_patrimonial && a.codigo_patrimonial.toLowerCase().includes(val))
        );

        if (found) {
            const isAssigned = found.personal_id !== null;
            infoDiv.innerHTML = `
                <div class="font-bold ${isAssigned ? 'text-destructive' : 'text-primary'}">${found.item_nombre}</div>
                <div class="text-muted-foreground">Serie: ${found.numero_serie || '—'} | Sede: ${found.sede_nombre}</div>
                ${isAssigned ? 
                    `<div class="mt-2 p-2 bg-red-100 text-red-700 rounded border border-red-200 font-bold">
                        ⚠️ ATENCIÓN: Ya está asignado a ${found.responsable_nombre}. 
                        Registre la devolución primero.
                    </div>` : 
                    ''
                }
            `;
            idInput.value = isAssigned ? '' : found.id;
            
            if (isAssigned) {
                infoDiv.classList.add('bg-red-50', 'border-red-200');
                infoDiv.classList.remove('bg-muted/20', 'border-border', 'bg-green-50', 'border-green-200');
            } else {
                infoDiv.classList.add('bg-green-50', 'border-green-200');
                infoDiv.classList.remove('bg-muted/20', 'border-border', 'bg-red-50', 'border-red-200');
            }
        } else {
            infoDiv.innerHTML = '<span class="text-destructive font-medium">Equipo no encontrado con ese código/serie</span>';
            idInput.value = '';
            infoDiv.classList.remove('bg-green-50', 'border-green-200');
            infoDiv.classList.add('bg-red-50', 'border-red-200');
        }
    });

    lucide.createIcons();
};

window.returnAsset = function(id, nombre) {
    UI.modal({
        title: 'Devolución de Equipo',
        body: `
            <div class="space-y-4 pt-2">
                <p class="text-sm">Registrando devolución de: <strong>${nombre}</strong></p>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Fecha de Devolución</label>
                    <input type="date" id="ret-fecha" class="input w-full" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Condición de Devolución</label>
                    <input type="text" id="ret-cond" class="input w-full" placeholder="Ej: Bueno, Completo, Desgastado">
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Observaciones</label>
                    <textarea id="ret-obs" class="input w-full h-20" placeholder="Motivo de devolución o detalles del estado..."></textarea>
                </div>
            </div>
        `,
        confirmText: 'Registrar Devolución',
        onConfirm: async () => {
            const data = {
                id,
                fecha_devolucion: document.getElementById('ret-fecha').value,
                condicion_devolucion: document.getElementById('ret-cond').value,
                observaciones: document.getElementById('ret-obs').value
            };
            UI.loading('Procesando devolución...');
            const r = await fetch('api/assignments.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) { UI.toast('Equipo devuelto al almacén', 'success'); loadAssignments(); }
            else UI.toast(r.error, 'error');
        }
    });
};

// ==========================================
// MÓDULO: TRASLADOS (MOBILIARIO)
// ==========================================
window.Views.transfers = function() {
    return `
        ${UI.pageHeader('Traslados de Mobiliario', 'Historial de movimientos de bienes entre aulas y espacios', `
            <button class="btn btn-primary" onclick="openTransferModal()"><i data-lucide="move"></i> Nuevo Traslado</button>
        `)}

        <div class="card overflow-hidden">
            <table class="data">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Bien / Artículo</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th class="text-center">Cant.</th>
                        <th>Responsable</th>
                        <th class="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody id="transfers-table-body">
                    <tr><td colspan="7" class="text-center py-10">Cargando historial de traslados...</td></tr>
                </tbody>
            </table>
        </div>
    `;
};

window.Views.transfers.afterMount = async function() {
    await loadTraceResources();
    loadTransfers();
    lucide.createIcons();
};

async function loadTransfers() {
    const tbody = document.getElementById('transfers-table-body');
    if (!tbody) return;
    const resp = await fetch('api/transfers.php').then(r => r.json());
    const data = resp.transfers || [];
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-muted-foreground">No hay registros de traslados.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(t => `
        <tr>
            <td class="text-xs font-medium">${t.fecha}</td>
            <td class="font-bold text-sm">${t.item_nombre}</td>
            <td class="text-xs text-muted-foreground uppercase">${t.origen_nombre || 'ALMACÉN'}</td>
            <td class="text-xs font-bold uppercase text-primary">${t.destino_nombre}</td>
            <td class="text-center font-bold text-sm">${t.cantidad}</td>
            <td class="text-xs font-medium">${t.responsable_nombre || '—'}</td>
            <td class="text-right whitespace-nowrap">
                <button class="btn btn-ghost p-1.5" onclick="viewTransferNote(${t.id})" title="Ver detalles"><i data-lucide="info" class="w-4 h-4"></i></button>
                <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteTraceRecord('transfers', ${t.id}, 'este traslado')" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.openTransferModal = function(preselectedId = null) {
    UI.modal({
        title: 'Registrar Traslado de Bienes',
        body: `
            <div class="space-y-4 pt-2">
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Artículo a mover <span class="text-destructive">*</span></label>
                    <select id="tr-item" class="select w-full">
                        <option value="">Seleccione artículo...</option>
                        ${_traceResources.items.filter(i => i.categoria_tipo === 'mobiliario').map(i => `<option value="${i.id}" ${preselectedId == i.id ? 'selected' : ''}>${i.nombre} (${i.categoria_nombre})</option>`).join('')}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Desde (Origen)</label>
                        <select id="tr-origen" class="select w-full">
                            <option value="">Almacén Principal</option>
                            ${_traceResources.locations.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Hacia (Destino) <span class="text-destructive">*</span></label>
                        <select id="tr-destino" class="select w-full">
                            <option value="">Seleccione destino...</option>
                            ${_traceResources.locations.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Cantidad <span class="text-destructive">*</span></label>
                        <input type="number" id="tr-qty" class="input w-full" value="1" min="1">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Fecha <span class="text-destructive">*</span></label>
                        <input type="date" id="tr-fecha" class="input w-full" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Persona Responsable</label>
                    <select id="tr-resp" class="select w-full">
                        <option value="">Seleccione personal...</option>
                        ${_traceResources.staff.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Motivo / Observaciones</label>
                    <textarea id="tr-obs" class="input w-full h-20" placeholder="Ej: Cambio de mobiliario por mantenimiento..."></textarea>
                </div>
            </div>
        `,
        confirmText: 'Registrar Movimiento',
        onConfirm: async () => {
            const data = {
                item_id: document.getElementById('tr-item').value,
                ubicacion_origen_id: document.getElementById('tr-origen').value,
                ubicacion_destino_id: document.getElementById('tr-destino').value,
                cantidad: document.getElementById('tr-qty').value,
                fecha: document.getElementById('tr-fecha').value,
                responsable_id: document.getElementById('tr-resp').value,
                motivo: document.getElementById('tr-obs').value
            };
            if (!data.item_id || !data.ubicacion_destino_id || !data.cantidad) { UI.toast('Complete los campos obligatorios', 'error'); return; }

            UI.loading('Registrando traslado...');
            const r = await fetch('api/transfers.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) { UI.toast('Traslado registrado con éxito', 'success'); loadTransfers(); }
            else UI.toast(r.error, 'error');
        }
    });
};

// ==========================================
// MÓDULO: DESPACHO (INSUMOS)
// ==========================================
window.Views.dispatch = function() {
    return `
        ${UI.pageHeader('Despacho de Insumos', 'Registro de entrega de materiales consumibles al personal', `
            <button class="btn btn-primary" onclick="openDispatchModal()"><i data-lucide="send"></i> Nuevo Despacho</button>
        `)}

        <div class="card overflow-hidden">
            <table class="data">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Insumo</th>
                        <th>Entregado a</th>
                        <th class="text-center">Cant.</th>
                        <th>Entregado por</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody id="dispatch-table-body">
                    <tr><td colspan="6" class="text-center py-10">Cargando historial de despachos...</td></tr>
                </tbody>
            </table>
        </div>
    `;
};

window.Views.dispatch.afterMount = async function() {
    await loadTraceResources();
    loadDispatches();
    lucide.createIcons();
};

async function loadDispatches() {
    const tbody = document.getElementById('dispatch-table-body');
    if (!tbody) return;
    const resp = await fetch('api/movements.php').then(r => r.json());
    // Filtrar solo salidas (despachos) de artículos tipo 'insumo'
    const data = (resp.movements || []).filter(m => m.tipo === 'Salida' && m.categoria_tipo === 'insumo');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-muted-foreground">No hay registros de despachos.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(m => `
        <tr>
            <td class="text-xs">${m.fecha}</td>
            <td class="font-bold">${m.item_nombre}</td>
            <td class="font-medium text-primary">${m.destinatario_nombre || '—'}</td>
            <td class="text-center font-bold">${m.cantidad}</td>
            <td class="text-xs italic">${m.despachado_por_nombre || 'Admin'}</td>
            <td class="text-right whitespace-nowrap">
                <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteTraceRecord('dispatch', ${m.id}, 'este despacho')" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
}

window.openDispatchModal = function(preselectedId = null) {
    UI.modal({
        title: 'Registrar Despacho de Insumos',
        body: `
            <div class="space-y-4 pt-2">
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Insumo / Material <span class="text-destructive">*</span></label>
                    <select id="disp-item" class="select w-full">
                        <option value="">Seleccione insumo...</option>
                        ${_traceResources.items.filter(i => i.categoria_tipo === 'insumo').map(i => `<option value="${i.id}" ${preselectedId == i.id ? 'selected' : ''}>${i.nombre} (Stock: ${i.stock_actual})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Entregar a (Personal) <span class="text-destructive">*</span></label>
                    <select id="disp-dest" class="select w-full">
                        <option value="">Seleccione destinatario...</option>
                        ${_traceResources.staff.map(p => `<option value="${p.id}">${p.nombre} (${p.area})</option>`).join('')}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Cantidad <span class="text-destructive">*</span></label>
                        <input type="number" id="disp-qty" class="input w-full" value="1" min="1">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Entregado por</label>
                        <select id="disp-admin" class="select w-full">
                            <option value="">Admin / Encargado</option>
                            ${_traceResources.staff.filter(p => p.cargo && p.cargo.toLowerCase().includes('admin') || p.cargo.toLowerCase().includes('almacén')).map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase">Observaciones</label>
                    <textarea id="disp-obs" class="input w-full h-20" placeholder="Ej: Entrega semanal para limpieza..."></textarea>
                </div>
            </div>
        `,
        confirmText: 'Confirmar Despacho',
        onConfirm: async () => {
            const data = {
                item_id: document.getElementById('disp-item').value,
                personal_destinatario_id: document.getElementById('disp-dest').value,
                despachado_por_id: document.getElementById('disp-admin').value,
                cantidad: document.getElementById('disp-qty').value,
                tipo: 'Salida',
                ubicacion_id: 13, // Almacén Principal
                observacion: document.getElementById('disp-obs').value
            };
            if (!data.item_id || !data.personal_destinatario_id || !data.cantidad) { UI.toast('Complete los campos obligatorios', 'error'); return; }

            // Validar stock antes de enviar
            const item = _traceResources.items.find(i => i.id == data.item_id);
            if (item && parseInt(data.cantidad) > parseInt(item.stock_actual)) {
                UI.toast(`Error: Stock insuficiente. Solo hay ${item.stock_actual} unidades disponibles.`, 'error');
                return;
            }

            UI.loading('Registrando despacho...');
            const r = await fetch('api/movements.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) { UI.toast('Despacho registrado correctamente', 'success'); loadDispatches(); }
            else UI.toast(r.error, 'error');
        }
    });
};

window.viewAssetDetails = async function(id) {
    UI.loading('Cargando detalles del equipo...');
    try {
        const [assetResp, historyResp, maintResp] = await Promise.all([
            fetch(`api/assets.php`).then(r => r.json()),
            fetch(`api/assignments.php?activo_id=${id}`).then(r => r.json()),
            fetch(`api/maintenance.php`).then(r => r.json())
        ]);
        
        const asset = (assetResp.assets || []).find(a => a.id == id);
        if (!asset) { UI.toast('No se encontró el equipo', 'error'); return; }

        const history = historyResp.assignments || [];
        const maintenance = (maintResp.maintenance || []).filter(m => m.activo_id == id);

        UI.modal({
            title: `Detalle de Equipo: ${asset.item_nombre}`,
            size: 'lg',
            body: `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div class="space-y-3">
                        <div class="p-4 rounded-xl bg-muted/30 border border-border">
                            <h4 class="text-xs font-bold text-muted-foreground uppercase mb-3">Información General</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-muted-foreground">Código Patrimonial:</span>
                                    <span class="font-mono font-bold text-primary">${asset.codigo_patrimonial || '—'}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-muted-foreground">Número de Serie:</span>
                                    <span class="font-medium">${asset.numero_serie || 'S/N'}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-muted-foreground">Estado Actual:</span>
                                    <span class="badge ${asset.estado === 'Operativo' ? 'badge-green' : 'badge-yellow'}">${asset.estado}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-muted-foreground">Ubicación Actual:</span>
                                    <span class="font-semibold uppercase">${asset.ubicacion_nombre || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div>
                            <h4 class="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                                <i data-lucide="history" class="w-3.5 h-3.5"></i> Historial de Asignaciones
                            </h4>
                            <div class="max-h-[200px] overflow-y-auto pr-2 space-y-2">
                                ${history.length === 0 ? 
                                    `<div class="text-center py-6 text-muted-foreground text-xs italic border-2 border-dashed border-border rounded-xl">Sin asignaciones.</div>` : 
                                    history.map(h => `
                                        <div class="p-2 rounded-lg border border-border bg-white">
                                            <div class="flex justify-between items-start mb-1 text-xs">
                                                <div class="font-bold">${h.personal_nombre}</div>
                                                <span class="text-[8px] uppercase font-bold text-blue-600">${h.estado}</span>
                                            </div>
                                            <div class="text-[9px] text-muted-foreground">Ent: ${h.fecha_asignacion} ${h.fecha_devolucion ? `| Dev: ${h.fecha_devolucion}` : ''}</div>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>

                        <div>
                            <h4 class="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                                <i data-lucide="wrench" class="w-3.5 h-3.5"></i> Historial de Mantenimiento
                            </h4>
                            <div class="max-h-[200px] overflow-y-auto pr-2 space-y-2">
                                ${maintenance.length === 0 ? 
                                    `<div class="text-center py-6 text-muted-foreground text-xs italic border-2 border-dashed border-border rounded-xl">Sin mantenimientos.</div>` : 
                                    maintenance.map(m => `
                                        <div class="p-2 rounded-lg border border-border bg-orange-50/20">
                                            <div class="flex justify-between items-start mb-1 text-xs">
                                                <div class="font-bold">${m.tipo}</div>
                                                <span class="text-[8px] uppercase font-bold text-orange-600">${m.estado}</span>
                                            </div>
                                            <div class="text-[9px] text-muted-foreground">Inic: ${m.fecha_inicio} | S/ ${parseFloat(m.costo).toFixed(2)}</div>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cerrar</button>
                ${asset.personal_id ? '' : `<button class="btn btn-primary" onclick="UI.closeModal(); openAssignmentModal(${asset.id})">Asignar Equipo</button>`}
            `
        });
        lucide.createIcons();
    } catch(e) { console.error(e); UI.toast('Error al cargar detalles', 'error'); }
    finally { UI.stopLoading(); }
};
window.deleteTraceRecord = function(type, id, label) {
    let endpoint = '';
    let reloadFn = null;
    if (type === 'assignments') { endpoint = 'api/assignments.php'; reloadFn = loadAssignments; }
    if (type === 'transfers') { endpoint = 'api/transfers.php'; reloadFn = loadTransfers; }
    if (type === 'dispatch') { endpoint = 'api/movements.php'; reloadFn = loadDispatches; }

    UI.modal({
        title: 'Confirmar Eliminación',
        body: `<p class="text-sm">¿Está seguro que desea eliminar <strong>${label}</strong>? Esta acción no se puede deshacer.</p>`,
        confirmText: 'Sí, Eliminar',
        confirmClass: 'btn-destructive',
        onConfirm: async () => {
            UI.loading('Eliminando registro...');
            const r = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) { UI.toast('Registro eliminado', 'success'); reloadFn(); }
            else UI.toast(r.error, 'error');
        }
    });
};

window.viewCatalogItem = async function(id) {
    UI.loading('Cargando historial del artículo...');
    try {
        const [itemsResp, movementsResp, maintResp] = await Promise.all([
            fetch(`api/items.php`).then(r => r.json()),
            fetch(`api/movements.php`).then(r => r.json()),
            fetch(`api/maintenance.php`).then(r => r.json())
        ]);
        
        const item = (itemsResp.items || []).find(i => i.id == id);
        if (!item) { UI.toast('No se encontró el artículo', 'error'); return; }

        const movements = (movementsResp.movements || []).filter(m => m.item_id == id);
        const maintenance = (maintResp.maintenance || []).filter(m => m.item_id == id && m.activo_id === null);

        UI.modal({
            title: `Detalle de Artículo: ${item.nombre}`,
            size: 'lg',
            body: `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div class="md:col-span-1 space-y-4">
                        <div class="p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <h4 class="text-xs font-bold text-primary uppercase mb-3">Resumen de Inventario</h4>
                            <div class="space-y-3">
                                <div>
                                    <div class="text-[10px] text-muted-foreground uppercase">Stock Actual</div>
                                    <div class="text-2xl font-bold ${item.stock_actual <= item.stock_minimo ? 'text-destructive' : 'text-primary'}">${item.stock_actual} ${item.unidad_medida || 'unid.'}</div>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <div class="text-[10px] text-muted-foreground uppercase">Código</div>
                                        <div class="text-sm font-mono font-bold">${item.codigo}</div>
                                    </div>
                                    <div>
                                        <div class="text-[10px] text-muted-foreground uppercase">Mínimo</div>
                                        <div class="text-sm font-bold text-orange-600">${item.stock_minimo}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="text-xs text-muted-foreground italic p-2">
                            * El stock actual considera todas las entradas, salidas y despachos registrados.
                        </div>
                    </div>

                    <div class="md:col-span-2 space-y-6">
                        <div>
                            <h4 class="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                                <i data-lucide="list-ordered" class="w-3.5 h-3.5"></i> Historial de Movimientos
                            </h4>
                            <div class="max-h-[250px] overflow-y-auto pr-2">
                                <table class="w-full text-left text-[11px]">
                                    <thead class="sticky top-0 bg-white border-b border-border">
                                        <tr>
                                            <th class="py-1 uppercase font-bold text-[9px]">Fecha</th>
                                            <th class="py-1 uppercase font-bold text-[9px]">Tipo</th>
                                            <th class="py-1 uppercase font-bold text-[9px] text-center">Cant.</th>
                                            <th class="py-1 uppercase font-bold text-[9px]">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border">
                                        ${movements.length === 0 ? 
                                            `<tr><td colspan="4" class="py-6 text-center italic text-muted-foreground">Sin movimientos.</td></tr>` : 
                                            movements.map(m => `
                                                <tr>
                                                    <td class="py-1.5">${m.fecha.split(' ')[0]}</td>
                                                    <td class="py-1.5"><span class="px-1 py-0.5 rounded uppercase font-bold text-[8px] ${m.tipo === 'Entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${m.tipo}</span></td>
                                                    <td class="py-1.5 text-center font-bold">${m.cantidad}</td>
                                                    <td class="py-1.5 text-muted-foreground truncate max-w-[150px]" title="${m.observacion}">${m.observacion || '—'}</td>
                                                </tr>
                                            `).join('')
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                                <i data-lucide="wrench" class="w-3.5 h-3.5"></i> Historial de Mantenimiento
                            </h4>
                            <div class="max-h-[200px] overflow-y-auto pr-2 space-y-2">
                                ${maintenance.length === 0 ? 
                                    `<div class="text-center py-6 text-muted-foreground text-xs italic border-2 border-dashed border-border rounded-xl">Sin registros de reparación.</div>` : 
                                    maintenance.map(m => `
                                        <div class="p-2 rounded-lg border border-border bg-orange-50/10">
                                            <div class="flex justify-between items-start mb-0.5 text-xs">
                                                <div class="font-bold">${m.tipo} (${m.cantidad} unid.)</div>
                                                <span class="text-[8px] uppercase font-bold text-orange-600">${m.estado}</span>
                                            </div>
                                            <div class="text-[9px] text-muted-foreground">Inicio: ${m.fecha_inicio} | Costo: S/ ${parseFloat(m.costo).toFixed(2)}</div>
                                            <div class="text-[9px] text-muted-foreground italic truncate">Prob: ${m.descripcion_problema}</div>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-outline" onclick="UI.closeModal()">Cerrar</button>
                <button class="btn btn-primary" onclick="UI.closeModal(); ${item.categoria_tipo === 'insumo' ? `openDispatchModal(${item.id})` : `openTransferModal(${item.id})`}">
                    ${item.categoria_tipo === 'insumo' ? 'Despachar Insumo' : 'Trasladar Mobiliario'}
                </button>
            `
        });
        lucide.createIcons();
    } catch(e) { console.error(e); UI.toast('Error al cargar historial', 'error'); }
    finally { UI.stopLoading(); }
};
