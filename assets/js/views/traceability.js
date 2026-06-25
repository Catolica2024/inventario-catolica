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
    window._traceResources = _traceResources;
}

// ==========================================
// MÓDULO: ASIGNACIONES (EQUIPOS)
// ==========================================
window.Views.assignments = function () {
    return `
        ${UI.pageHeader('Asignaciones de Equipos', 'Gestión de entrega y devolución de activos al personal', `
            <div class="flex flex-col sm:flex-row gap-2">
                <button class="btn btn-outline text-emerald-600" onclick="exportAssignmentsExcel()"><i data-lucide="file-spreadsheet" class="w-4 h-4 mr-2"></i> Excel</button>
                <button class="btn btn-outline" onclick="exportAssignmentsToPDF()"><i data-lucide="file-text" class="w-4 h-4 mr-2"></i> PDF</button>
                <button class="btn btn-primary" onclick="openAssignmentModal()"><i data-lucide="plus" class="w-4 h-4 mr-2"></i> Nueva Asignación</button>
            </div>
        `)}

        <div class="card">
            <div class="table-container">
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
        </div>
    `;
};

window.Views.assignments.afterMount = async function () {
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
                <button class="btn btn-ghost p-1.5 text-primary" onclick="viewAssignmentNote(${a.id})" title="Ver detalles"><i data-lucide="info" class="w-4 h-4"></i></button>
                ${a.estado === 'Activo' ?
            `<button class="btn btn-outline btn-sm mr-2" onclick="returnAsset(${a.id}, '${a.activo_nombre}')">Devolver</button>` :
            ''
        }
                ${window.canDelete(window.Auth.getUser()) ? 
                    `<button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteTraceRecord('assignments', ${a.id}, 'esta asignación')" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : 
                    ''
                }
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.viewAssignmentNote = async function (id) {
    UI.loading('Cargando detalles...');
    try {
        const resp = await fetch('api/assignments.php').then(r => r.json());
        const asig = resp.assignments.find(a => a.id == id);
        UI.stopLoading();

        if (!asig) { UI.toast('Asignación no encontrada', 'error'); return; }

        UI.modal({
            title: 'Detalles de la Asignación',
            body: `
                <div class="space-y-4">
                    <div class="p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <div class="text-[10px] uppercase font-bold text-primary mb-1">Equipo / Activo</div>
                        <div class="font-bold text-lg">${asig.activo_nombre}</div>
                        <div class="text-xs font-mono opacity-70">${asig.activo_codigo}</div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-3 bg-muted rounded-lg">
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Entregado a</div>
                            <div class="text-sm font-semibold">${asig.personal_nombre}</div>
                            <div class="text-[10px] opacity-70">${asig.fecha_asignacion}</div>
                        </div>
                        <div class="p-3 bg-muted rounded-lg">
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Devuelto el</div>
                            <div class="text-sm font-semibold">${asig.fecha_devolucion || 'Aún asignado'}</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Condición Entrega</div>
                            <div class="text-xs p-2 bg-white border rounded italic">${asig.condicion_entrega || 'No especificado'}</div>
                        </div>
                        <div>
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Condición Devolución</div>
                            <div class="text-xs p-2 bg-white border rounded italic">${asig.condicion_devolucion || '—'}</div>
                        </div>
                    </div>

                    <div>
                        <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Observaciones / Notas</div>
                        <div class="text-xs p-3 bg-white border rounded whitespace-pre-line">${asig.observaciones || 'Sin observaciones registradas.'}</div>
                    </div>

                    ${asig.foto_url ? `
                    <div class="mt-1">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="flex items-center gap-1.5 text-[10px] uppercase font-black text-indigo-700 tracking-widest">
                                <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                                Evidencia Fotográfica
                            </div>
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                        </div>
                        <button onclick="window.open('${asig.foto_url}', '_blank')" class="w-full group relative rounded-2xl overflow-hidden border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-slate-50 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300 cursor-pointer block">
                            <img src="${asig.foto_url}" class="w-full max-h-48 object-contain group-hover:scale-[1.03] transition-transform duration-500" alt="Evidencia de entrega">
                            <div class="absolute inset-0 bg-gradient-to-t from-indigo-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-4 gap-1">
                                <div class="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-2 flex items-center gap-2">
                                    <i data-lucide="zoom-in" class="w-4 h-4 text-white"></i>
                                    <span class="text-white text-xs font-bold">Ver foto completa</span>
                                </div>
                            </div>
                            <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity">
                                <i data-lucide="maximize-2" class="w-3 h-3 text-indigo-600"></i>
                                <span class="text-[10px] font-bold text-indigo-700">Click para ampliar</span>
                            </div>
                        </button>
                    </div>` : ''}
                </div>
            `,
            hideConfirm: true,
            cancelText: 'Cerrar'
        });
    } catch (e) {
        UI.stopLoading();
        UI.toast('Error al cargar detalles', 'error');
    }
};

window.openAssignmentModal = function (preselectedId = null) {
    let selectedAsset = preselectedId ? _traceResources.assets.find(a => a.id == preselectedId) : null;

    UI.modal({
        title: 'Nueva Asignación de Equipo',
        body: `
            <div class="space-y-4 pt-2">
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-primary">Buscar o Escanear Equipo <span class="text-destructive">*</span></label>
                    <div class="relative group">
                        <input type="text" id="asig-search" class="input w-full pr-20" 
                               placeholder="Ingrese Código, Serie o Nombre..." 
                               value="${selectedAsset ? (selectedAsset.codigo_patrimonial || selectedAsset.numero_serie || selectedAsset.item_nombre) : ''}">
                        <div class="absolute right-1 top-1 flex gap-1">
                            <button class="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" onclick="UI.openScanner((val, showError) => { 
                                document.getElementById('asig-search').value = val;
                                document.getElementById('asig-search').dispatchEvent(new Event('input')); 
                                return true;
                            })" title="Escanear QR">
                                <i data-lucide="camera" class="w-4 h-4"></i>
                            </button>
                            <div class="p-1.5 text-muted-foreground">
                                <i data-lucide="search" class="w-4 h-4"></i>
                            </div>
                        </div>
                    </div>
                    <div id="asig-found-info" class="mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs transition-all">
                        ${selectedAsset ?
                `<div class="font-bold text-primary">${selectedAsset.item_nombre}</div>
                             <div class="text-muted-foreground">Serie: ${selectedAsset.numero_serie || '—'} | Sede: ${selectedAsset.sede_nombre}</div>` :
                '<span class="italic text-muted-foreground">Escanee o ingrese un código para identificar el equipo...</span>'
            }
                    </div>
                    <input type="hidden" id="asig-activo-id" value="${preselectedId || ''}">
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Asignar a (Personal) <span class="text-destructive">*</span></label>
                    <select id="asig-personal" class="select w-full">
                        <option value="">Seleccione personal...</option>
                        ${_traceResources.staff.map(p => `<option value="${p.id}">${p.nombre} (${p.cargo})</option>`).join('')}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Fecha de Entrega</label>
                        <input type="date" id="asig-fecha" class="input w-full" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Condición</label>
                        <input type="text" id="asig-cond" class="input w-full" placeholder="Ej: Bueno, Operativo...">
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Observaciones</label>
                    <textarea id="asig-obs" class="input w-full h-20 shadow-sm" placeholder="Detalles adicionales..."></textarea>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold block uppercase text-muted-foreground">Foto de Entrega (Opcional)</label>
                    <div id="asig-photo-container" class="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all cursor-pointer" onclick="document.getElementById('asig-file').click()">
                        <input type="file" id="asig-file" accept="image/*" class="hidden" onchange="window.handleTracePhotoChange('asig')">
                        <div id="asig-photo-placeholder" class="flex flex-col items-center justify-center py-2 text-slate-400">
                            <i data-lucide="camera" class="w-8 h-8 mb-2 text-slate-400"></i>
                            <span class="text-xs font-semibold text-slate-600">Tomar foto o subir imagen</span>
                            <span class="text-[10px] text-muted-foreground">Click para usar la cámara o elegir archivo</span>
                        </div>
                        <div id="asig-photo-preview-wrapper" class="hidden flex flex-col items-center justify-center relative">
                            <img id="asig-photo-preview" class="max-h-32 rounded-lg object-contain shadow-sm border border-slate-100 mb-2">
                            <button type="button" class="btn btn-ghost btn-xs text-destructive flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg border border-destructive/10 bg-destructive/5 hover:bg-destructive hover:text-white transition-all text-xs" onclick="event.stopPropagation(); window.removeTracePhoto('asig')">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Quitar Foto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        confirmText: 'Confirmar Asignación',
        onConfirm: async () => {
            const asset_id = document.getElementById('asig-activo-id').value;
            const personal_id = document.getElementById('asig-personal').value;
            if (!asset_id || !personal_id) { UI.toast('Debe identificar un equipo válido y seleccionar el personal', 'error'); return false; }

            UI.loading('Subiendo imagen...');
            let foto_url = null;
            try {
                foto_url = await window.uploadTracePhoto('asig');
            } catch (e) {
                UI.stopLoading();
                UI.toast('Error al subir la imagen: ' + e.message, 'error');
                return false;
            }

            const data = {
                activo_id: asset_id,
                personal_id: personal_id,
                fecha_asignacion: document.getElementById('asig-fecha').value,
                condicion_entrega: document.getElementById('asig-cond').value,
                observaciones: document.getElementById('asig-obs').value,
                foto_url: foto_url
            };

            UI.loading('Registrando asignación...');
            const r = await fetch('api/assignments.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) { UI.toast('Asignación registrada con éxito', 'success'); loadAssignments(); }
            else UI.toast(r.error, 'error');
        }
    });

    // Lógica de búsqueda en tiempo real mejorada
    const searchInput = document.getElementById('asig-search');
    const infoDiv = document.getElementById('asig-found-info');
    const idInput = document.getElementById('asig-activo-id');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (!val) {
            infoDiv.innerHTML = '<span class="italic text-muted-foreground">Ingrese un código para identificar el equipo...</span>';
            idInput.value = '';
            infoDiv.className = 'mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs';
            return;
        }

        const found = _traceResources.assets.find(a =>
            (a.codigo_patrimonial && a.codigo_patrimonial.toLowerCase() === val) ||
            (a.numero_serie && a.numero_serie.toLowerCase() === val) ||
            (a.item_nombre && a.item_nombre.toLowerCase().includes(val)) ||
            (a.codigo_patrimonial && a.codigo_patrimonial.toLowerCase().includes(val))
        );

        if (found) {
            const isAssigned = found.personal_id !== null;
            const isBaja = found.estado === 'Baja';

            if (isBaja) {
                infoDiv.innerHTML = `
                    <div class="font-bold text-destructive">${found.item_nombre}</div>
                    <div class="text-muted-foreground">Serie: ${found.numero_serie || '—'} | Cód: ${found.codigo_patrimonial || '—'}</div>
                    <div class="mt-2 p-2 bg-red-100 text-red-700 rounded border border-red-200 font-bold uppercase text-[10px]">
                        🚫 EQUIPO DE BAJA: No puede ser asignado.
                    </div>
                `;
                idInput.value = '';
                infoDiv.className = 'mt-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs';
            } else {
                infoDiv.innerHTML = `
                    <div class="font-bold ${isAssigned ? 'text-destructive' : 'text-primary'}">${found.item_nombre}</div>
                    <div class="text-muted-foreground">Serie: ${found.numero_serie || '—'} | Sede: ${found.sede_nombre}</div>
                    ${isAssigned ?
                        `<div class="mt-2 p-2 bg-red-100 text-red-700 rounded border border-red-200 font-bold">
                            ⚠️ ATENCIÓN: Ya está asignado a ${found.responsable_nombre}. 
                        </div>` :
                        '<div class="mt-1 text-green-600 font-bold">✓ Equipo disponible para asignar</div>'
                    }
                `;
                idInput.value = isAssigned ? '' : found.id;
                infoDiv.className = `mt-2 p-3 rounded-lg border ${isAssigned ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'} text-xs`;
            }
        } else {
            infoDiv.innerHTML = '<span class="text-destructive font-medium">Equipo no encontrado</span>';
            idInput.value = '';
            infoDiv.className = 'mt-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs';
        }
    });

    lucide.createIcons();
};

window.returnAsset = function (id, nombre) {
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
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <input type="checkbox" id="ret-baja" class="w-4 h-4 text-destructive">
                    <div>
                        <label for="ret-baja" class="text-xs font-bold text-red-700 block cursor-pointer">Dar de baja definitivamente</label>
                        <p class="text-[10px] text-red-600">Marque esta opción si el equipo está malogrado y debe salir del inventario.</p>
                    </div>
                </div>
            </div>
        `,
        confirmText: 'Registrar Devolución',
        onConfirm: async () => {
            const isBaja = document.getElementById('ret-baja').checked;
            const data = {
                id,
                fecha_devolucion: document.getElementById('ret-fecha').value,
                condicion_devolucion: document.getElementById('ret-cond').value,
                observaciones: document.getElementById('ret-obs').value,
                dar_de_baja: isBaja
            };
            UI.loading('Procesando devolución...');
            const r = await fetch('api/assignments.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) {
                UI.toast(isBaja ? 'Equipo dado de baja con éxito' : 'Equipo devuelto al almacén', 'success');
                loadAssignments();
            }
            else UI.toast(r.error, 'error');
        }
    });
};

// ==========================================
// MÓDULO: TRASLADOS (MOBILIARIO)
// ==========================================
window.Views.transfers = function () {
    return `
        ${UI.pageHeader('Traslados de Mobiliario', 'Historial de movimientos de bienes entre aulas y espacios', `
            <div class="flex flex-col sm:flex-row gap-2">
                <button class="btn btn-outline text-emerald-600" onclick="exportTransfersExcel()"><i data-lucide="file-spreadsheet" class="w-4 h-4 mr-2"></i> Excel</button>
                <button class="btn btn-outline" onclick="exportTransfersToPDF()"><i data-lucide="file-text" class="w-4 h-4 mr-2"></i> PDF</button>
                <button class="btn btn-outline" onclick="openLocationHistory()"><i data-lucide="history" class="w-4 h-4 mr-2"></i> Historial por Espacio</button>
                <button class="btn btn-primary" onclick="openTransferModal()"><i data-lucide="move" class="w-4 h-4 mr-2"></i> Nuevo Traslado</button>
            </div>
        `)}

        <div class="bg-white p-4 rounded-xl border border-border mb-4 flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[200px]">
                <label class="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Filtrar por Ubicación (Origen o Destino)</label>
                <select id="filter-location" class="select w-full" onchange="loadTransfers()">
                    <option value="">Todas las ubicaciones</option>
                    <option value="almacen">Almacén Principal</option>
                    ${_traceResources.locations.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="flex-1 min-w-[200px]">
                <label class="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Buscar Mobiliario</label>
                <input type="text" id="filter-item" class="input w-full" placeholder="Nombre o código..." oninput="loadTransfers()">
            </div>
        </div>

        <div class="card">
            <div class="table-container">
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
        </div>
    `;
};

window.Views.transfers.afterMount = async function () {
    await loadTraceResources();
    loadTransfers();
    lucide.createIcons();
};

async function loadTransfers() {
    const tbody = document.getElementById('transfers-table-body');
    if (!tbody) return;

    const locFilter = document.getElementById('filter-location')?.value;
    const itemFilter = document.getElementById('filter-item')?.value?.toLowerCase();

    const resp = await fetch('api/transfers.php').then(r => r.json());
    let data = resp.transfers || [];

    // Aplicar filtros
    if (locFilter) {
        data = data.filter(t => {
            if (locFilter === 'almacen') return !t.ubicacion_origen_id || !t.ubicacion_destino_id;
            return t.ubicacion_origen_id == locFilter || t.ubicacion_destino_id == locFilter;
        });
    }
    if (itemFilter) {
        data = data.filter(t => t.item_nombre.toLowerCase().includes(itemFilter));
    }

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-muted-foreground">No se encontraron registros con los filtros aplicados.</td></tr>';
        return;
    }

    const user = window.Auth.getUser();
    const isAdmin = user && user.role === 'admin';

    tbody.innerHTML = data.map(t => `
        <tr>
            <td class="text-xs font-medium">${t.fecha}</td>
            <td class="font-bold text-sm">${t.item_nombre}</td>
            <td class="text-xs text-muted-foreground uppercase">${t.origen_nombre || 'ALMACÉN'}</td>
            <td class="text-xs font-bold uppercase ${(t.tipo === 'Baja') ? 'text-destructive' : (t.tipo === 'Entrada') ? 'text-green-600' : 'text-primary'}">${t.destino_nombre || 'DE BAJA'}</td>
            <td class="text-center font-bold text-sm">${t.cantidad}</td>
            <td class="text-xs font-medium">${t.responsable_nombre || '—'}</td>
            <td class="text-right whitespace-nowrap">
                ${(!t.tipo || t.tipo === 'Salida') ? `<button class="btn btn-outline text-xs px-2 py-1 mr-1" onclick="returnFurnitureTransfer(${t.id})" title="Retornar o Dar de Baja">Retornar</button>` : ''}
                <button class="btn btn-ghost p-1.5" onclick="viewTransferNote(${t.id})" title="Ver detalles"><i data-lucide="info" class="w-4 h-4"></i></button>
                ${isAdmin ? `<button class="btn btn-ghost p-1.5 text-indigo-600" onclick="editTransfer(${t.id})" title="Editar"><i data-lucide="pencil" class="w-4 h-4"></i></button>` : ''}
                ${window.canDelete(window.Auth.getUser()) ? 
                    `<button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteTraceRecord('transfers', ${t.id}, 'este traslado')" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : 
                    ''
                }
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.openLocationHistory = function () {
    UI.modal({
        title: 'Historial por Espacio / Ubicación',
        body: `
            <div class="space-y-4 pt-2">
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-primary">Seleccione el Espacio a Consultar</label>
                    <select id="hist-loc-id" class="select w-full">
                        <option value="">Seleccione una ubicación...</option>
                        ${_traceResources.locations.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                    </select>
                </div>
                <div id="hist-container" class="min-h-[200px] max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    <div class="text-center py-10 text-muted-foreground italic text-xs">Seleccione una ubicación para ver su historial...</div>
                </div>
            </div>
        `,
        hideConfirm: true,
        afterRender: () => {
            document.getElementById('hist-loc-id').onchange = async (e) => {
                const locId = e.target.value;
                const container = document.getElementById('hist-container');
                if (!locId) {
                    container.innerHTML = '<div class="text-center py-10 text-muted-foreground italic text-xs">Seleccione una ubicación para ver su historial...</div>';
                    return;
                }

                container.innerHTML = '<div class="text-center py-10"><div class="loading-spinner mx-auto"></div></div>';

                try {
                    const data = await fetch(`api/unified_history.php?type=location&id=${locId}`).then(r => r.json());
                    const history = data.history || [];

                    if (history.length === 0) {
                        container.innerHTML = '<div class="text-center py-10 text-muted-foreground text-xs font-medium">No hay movimientos registrados para este espacio.</div>';
                        return;
                    }

                    // Calcular stock actual por item (sólo para traslados en este view)
                    const stockMap = {};
                    history.filter(h => h.event_type === 'traslado').forEach(t => {
                        if (!stockMap[t.item_name]) stockMap[t.item_name] = 0;
                        if (t.destino === document.getElementById('hist-loc-id').options[document.getElementById('hist-loc-id').selectedIndex].text) stockMap[t.item_name] += parseInt(t.cantidad);
                        if (t.origen === document.getElementById('hist-loc-id').options[document.getElementById('hist-loc-id').selectedIndex].text) stockMap[t.item_name] -= parseInt(t.cantidad);
                    });

                    let html = `
                        <div class="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <div class="text-[10px] font-bold uppercase text-primary mb-2">Mobiliario Actual en este Espacio</div>
                            <div class="grid grid-cols-2 gap-2">
                                ${Object.entries(stockMap).filter(([name, qty]) => qty > 0).map(([name, qty]) => `
                                    <div class="flex justify-between items-center text-xs p-1.5 bg-white rounded border shadow-sm">
                                        <span class="font-medium truncate mr-2">${name}</span>
                                        <span class="font-bold text-primary">${qty}</span>
                                    </div>
                                `).join('') || '<div class="col-span-2 text-[10px] text-muted-foreground italic">No hay mobiliario activo actualmente.</div>'}
                            </div>
                        </div>
                        <div class="text-[10px] font-bold uppercase text-muted-foreground mb-3 px-1">Línea de Tiempo Completa</div>
                        <div class="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    `;

                    html += history.map(h => {
                        let icon = 'circle';
                        let color = 'bg-muted text-muted-foreground';
                        let label = 'EVENTO';
                        let detail = '';

                        if (h.event_type === 'traslado') {
                            const currentLocName = document.getElementById('hist-loc-id').options[document.getElementById('hist-loc-id').selectedIndex].text;
                            const isEntry = h.destino === currentLocName;
                            icon = isEntry ? 'arrow-down-left' : 'arrow-up-right';
                            color = isEntry ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700';
                            label = isEntry ? 'INGRESO' : 'SALIDA';
                            detail = isEntry ? `Desde: ${h.origen || 'Almacén'}` : `Hacia: ${h.destino || 'Baja / Almacén'}`;
                        } else if (h.event_type === 'mantenimiento') {
                            icon = 'wrench';
                            color = 'bg-blue-100 text-blue-700';
                            label = `MANTENIMIENTO ${h.tipo}`;
                            detail = `Item: ${h.item_name} | Técnico: ${h.tecnico || '—'}`;
                        } else if (h.event_type === 'responsable') {
                            icon = 'user';
                            color = 'bg-purple-100 text-purple-700';
                            label = 'RESPONSABLE';
                            detail = `Nuevo encargado: ${h.item_name}`;
                        }

                        return `
                            <div class="pl-8 relative">
                                <div class="absolute left-0 top-0.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${color} z-10">
                                    <i data-lucide="${icon}" class="w-3 h-3"></i>
                                </div>
                                <div class="p-3 rounded-xl border border-border bg-white shadow-sm hover:shadow-md transition-all">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="text-[10px] font-bold tracking-wider">${label}</span>
                                        <span class="text-[10px] text-muted-foreground font-mono">${h.fecha}</span>
                                    </div>
                                    <div class="text-xs font-bold">${h.event_type === 'traslado' ? `${h.cantidad} x ${h.item_name}` : h.item_name}</div>
                                    <div class="text-[10px] text-muted-foreground mt-0.5">${detail}</div>
                                    ${h.motivo ? `<div class="mt-2 pt-2 border-t text-[10px] text-muted-foreground italic">"${h.motivo}"</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');

                    html += `</div>`;
                    container.innerHTML = html;
                    lucide.createIcons();
                } catch (err) {
                    container.innerHTML = '<div class="text-center py-10 text-destructive text-xs">Error al cargar el historial unificado.</div>';
                }
            }
        }
    });
};

window.viewTransferNote = async function(id) {
    UI.loading('Cargando detalles...');
    try {
        const resp = await fetch('api/transfers.php').then(r => r.json());
        const t = resp.transfers.find(x => x.id == id);
        UI.stopLoading();
        if (!t) return;

        const tipoLabel = t.tipo === 'Baja' ? '<span class="badge badge-error">BAJA DEFINITIVA</span>' :
                          t.tipo === 'Entrada' ? '<span class="badge badge-success">RETORNO</span>' :
                          '<span class="badge badge-info">TRASLADO</span>';

        // Format created_at for display
        let registradoEl = '';
        if (t.created_at) {
            const dt = new Date(t.created_at);
            const fecha = dt.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const hora  = dt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            registradoEl = `<div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Fecha y Hora de Registro</div>
                <div class="text-sm font-mono font-bold text-slate-700">${fecha}</div>
                <div class="text-xs text-slate-500 font-mono">${hora} hrs</div>
            </div>`;
        }

        UI.modal({
            title: 'Detalles del Traslado',
            body: `
                <div class="space-y-4">
                    <div class="p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <div class="text-[10px] uppercase font-bold text-orange-700 mb-1">Mobiliario / Artículo</div>
                        <div class="font-bold text-lg">${t.item_nombre}</div>
                        <div class="flex items-center gap-2 mt-1">
                            <div class="text-xs opacity-70">Cantidad: <strong>${t.cantidad}</strong> unidades</div>
                            ${tipoLabel}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-3 bg-muted rounded-lg">
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Origen</div>
                            <div class="text-sm font-semibold">${t.origen_nombre || 'ALMACÉN PRINCIPAL'}</div>
                        </div>
                        <div class="p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <div class="text-[10px] uppercase font-bold text-primary mb-1">Destino</div>
                            <div class="text-sm font-semibold">${t.destino_nombre || 'DE BAJA'}</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-3 bg-muted rounded-lg">
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Fecha del Traslado</div>
                            <div class="text-sm font-medium">${t.fecha}</div>
                        </div>
                        <div class="p-3 bg-muted rounded-lg">
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Responsable</div>
                            <div class="text-sm font-medium">${t.responsable_nombre || 'No especificado'}</div>
                        </div>
                    </div>
                    ${registradoEl}
                    <div>
                        <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Motivo / Observaciones</div>
                        <div class="text-xs p-3 bg-white border rounded whitespace-pre-line">${t.motivo || 'Sin observaciones.'}</div>
                    </div>
                    ${t.observaciones ? `
                    <div>
                        <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Notas Adicionales</div>
                        <div class="text-xs p-3 bg-white border rounded whitespace-pre-line">${t.observaciones}</div>
                    </div>` : ''}
                    ${t.foto_url ? `
                    <div class="mt-1">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="flex items-center gap-1.5 text-[10px] uppercase font-black text-amber-700 tracking-widest">
                                <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                                Evidencia Fotográfica
                            </div>
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                        </div>
                        <button onclick="window.open('${t.foto_url}', '_blank')" class="w-full group relative rounded-2xl overflow-hidden border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-slate-50 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all duration-300 cursor-pointer block">
                            <img src="${t.foto_url}" class="w-full max-h-48 object-contain group-hover:scale-[1.03] transition-transform duration-500" alt="Evidencia del traslado">
                            <div class="absolute inset-0 bg-gradient-to-t from-amber-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-4 gap-1">
                                <div class="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-2 flex items-center gap-2">
                                    <i data-lucide="zoom-in" class="w-4 h-4 text-white"></i>
                                    <span class="text-white text-xs font-bold">Ver foto completa</span>
                                </div>
                            </div>
                            <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity">
                                <i data-lucide="maximize-2" class="w-3 h-3 text-amber-600"></i>
                                <span class="text-[10px] font-bold text-amber-700">Click para ampliar</span>
                            </div>
                        </button>
                    </div>` : ''}
                </div>
            `,
            hideConfirm: true,
            cancelText: 'Cerrar'
        });
        lucide.createIcons();
    } catch (e) { UI.stopLoading(); }
};

window.returnFurnitureTransfer = async function(id) {
    UI.loading('Cargando datos...');
    try {
        const resp = await fetch('api/transfers.php').then(r => r.json());
        const t = resp.transfers.find(x => x.id == id);
        UI.stopLoading();
        if (!t) return;

        UI.modal({
            title: 'Retornar o Dar de Baja Mobiliario',
            body: `
                <div class="space-y-4 pt-2">
                    <div class="p-3 bg-muted rounded-lg border border-dashed border-border">
                        <div class="text-xs font-bold text-primary">${t.item_nombre}</div>
                        <div class="text-[10px] text-muted-foreground">Ubicación actual: <strong>${t.destino_nombre}</strong> &nbsp;|&nbsp; Cantidad trasladada: <strong>${t.cantidad}</strong></div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase">Cantidad a Retornar <span class="text-destructive">*</span></label>
                            <input type="number" id="ret-f-qty" class="input w-full" value="${t.cantidad}" min="1" max="${t.cantidad}">
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase">Fecha</label>
                            <input type="date" id="ret-f-fecha" class="input w-full" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>

                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Observaciones / Motivo</label>
                        <textarea id="ret-f-obs" class="input w-full h-20" placeholder="Ej: Retorno por fin de evento, Baja por rotura..."></textarea>
                    </div>

                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <input type="checkbox" id="ret-f-baja" class="w-4 h-4 accent-red-600">
                        <div>
                            <label for="ret-f-baja" class="text-xs font-bold text-red-700 block cursor-pointer">⚠️ Dar de baja definitivamente (Mobiliario malogrado)</label>
                            <p class="text-[10px] text-red-600">La cantidad indicada NO volverá al stock disponible.</p>
                        </div>
                    </div>
                </div>
            `,
            confirmText: 'Procesar Retorno / Baja',
            onConfirm: async () => {
                const isBaja = document.getElementById('ret-f-baja').checked;
                const qty = parseInt(document.getElementById('ret-f-qty').value);

                if (!qty || qty <= 0) { UI.toast('Ingrese una cantidad válida', 'error'); return false; }
                if (qty > parseInt(t.cantidad)) { 
                    UI.toast(`⚠️ La cantidad máxima a retornar es ${t.cantidad} (lo que se trasladó originalmente)`, 'error'); 
                    return false; 
                }

                const data = {
                    item_id: t.item_id,
                    ubicacion_origen_id: t.ubicacion_destino_id,
                    ubicacion_destino_id: isBaja ? null : 13,
                    cantidad: qty,
                    fecha: document.getElementById('ret-f-fecha').value,
                    motivo: document.getElementById('ret-f-obs').value || (isBaja ? 'RETORNO POR DAÑO/BAJA DEFINITIVA' : 'RETORNO A ALMACÉN'),
                    tipo: isBaja ? 'Baja' : 'Entrada',
                    is_return_baja: isBaja  // <-- indica que el item YA fue descontado del stock con la Salida original
                };

                UI.loading(isBaja ? 'Procesando baja...' : 'Procesando retorno...');
                const r = await fetch('api/transfers.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(x => x.json());

                UI.stopLoading();
                if (r.ok) {
                    UI.toast(isBaja ? '🗑️ Mobiliario dado de baja definitivamente' : '✅ Mobiliario retornado al almacén', 'success');
                    loadTransfers();
                } else {
                    UI.toast('Error: ' + (r.error || 'Error desconocido'), 'error');
                    return false;
                }
            }
        });
    } catch (e) { UI.stopLoading(); console.error(e); }
};

window.openTransferModal = function (preselectedId = null) {
    let selectedItem = preselectedId ? _traceResources.items.find(i => i.id == preselectedId) : null;

    UI.modal({
        title: 'Registrar Traslado de Mobiliario',
        body: `
            <div class="space-y-4 pt-2">
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-primary">Buscar o Escanear Mobiliario <span class="text-destructive">*</span></label>
                    <div class="relative group">
                        <input type="text" id="tr-search" class="input w-full pr-20" 
                               placeholder="Ingrese Código o Nombre del Artículo..." 
                               value="${selectedItem ? (selectedItem.codigo || selectedItem.nombre) : ''}">
                        <div class="absolute right-1 top-1 flex gap-1">
                            <button class="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" onclick="UI.openScanner((val, showError) => { 
                                const found = window._traceResources.items.find(i => i.categoria_tipo === 'mobiliario' && i.codigo && i.codigo.toLowerCase() === val.toLowerCase());
                                if (!found) {
                                    const other = window._traceResources.items.find(i => i.codigo && i.codigo.toLowerCase() === val.toLowerCase());
                                    if (other) showError('⚠️ Error: El código ' + val + ' es un ' + other.categoria_tipo.toUpperCase() + ' y no un MOBILIARIO.');
                                    else {
                                        const asset = window._traceResources.assets.find(a => a.codigo_patrimonial && a.codigo_patrimonial.toLowerCase() === val.toLowerCase());
                                        if (asset) showError('⚠️ Error: El código ' + val + ' es un EQUIPO individual, no MOBILIARIO.');
                                        else showError('⚠️ Código ' + val + ' no reconocido.');
                                    }
                                    return false;
                                }
                                document.getElementById('tr-search').value = val; 
                                document.getElementById('tr-search').dispatchEvent(new Event('input')); 
                                return true;
                            })" title="Escanear QR">
                                <i data-lucide="camera" class="w-4 h-4"></i>
                            </button>
                            <div class="p-1.5 text-muted-foreground">
                                <i data-lucide="search" class="w-4 h-4"></i>
                            </div>
                        </div>
                    </div>
                    <div id="tr-found-info" class="mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs transition-all">
                        ${selectedItem ?
                `<div class="font-bold text-primary">${selectedItem.nombre}</div>
                             <div class="text-muted-foreground">Categoría: ${selectedItem.categoria_nombre} | Stock: ${selectedItem.stock_actual}</div>` :
                '<span class="italic text-muted-foreground">Escanee o busque el mobiliario a trasladar...</span>'
            }
                    </div>
                    <input type="hidden" id="tr-item" value="${preselectedId || ''}">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Desde (Origen)</label>
                        <select id="tr-origen" class="select w-full">
                            <option value="">Almacén Principal</option>
                            ${_traceResources.locations.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Hacia (Destino) <span class="text-destructive">*</span></label>
                        <select id="tr-destino" class="select w-full">
                            <option value="">Seleccione destino...</option>
                            ${_traceResources.locations.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Cantidad <span class="text-destructive">*</span></label>
                        <input type="number" id="tr-qty" class="input w-full" value="1" min="1">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Fecha</label>
                        <input type="date" id="tr-fecha" class="input w-full" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Responsable del Traslado</label>
                    <select id="tr-resp" class="select w-full">
                        <option value="">Seleccione personal...</option>
                        ${_traceResources.staff.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Motivo / Observaciones</label>
                    <textarea id="tr-obs" class="input w-full h-20" placeholder="Ej: Cambio de mobiliario por mantenimiento..."></textarea>
                </div>
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <input type="checkbox" id="tr-baja" class="w-4 h-4 text-destructive">
                    <div>
                        <label for="tr-baja" class="text-xs font-bold text-red-700 block cursor-pointer">Registrar como BAJA definitiva (Mobiliario inservible)</label>
                        <p class="text-[10px] text-red-600">La cantidad indicada se descontará permanentemente del stock por estar malograda.</p>
                    </div>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold block uppercase text-muted-foreground">Foto del Traslado (Opcional)</label>
                    <div id="tr-photo-container" class="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all cursor-pointer" onclick="document.getElementById('tr-file').click()">
                        <input type="file" id="tr-file" accept="image/*" class="hidden" onchange="window.handleTracePhotoChange('tr')">
                        <div id="tr-photo-placeholder" class="flex flex-col items-center justify-center py-2 text-slate-400">
                            <i data-lucide="camera" class="w-8 h-8 mb-2 text-slate-400"></i>
                            <span class="text-xs font-semibold text-slate-600">Tomar foto o subir imagen</span>
                            <span class="text-[10px] text-muted-foreground">Click para usar la cámara o elegir archivo</span>
                        </div>
                        <div id="tr-photo-preview-wrapper" class="hidden flex flex-col items-center justify-center relative">
                            <img id="tr-photo-preview" class="max-h-32 rounded-lg object-contain shadow-sm border border-slate-100 mb-2">
                            <button type="button" class="btn btn-ghost btn-xs text-destructive flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg border border-destructive/10 bg-destructive/5 hover:bg-destructive hover:text-white transition-all text-xs" onclick="event.stopPropagation(); window.removeTracePhoto('tr')">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Quitar Foto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        confirmText: 'Registrar Movimiento',
        onConfirm: async () => {
            const isBaja = document.getElementById('tr-baja').checked;
            const data = {
                item_id: document.getElementById('tr-item').value,
                ubicacion_origen_id: document.getElementById('tr-origen').value,
                ubicacion_destino_id: isBaja ? null : document.getElementById('tr-destino').value,
                cantidad: document.getElementById('tr-qty').value,
                fecha: document.getElementById('tr-fecha').value,
                responsable_id: document.getElementById('tr-resp').value,
                motivo: document.getElementById('tr-obs').value,
                tipo: isBaja ? 'Baja' : 'Salida'
            };
            if (!data.item_id || (!isBaja && !data.ubicacion_destino_id) || !data.cantidad) { UI.toast('Complete los campos obligatorios', 'error'); return false; }

            UI.loading('Subiendo imagen...');
            let foto_url = null;
            try {
                foto_url = await window.uploadTracePhoto('tr');
            } catch (e) {
                UI.stopLoading();
                UI.toast('Error al subir la imagen: ' + e.message, 'error');
                return false;
            }
            data.foto_url = foto_url;

            UI.loading(isBaja ? 'Registrando baja...' : 'Registrando traslado...');
            const r = await fetch('api/transfers.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) {
                UI.toast(isBaja ? 'Baja registrada con éxito' : 'Traslado registrado con éxito', 'success');
                loadTransfers();
            }
            else UI.toast(r.error, 'error');
        }
    });

    const searchInput = document.getElementById('tr-search');
    const infoDiv = document.getElementById('tr-found-info');
    const idInput = document.getElementById('tr-item');

    // Contenedor para resultados de búsqueda predictiva
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'mt-1 max-h-40 overflow-y-auto bg-white border border-border rounded-lg hidden z-50 relative shadow-lg';
    searchInput.parentNode.after(resultsDiv);

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (val.length < 2) {
            resultsDiv.classList.add('hidden');
            if (!val) {
                infoDiv.innerHTML = '<span class="italic text-muted-foreground">Escanee o busque el mobiliario a trasladar...</span>';
                idInput.value = '';
                infoDiv.className = 'mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs';
            }
            return;
        }

        const matches = _traceResources.items.filter(i =>
            i.categoria_tipo === 'mobiliario' && (
                (i.codigo && i.codigo.toLowerCase().includes(val)) ||
                (i.nombre && i.nombre.toLowerCase().includes(val))
            )
        ).slice(0, 5);

        if (matches.length === 0) {
            resultsDiv.innerHTML = '<div class="p-3 text-xs text-muted-foreground italic text-center">No se encontraron coincidencias</div>';
            resultsDiv.classList.remove('hidden');
            infoDiv.innerHTML = '<span class="text-destructive font-medium">Mobiliario no encontrado</span>';
            idInput.value = '';
            infoDiv.className = 'mt-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs';
            return;
        }

        resultsDiv.innerHTML = matches.map(i => `
            <div class="p-2 hover:bg-primary/5 cursor-pointer border-b border-border last:border-0" 
                 onclick="window.selectTransferItem(${i.id}, '${i.nombre.replace(/'/g, "\\'")}', '${i.categoria_nombre}', ${i.stock_actual})">
                <div class="text-xs font-bold">${i.nombre}</div>
                <div class="text-[10px] text-muted-foreground uppercase">${i.categoria_nombre} | Stock: ${i.stock_actual}</div>
            </div>
        `).join('');
        resultsDiv.classList.remove('hidden');
    });

    window.selectTransferItem = (id, nombre, categoria, stock) => {
        idInput.value = id;
        searchInput.value = nombre;
        resultsDiv.classList.add('hidden');
        infoDiv.innerHTML = `
            <div class="font-bold text-primary">${nombre}</div>
            <div class="text-muted-foreground">Categoría: ${categoria} | Stock Actual: <span class="font-bold">${stock}</span></div>
            ${stock <= 0 ? '<div class="text-destructive font-bold mt-1">⚠️ Sin stock disponible</div>' : '<div class="text-green-600 font-bold mt-1">✓ Disponible para traslado</div>'}
        `;
        idInput.value = stock > 0 ? id : '';
        infoDiv.className = `mt-2 p-3 rounded-lg border ${stock > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} text-xs`;
    };

    lucide.createIcons();
};

// ==========================================
// MÓDULO: DESPACHO (INSUMOS)
// ==========================================
window.Views.dispatch = function () {
    return `
        ${UI.pageHeader('Despacho de Insumos', 'Registro de entrega de materiales consumibles al personal', `
            <div class="flex flex-col sm:flex-row gap-2">
                <button class="btn btn-outline text-emerald-600" onclick="exportDispatchesExcel()"><i data-lucide="file-spreadsheet" class="w-4 h-4 mr-2"></i> Exportar Excel</button>
                <button class="btn btn-primary" onclick="openDispatchModal()"><i data-lucide="send" class="w-4 h-4 mr-2"></i> Nuevo Despacho</button>
            </div>
        `)}

        <div class="card">
            <div class="table-container">
                <table class="data">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Insumo</th>
                            <th>Entregado a</th>
                            <th>Destino</th>
                            <th class="text-center">Cant.</th>
                            <th>Entregado por</th>
                            <th class="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="dispatch-table-body">
                        <tr><td colspan="7" class="text-center py-10">Cargando historial de despachos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.Views.dispatch.afterMount = async function () {
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-muted-foreground">No hay registros de despachos.</td></tr>';
        return;
    }

    const user = window.Auth.getUser();
    const isAdmin = user && user.role === 'admin';

    tbody.innerHTML = data.map(m => `
        <tr>
            <td class="text-xs">${m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '—'}</td>
            <td class="font-bold">${m.item_nombre}</td>
            <td class="font-medium text-primary">${m.destinatario_nombre || '—'}</td>
            <td class="text-xs font-semibold uppercase text-amber-700">${m.ubicacion_nombre || '—'}</td>
            <td class="text-center font-bold">${m.cantidad}</td>
            <td class="text-xs italic">${m.despachado_por_nombre || 'Admin'}</td>
            <td class="text-right whitespace-nowrap">
                <button class="btn btn-ghost p-1.5 text-primary" onclick="viewDispatchNote(${m.id})" title="Ver detalles"><i data-lucide="info" class="w-4 h-4"></i></button>
                ${isAdmin ? `<button class="btn btn-ghost p-1.5 text-indigo-600" onclick="editDispatch(${m.id})" title="Editar"><i data-lucide="pencil" class="w-4 h-4"></i></button>` : ''}
                ${window.canDelete(window.Auth.getUser()) ? 
                    `<button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteTraceRecord('dispatch', ${m.id}, 'este despacho')" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : 
                    ''
                }
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.viewDispatchNote = async function(id) {
    UI.loading('Cargando detalles...');
    try {
        const resp = await fetch('api/movements.php').then(r => r.json());
        const m = (resp.movements || []).find(x => x.id == id);
        UI.stopLoading();
        if (!m) { UI.toast('Registro no encontrado', 'error'); return; }

        // Format datetime for display
        let fechaStr = '—';
        let horaStr = '';
        if (m.fecha) {
            const dt = new Date(m.fecha);
            fechaStr = dt.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            horaStr  = dt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }

        UI.modal({
            title: 'Detalles del Despacho',
            body: `
                <div class="space-y-4">
                    <!-- Header: Item info -->
                    <div class="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div class="text-[10px] uppercase font-bold text-amber-700 mb-1">Insumo Despachado</div>
                        <div class="font-bold text-lg">${m.item_nombre}</div>
                        <div class="flex items-center gap-3 mt-1">
                            <span class="badge badge-warning">SALIDA</span>
                            <span class="text-xs font-bold text-amber-700">Cantidad: ${m.cantidad}</span>
                        </div>
                    </div>

                    <!-- Timestamp block -->
                    <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-4">
                        <div class="flex-1">
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Fecha del Despacho</div>
                            <div class="text-sm font-semibold capitalize">${fechaStr}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Hora</div>
                            <div class="text-sm font-mono font-bold text-primary">${horaStr} hrs</div>
                        </div>
                    </div>

                    <!-- Partes involucradas -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <div class="text-[10px] uppercase font-bold text-primary mb-1">Entregado a</div>
                            <div class="text-sm font-semibold">${m.destinatario_nombre || 'No especificado'}</div>
                        </div>
                        <div class="p-3 bg-muted rounded-lg">
                            <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Entregado por</div>
                            <div class="text-sm font-medium">${m.despachado_por_nombre || 'Administrador'}</div>
                        </div>
                    </div>

                    <!-- Destino -->
                    <div class="p-3 bg-muted rounded-lg">
                        <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Destino / Aula o Espacio</div>
                        <div class="text-sm font-semibold uppercase text-amber-700">${m.ubicacion_nombre || 'No especificado'}</div>
                    </div>

                    <!-- Observaciones -->
                    ${m.observacion ? `
                    <div>
                        <div class="text-[10px] uppercase font-bold text-muted-foreground mb-1">Observaciones</div>
                        <div class="text-xs p-3 bg-white border rounded whitespace-pre-line">${m.observacion}</div>
                    </div>` : ''}

                    <!-- Foto evidencia -->
                    ${m.foto_url ? `
                    <div class="mt-1">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="flex items-center gap-1.5 text-[10px] uppercase font-black text-emerald-700 tracking-widest">
                                <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                                Evidencia Fotográfica
                            </div>
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <button onclick="window.open('${m.foto_url}', '_blank')" class="w-full group relative rounded-2xl overflow-hidden border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-slate-50 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-300 cursor-pointer block">
                            <img src="${m.foto_url}" class="w-full max-h-52 object-contain group-hover:scale-[1.03] transition-transform duration-500" alt="Evidencia del despacho">
                            <div class="absolute inset-0 bg-gradient-to-t from-emerald-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end pb-4 gap-1">
                                <div class="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-2 flex items-center gap-2">
                                    <i data-lucide="zoom-in" class="w-4 h-4 text-white"></i>
                                    <span class="text-white text-xs font-bold">Ver foto completa</span>
                                </div>
                            </div>
                            <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity">
                                <i data-lucide="maximize-2" class="w-3 h-3 text-emerald-600"></i>
                                <span class="text-[10px] font-bold text-emerald-700">Click para ampliar</span>
                            </div>
                        </button>
                    </div>` : `
                    <div class="p-3 rounded-lg border border-dashed border-slate-200 flex items-center gap-2 text-slate-400">
                        <i data-lucide="image-off" class="w-4 h-4"></i>
                        <span class="text-xs italic">Sin evidencia fotográfica para este despacho.</span>
                    </div>`}
                </div>
            `,
            hideConfirm: true,
            cancelText: 'Cerrar'
        });
        lucide.createIcons();
    } catch (e) {
        UI.stopLoading();
        UI.toast('Error al cargar los detalles', 'error');
        console.error(e);
    }
};

window.openDispatchModal = function (preselectedId = null) {
    let selectedItem = preselectedId ? _traceResources.items.find(i => i.id == preselectedId) : null;
    const currentUser = window.Auth ? window.Auth.getUser() : null;

    UI.modal({
        title: 'Registrar Despacho de Insumos',
        body: `
            <div class="space-y-4 pt-2">
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-primary">Buscar o Escanear Insumo <span class="text-destructive">*</span></label>
                    <div class="relative group">
                        <input type="text" id="disp-search" class="input w-full pr-20" 
                               placeholder="Ingrese Código o Nombre del Insumo..." 
                               value="${selectedItem ? (selectedItem.codigo || selectedItem.nombre) : ''}">
                        <div class="absolute right-1 top-1 flex gap-1">
                            <button class="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" onclick="UI.openScanner((val, showError) => { 
                                const found = window._traceResources.items.find(i => i.categoria_tipo === 'insumo' && i.codigo && i.codigo.toLowerCase() === val.toLowerCase());
                                if (!found) {
                                    const other = window._traceResources.items.find(i => i.codigo && i.codigo.toLowerCase() === val.toLowerCase());
                                    if (other) showError('⚠️ Error: El código ' + val + ' es un ' + other.categoria_tipo.toUpperCase() + ' y no un INSUMO.');
                                    else showError('⚠️ Código ' + val + ' no reconocido como Insumo.');
                                    return false;
                                }
                                document.getElementById('disp-search').value = val; 
                                document.getElementById('disp-search').dispatchEvent(new Event('input')); 
                                return true;
                            })" title="Escanear QR">
                                <i data-lucide="camera" class="w-4 h-4"></i>
                            </button>
                            <div class="p-1.5 text-muted-foreground">
                                <i data-lucide="search" class="w-4 h-4"></i>
                            </div>
                        </div>
                    </div>
                    <div id="disp-found-info" class="mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs transition-all">
                        ${selectedItem ?
                `<div class="font-bold text-primary">${selectedItem.nombre}</div>
                              <div class="text-muted-foreground">Stock Actual: <span class="font-bold">${selectedItem.stock_actual}</span> ${selectedItem.unidad_medida || 'unid.'}</div>` :
                '<span class="italic text-muted-foreground">Escanee o busque el insumo a despachar...</span>'
            }
                    </div>
                    <input type="hidden" id="disp-item" value="${preselectedId || ''}">
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Entregar a (Personal) <span class="text-destructive">*</span></label>
                    <select id="disp-dest" class="select w-full">
                        <option value="">Seleccione destinatario...</option>
                        ${_traceResources.staff.map(p => `<option value="${p.id}">${p.nombre} (${p.area})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Destino (Aula / Espacio) <span class="text-destructive">*</span></label>
                    <select id="disp-dest-loc" class="select w-full">
                        <option value="">Seleccione destino...</option>
                        ${_traceResources.locations.filter(l => l.estado !== 'inactivo').map(l => `<option value="${l.id}">${l.nombre} ${l.tipo ? `(${l.tipo})` : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Cantidad a Despachar (<span class="font-bold text-primary" id="disp-unit-label">${selectedItem ? selectedItem.unidad_medida || 'unid.' : 'unid.'}</span>) <span class="text-destructive">*</span></label>
                        <input type="number" id="disp-qty" class="input w-full" value="1" min="1">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Entregado por</label>
                        <input type="text" class="input w-full bg-muted text-muted-foreground cursor-not-allowed" value="${currentUser ? currentUser.name : 'Administrador'}" readonly disabled>
                        <input type="hidden" id="disp-admin" value="${currentUser ? (currentUser.personal_id || '') : ''}">
                    </div>
                </div>
                <div id="disp-error-container" class="hidden p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-600 font-semibold transition-all"></div>
                <div>
                    <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Observaciones</label>
                    <textarea id="disp-obs" class="input w-full h-20 resize-none py-2 px-3 shadow-sm" placeholder="Ej: Entrega semanal para limpieza..."></textarea>
                </div>
                <div class="space-y-1">
                    <label class="text-xs font-bold block uppercase text-muted-foreground">Foto del Insumo Despachado (Opcional)</label>
                    <div id="disp-photo-container" class="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all cursor-pointer" onclick="document.getElementById('disp-file').click()">
                        <input type="file" id="disp-file" accept="image/*" class="hidden" onchange="window.handleTracePhotoChange('disp')">
                        <div id="disp-photo-placeholder" class="flex flex-col items-center justify-center py-2 text-slate-400">
                            <i data-lucide="camera" class="w-8 h-8 mb-2 text-slate-400"></i>
                            <span class="text-xs font-semibold text-slate-600">Tomar foto o subir imagen</span>
                            <span class="text-[10px] text-muted-foreground">Click para usar la cámara o elegir archivo</span>
                        </div>
                        <div id="disp-photo-preview-wrapper" class="hidden flex flex-col items-center justify-center relative">
                            <img id="disp-photo-preview" class="max-h-32 rounded-lg object-contain shadow-sm border border-slate-100 mb-2">
                            <button type="button" class="btn btn-ghost btn-xs text-destructive flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg border border-destructive/10 bg-destructive/5 hover:bg-destructive hover:text-white transition-all text-xs" onclick="event.stopPropagation(); window.removeTracePhoto('disp')">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Quitar Foto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        confirmText: 'Confirmar Despacho',
        onConfirm: async () => {
            const item_id = document.getElementById('disp-item').value;
            const dest_id = document.getElementById('disp-dest').value;
            const qty = document.getElementById('disp-qty').value;
            const dest_loc = document.getElementById('disp-dest-loc').value;

            const errContainer = document.getElementById('disp-error-container');
            errContainer.classList.add('hidden');
            document.getElementById('disp-qty').classList.remove('border-red-500', 'ring-red-400', 'ring-2');

            if (!item_id || !dest_id || !qty || !dest_loc) { 
                errContainer.innerHTML = '⚠️ Complete todos los campos obligatorios (Insumo, Personal, Destino y Cantidad).';
                errContainer.classList.remove('hidden');
                return false; 
            }

            // Validar stock antes de enviar
            const item = _traceResources.items.find(i => i.id == item_id);
            if (item) {
                const stock = parseInt(item.stock_actual);
                const qtyVal = parseInt(qty);
                if (qtyVal > stock) {
                    errContainer.innerHTML = `⚠️ <strong>Error: Stock insuficiente.</strong> No se puede registrar porque la cantidad ingresada (${qtyVal}) supera el stock disponible (${stock}). Sería información engañosa.`;
                    errContainer.classList.remove('hidden');
                    document.getElementById('disp-qty').classList.add('border-red-500', 'ring-red-400', 'ring-2');
                    return false;
                }
            }

            UI.loading('Subiendo imagen...');
            let foto_url = null;
            try {
                foto_url = await window.uploadTracePhoto('disp');
            } catch (e) {
                UI.stopLoading();
                errContainer.innerHTML = '⚠️ Error al subir la imagen: ' + e.message;
                errContainer.classList.remove('hidden');
                return false;
            }

            const data = {
                item_id: item_id,
                personal_destinatario_id: dest_id,
                despachado_por_id: document.getElementById('disp-admin').value,
                cantidad: qty,
                tipo: 'Salida',
                ubicacion_id: dest_loc,
                observacion: document.getElementById('disp-obs').value,
                foto_url: foto_url
            };

            UI.loading('Registrando despacho...');
            const r = await fetch('api/movements.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
            UI.stopLoading();
            if (r.ok) { UI.toast('Despacho registrado correctamente', 'success'); loadDispatches(); }
            else { 
                errContainer.innerHTML = `⚠️ <strong>Error de servidor:</strong> ${r.error}`;
                errContainer.classList.remove('hidden');
                return false; 
            }
        }
    });

    const searchInput = document.getElementById('disp-search');
    const infoDiv = document.getElementById('disp-found-info');
    const idInput = document.getElementById('disp-item');
    const qtyInput = document.getElementById('disp-qty');
    const errDiv = document.getElementById('disp-error-container');

    const checkStockLimit = () => {
        const itemId = idInput.value;
        const qtyVal = parseInt(qtyInput.value) || 0;
        
        errDiv.classList.add('hidden');
        qtyInput.classList.remove('border-red-500', 'ring-red-400', 'ring-2');

        if (!itemId) return true;
        const item = _traceResources.items.find(i => i.id == itemId);
        if (item) {
            const stock = parseInt(item.stock_actual);
            if (qtyVal > stock) {
                errDiv.innerHTML = `⚠️ <strong>Error: Stock insuficiente.</strong> No se puede despachar la cantidad ingresada (${qtyVal}) porque supera el stock disponible (${stock} ${item.unidad_medida || 'unid.'}). Sería información engañosa.`;
                errDiv.classList.remove('hidden');
                qtyInput.classList.add('border-red-500', 'ring-red-400', 'ring-2');
                return false;
            }
        }
        return true;
    };

    qtyInput.addEventListener('input', checkStockLimit);

    // Contenedor para resultados de búsqueda predictiva
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'mt-1 max-h-40 overflow-y-auto bg-white border border-border rounded-lg hidden z-50 relative shadow-lg';
    searchInput.parentNode.after(resultsDiv);

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (val.length < 2) {
            resultsDiv.classList.add('hidden');
            if (!val) {
                infoDiv.innerHTML = '<span class="italic text-muted-foreground">Escanee o busque el insumo a despachar...</span>';
                idInput.value = '';
                infoDiv.className = 'mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs';
                checkStockLimit();
            }
            return;
        }

        const matches = _traceResources.items.filter(i =>
            i.categoria_tipo === 'insumo' && (
                (i.codigo && i.codigo.toLowerCase().includes(val)) ||
                (i.nombre && i.nombre.toLowerCase().includes(val))
            )
        ).slice(0, 5);

        if (matches.length === 0) {
            resultsDiv.innerHTML = '<div class="p-3 text-xs text-muted-foreground italic text-center">No se encontraron coincidencias</div>';
            resultsDiv.classList.remove('hidden');
            infoDiv.innerHTML = '<span class="text-destructive font-medium">Insumo no encontrado</span>';
            idInput.value = '';
            infoDiv.className = 'mt-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs';
            checkStockLimit();
            return;
        }

        resultsDiv.innerHTML = matches.map(i => `
            <div class="p-2 hover:bg-primary/5 cursor-pointer border-b border-border last:border-0" 
                 onclick="window.selectDispatchItem(${i.id}, '${i.nombre.replace(/'/g, "\\'")}', ${i.stock_actual}, '${i.unidad_medida || 'unid.'}')">
                <div class="text-xs font-bold">${i.nombre}</div>
                <div class="text-[10px] text-muted-foreground uppercase">Stock: ${i.stock_actual} ${i.unidad_medida || 'unid.'}</div>
            </div>
        `).join('');
        resultsDiv.classList.remove('hidden');
    });

    window.selectDispatchItem = (id, nombre, stock, unidad) => {
        idInput.value = id;
        searchInput.value = nombre;
        resultsDiv.classList.add('hidden');
        infoDiv.innerHTML = `
            <div class="font-bold text-primary">${nombre}</div>
            <div class="text-muted-foreground">Stock Actual: <span class="font-bold">${stock}</span> ${unidad}</div>
            ${stock <= 0 ? '<div class="text-destructive font-bold mt-1">⚠️ Sin stock disponible</div>' : '<div class="text-green-600 font-bold mt-1">✓ Insumo disponible</div>'}
        `;
        idInput.value = stock > 0 ? id : '';
        infoDiv.className = `mt-2 p-3 rounded-lg border ${stock > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} text-xs`;

        const label = document.getElementById('disp-unit-label');
        if (label) label.textContent = unidad;

        checkStockLimit();
    };

    lucide.createIcons();
};

window.viewAssetDetails = async function (id) {
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
    } catch (e) { console.error(e); UI.toast('Error al cargar detalles', 'error'); }
    finally { UI.stopLoading(); }
};
window.deleteTraceRecord = function (type, id, label) {
    if (!window.canDelete(window.Auth.getUser())) {
        UI.toast('Solo el Administrador puede eliminar registros', 'error');
        return;
    }
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

window.viewCatalogItem = async function (id) {
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
                            <div class="max-h-[250px] table-container pr-2">
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
    } catch (e) { console.error(e); UI.toast('Error al cargar historial', 'error'); }
    finally { UI.stopLoading(); }
};

// ==========================================
// UTILIDADES DE EXPORTACIÓN (EXPERT REPORTING)
// ==========================================

window.exportAssignmentsToPDF = async function() {
    UI.loading('Generando reporte de asignaciones...');
    try {
        const resp = await fetch('api/assignments.php').then(r => r.json());
        const data = resp.assignments || [];
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        // Estilo institucional
        doc.setFillColor(27, 92, 255);
        doc.rect(0, 0, 297, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('CATÓLICA SCHOOL', 20, 20);
        doc.setFontSize(12);
        doc.text('REPORTE DE ASIGNACIONES DE ACTIVOS', 20, 28);
        
        doc.setFontSize(10);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 230, 20);
        
        const body = data.map(a => [
            a.activo_nombre,
            a.activo_codigo,
            a.personal_nombre,
            a.fecha_asignacion,
            a.estado,
            a.fecha_devolucion || '—'
        ]);

        doc.autoTable({
            startY: 50,
            head: [['Equipo', 'Código', 'Asignado a', 'Fecha Entrega', 'Estado', 'Devolución']],
            body: body,
            headStyles: { fillColor: [27, 92, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 20, right: 20 },
            theme: 'striped'
        });

        doc.save(`Reporte-Asignaciones-${new Date().getTime()}.pdf`);
        UI.toast('Reporte generado con éxito', 'success');
    } catch (e) {
        console.error(e);
        UI.toast('Error al generar PDF', 'error');
    } finally {
        UI.stopLoading();
    }
};

window.exportTransfersToPDF = async function() {
    UI.loading('Generando reporte de traslados...');
    try {
        const resp = await fetch('api/transfers.php').then(r => r.json());
        const data = resp.transfers || [];
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        
        doc.setFillColor(27, 92, 255);
        doc.rect(0, 0, 297, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('CATÓLICA SCHOOL', 20, 20);
        doc.setFontSize(12);
        doc.text('REPORTE DE TRASLADOS DE MOBILIARIO', 20, 28);
        
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleString()}`, 230, 20);
        
        const body = data.map(t => [
            t.fecha,
            t.item_nombre,
            t.origen_nombre || 'ALMACÉN',
            t.destino_nombre || 'DE BAJA',
            t.cantidad,
            t.responsable_nombre || '—'
        ]);

        doc.autoTable({
            startY: 50,
            head: [['Fecha', 'Mobiliario', 'Origen', 'Destino', 'Cant.', 'Responsable']],
            body: body,
            headStyles: { fillColor: [27, 92, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 20, right: 20 },
            theme: 'grid'
        });

        doc.save(`Reporte-Traslados-${new Date().getTime()}.pdf`);
        UI.toast('Reporte generado con éxito', 'success');
    } catch (e) {
        UI.toast('Error al generar PDF', 'error');
    } finally {
        UI.stopLoading();
    }
};
window.exportAssignmentsExcel = async function() {
    UI.loading('Preparando datos...');
    try {
        const resp = await fetch('api/assignments.php').then(r => r.json());
        const data = (resp.assignments || []).map(a => ({
            'Equipo': a.activo_nombre,
            'Código': a.activo_codigo,
            'Asignado a': a.personal_nombre,
            'Fecha Entrega': a.fecha_asignacion,
            'Estado': a.estado,
            'Fecha Devolución': a.fecha_devolucion || 'Aún asignado'
        }));
        UI.exportToExcel(data, 'Asignaciones_Equipos.xlsx');
    } catch(e) { UI.toast('Error al exportar', 'error'); }
    finally { UI.stopLoading(); }
};

window.exportTransfersExcel = async function() {
    UI.loading('Preparando datos...');
    try {
        const resp = await fetch('api/transfers.php').then(r => r.json());
        const data = (resp.transfers || []).map(t => ({
            'Fecha': t.fecha,
            'Mobiliario': t.item_nombre,
            'Origen': t.origen_nombre || 'Almacén',
            'Destino': t.destino_nombre || 'De Baja',
            'Cantidad': t.cantidad,
            'Responsable': t.responsable_nombre || '—'
        }));
        UI.exportToExcel(data, 'Traslados_Mobiliario.xlsx');
    } catch(e) { UI.toast('Error al exportar', 'error'); }
    finally { UI.stopLoading(); }
};

window.exportDispatchesExcel = async function() {
    UI.loading('Preparando datos...');
    try {
        const resp = await fetch('api/movements.php').then(r => r.json());
        const data = (resp.movements || []).filter(m => m.tipo === 'Salida' && m.categoria_tipo === 'insumo').map(m => ({
            'Fecha': m.fecha,
            'Insumo': m.item_nombre,
            'Entregado a': m.destinatario_nombre || '—',
            'Destino': m.ubicacion_nombre || '—',
            'Cantidad': m.cantidad,
            'Entregado por': m.despachado_por_nombre || 'Admin',
            'Observaciones': m.observacion || ''
        }));
        UI.exportToExcel(data, 'Despacho_Insumos.xlsx');
    } catch(e) { UI.toast('Error al exportar', 'error'); }
    finally { UI.stopLoading(); }
};

// ==========================================
// CONTROLADORES DE SUBIDA DE IMAGEN / FOTO
// ==========================================
window.handleTracePhotoChange = function(prefix) {
    const fileInput = document.getElementById(`${prefix}-file`);
    const placeholder = document.getElementById(`${prefix}-photo-placeholder`);
    const previewWrapper = document.getElementById(`${prefix}-photo-preview-wrapper`);
    const previewImg = document.getElementById(`${prefix}-photo-preview`);
    
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            placeholder.classList.add('hidden');
            previewWrapper.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
};

window.removeTracePhoto = function(prefix) {
    const fileInput = document.getElementById(`${prefix}-file`);
    const placeholder = document.getElementById(`${prefix}-photo-placeholder`);
    const previewWrapper = document.getElementById(`${prefix}-photo-preview-wrapper`);
    const previewImg = document.getElementById(`${prefix}-photo-preview`);
    
    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.src = '';
    if (placeholder) placeholder.classList.remove('hidden');
    if (previewWrapper) previewWrapper.classList.add('hidden');
};

window.uploadTracePhoto = async function(prefix) {
    const fileInput = document.getElementById(`${prefix}-file`);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return null;
    }
    
    const file = fileInput.files[0];
    const name = `${prefix.toUpperCase()}_${Date.now()}_${file.name}`;
    
    return new Promise((resolve, reject) => {
        if (typeof google === 'undefined') {
            reject(new Error('La librería de Google API no está cargada. Por favor, recargue la página.'));
            return;
        }
        if (typeof DRIVE_CLIENT_ID === 'undefined' || typeof DRIVE_FOLDER_ID === 'undefined') {
            reject(new Error('Configuración de Google Drive no disponible en este momento.'));
            return;
        }
        
        const metadata = {
            name: name,
            parents: [DRIVE_FOLDER_ID]
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        google.accounts.oauth2.initTokenClient({
            client_id: DRIVE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (token) => {
                if (token.error) {
                    reject(new Error('Acceso denegado a Google Drive: ' + token.error));
                    return;
                }
                if (!token.access_token) {
                    reject(new Error('No se pudo obtener el token de acceso de Google.'));
                    return;
                }
                try {
                    const uploadResp = await fetch(
                        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
                        {
                            method: 'POST',
                            headers: { Authorization: 'Bearer ' + token.access_token },
                            body: form
                        }
                    );
                    if (uploadResp.ok) {
                        const fileData = await uploadResp.json();
                        // Hacer que el archivo sea visible para cualquier persona con el link (para renderizado directo en la UI)
                        await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
                            method: 'POST',
                            headers: {
                                Authorization: 'Bearer ' + token.access_token,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ role: 'reader', type: 'anyone' })
                        });
                        // Retornamos el link directo para visualización en <img> (uc?export=view&id=)
                        resolve(`https://drive.google.com/uc?export=view&id=${fileData.id}`);
                    } else {
                        const err = await uploadResp.json();
                        reject(new Error(err.error?.message || 'Error al subir a Google Drive.'));
                    }
                } catch (err) {
                    reject(err);
                }
            }
        }).requestAccessToken();
    });
};

window.editDispatch = async function (id) {
    const user = window.Auth.getUser();
    if (!user || user.role !== 'admin') {
        UI.toast('Solo el Administrador puede editar despachos', 'error');
        return;
    }

    UI.loading('Cargando datos...');
    try {
        const resp = await fetch('api/movements.php').then(r => r.json());
        const m = (resp.movements || []).find(x => x.id == id);
        UI.stopLoading();
        if (!m) { UI.toast('Registro no encontrado', 'error'); return; }

        let selectedItem = _traceResources.items.find(i => i.id == m.item_id);

        UI.modal({
            title: 'Editar Despacho de Insumos',
            body: `
                <div class="space-y-4 pt-2">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-primary">Insumo <span class="text-destructive">*</span></label>
                        <div class="relative group">
                            <input type="text" id="edit-disp-search" class="input w-full pr-20" 
                                   placeholder="Ingrese Código o Nombre del Insumo..." 
                                   value="${selectedItem ? (selectedItem.codigo || selectedItem.nombre) : ''}">
                            <div class="absolute right-1 top-1 flex gap-1">
                                <button class="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" onclick="UI.openScanner((val, showError) => { 
                                    const found = window._traceResources.items.find(i => i.categoria_tipo === 'insumo' && i.codigo && i.codigo.toLowerCase() === val.toLowerCase());
                                    if (!found) {
                                        showError('⚠️ Código no reconocido como Insumo.');
                                        return false;
                                    }
                                    document.getElementById('edit-disp-search').value = val; 
                                    document.getElementById('edit-disp-search').dispatchEvent(new Event('input')); 
                                    return true;
                                })" title="Escanear QR">
                                    <i data-lucide="camera" class="w-4 h-4"></i>
                                </button>
                                <div class="p-1.5 text-muted-foreground">
                                    <i data-lucide="search" class="w-4 h-4"></i>
                                </div>
                            </div>
                        </div>
                        <div id="edit-disp-found-info" class="mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs transition-all">
                            ${selectedItem ?
                                `<div class="font-bold text-primary">${selectedItem.nombre}</div>
                                  <div class="text-muted-foreground">Stock Actual: <span class="font-bold">${selectedItem.stock_actual}</span> ${selectedItem.unidad_medida || 'unid.'}</div>` :
                                '<span class="italic text-muted-foreground">Busque el insumo...</span>'
                            }
                        </div>
                        <input type="hidden" id="edit-disp-item" value="${m.item_id}">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Entregar a (Personal) <span class="text-destructive">*</span></label>
                        <select id="edit-disp-dest" class="select w-full">
                            <option value="">Seleccione destinatario...</option>
                            ${_traceResources.staff.map(p => `<option value="${p.id}" ${p.id == m.personal_destinatario_id ? 'selected' : ''}>${p.nombre} (${p.area})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Destino (Aula / Espacio) <span class="text-destructive">*</span></label>
                        <select id="edit-disp-dest-loc" class="select w-full">
                            <option value="">Seleccione destino...</option>
                            ${_traceResources.locations.filter(l => l.estado !== 'inactivo').map(l => `<option value="${l.id}" ${l.id == m.ubicacion_id ? 'selected' : ''}>${l.nombre} ${l.tipo ? `(${l.tipo})` : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Cantidad a Despachar (<span class="font-bold text-primary" id="edit-disp-unit-label">${selectedItem ? selectedItem.unidad_medida || 'unid.' : 'unid.'}</span>) <span class="text-destructive">*</span></label>
                            <input type="number" id="edit-disp-qty" class="input w-full" value="${m.cantidad}" min="1">
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Entregado por</label>
                            <select id="edit-disp-admin" class="select w-full">
                                <option value="">Administrador</option>
                                ${_traceResources.staff.map(p => `<option value="${p.id}" ${p.id == m.despachado_por_id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div id="edit-disp-error-container" class="hidden p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-600 font-semibold transition-all"></div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Observaciones</label>
                        <textarea id="edit-disp-obs" class="input w-full h-20 resize-none py-2 px-3 shadow-sm" placeholder="Ej: Entrega semanal...">${m.observacion || ''}</textarea>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold block uppercase text-muted-foreground">Foto del Insumo Despachado (Opcional)</label>
                        <div id="edit-disp-photo-container" class="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all cursor-pointer" onclick="document.getElementById('edit-disp-file').click()">
                            <input type="file" id="edit-disp-file" accept="image/*" class="hidden" onchange="window.handleTracePhotoChange('edit-disp')">
                            <div id="edit-disp-photo-placeholder" class="flex flex-col items-center justify-center py-2 text-slate-400 ${m.foto_url ? 'hidden' : ''}">
                                <i data-lucide="camera" class="w-8 h-8 mb-2 text-slate-400"></i>
                                <span class="text-xs font-semibold text-slate-600">Tomar foto o subir imagen</span>
                                <span class="text-[10px] text-muted-foreground">Click para usar la cámara o elegir archivo</span>
                            </div>
                            <div id="edit-disp-photo-preview-wrapper" class="flex flex-col items-center justify-center relative ${m.foto_url ? '' : 'hidden'}">
                                <img id="edit-disp-photo-preview" src="${m.foto_url || ''}" class="max-h-32 rounded-lg object-contain shadow-sm border border-slate-100 mb-2">
                                <button type="button" class="btn btn-ghost btn-xs text-destructive flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg border border-destructive/10 bg-destructive/5 hover:bg-destructive hover:text-white transition-all text-xs" onclick="event.stopPropagation(); window.removeTracePhoto('edit-disp')">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Quitar Foto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            confirmText: 'Guardar Cambios',
            onConfirm: async () => {
                const item_id = document.getElementById('edit-disp-item').value;
                const dest_id = document.getElementById('edit-disp-dest').value;
                const qty = document.getElementById('edit-disp-qty').value;
                const dest_loc = document.getElementById('edit-disp-dest-loc').value;

                const errContainer = document.getElementById('edit-disp-error-container');
                errContainer.classList.add('hidden');
                document.getElementById('edit-disp-qty').classList.remove('border-red-500', 'ring-red-400', 'ring-2');

                if (!item_id || !dest_id || !qty || !dest_loc) { 
                    errContainer.innerHTML = '⚠️ Complete todos los campos obligatorios.';
                    errContainer.classList.remove('hidden');
                    return false; 
                }

                // Validar stock
                const item = _traceResources.items.find(i => i.id == item_id);
                if (item) {
                    const originalQty = parseInt(m.cantidad);
                    const stock = parseInt(item.stock_actual) + (item_id == m.item_id ? originalQty : 0);
                    const qtyVal = parseInt(qty);
                    if (qtyVal > stock) {
                        errContainer.innerHTML = `⚠️ <strong>Error: Stock insuficiente.</strong> No se puede registrar porque la cantidad ingresada (${qtyVal}) supera el stock disponible (${stock}).`;
                        errContainer.classList.remove('hidden');
                        document.getElementById('edit-disp-qty').classList.add('border-red-500', 'ring-red-400', 'ring-2');
                        return false;
                    }
                }

                UI.loading('Subiendo imagen...');
                let foto_url = m.foto_url;
                const fileInput = document.getElementById('edit-disp-file');
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    try {
                        foto_url = await window.uploadTracePhoto('edit-disp');
                    } catch (e) {
                        UI.stopLoading();
                        errContainer.innerHTML = '⚠️ Error al subir la imagen: ' + e.message;
                        errContainer.classList.remove('hidden');
                        return false;
                    }
                } else {
                    const previewWrapper = document.getElementById('edit-disp-photo-preview-wrapper');
                    if (previewWrapper && previewWrapper.classList.contains('hidden')) {
                        foto_url = null;
                    }
                }

                const data = {
                    id: id,
                    item_id: item_id,
                    personal_destinatario_id: dest_id,
                    despachado_por_id: document.getElementById('edit-disp-admin').value || null,
                    cantidad: qty,
                    tipo: 'Salida',
                    ubicacion_id: dest_loc,
                    observacion: document.getElementById('edit-disp-obs').value,
                    foto_url: foto_url
                };

                UI.loading('Guardando cambios...');
                const r = await fetch('api/movements.php', { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(data) 
                }).then(x => x.json());
                UI.stopLoading();
                if (r.ok) { 
                    UI.toast('Despacho actualizado correctamente', 'success'); 
                    loadDispatches(); 
                } else { 
                    errContainer.innerHTML = `⚠️ <strong>Error de servidor:</strong> ${r.error}`;
                    errContainer.classList.remove('hidden');
                    return false; 
                }
            }
        });

        const searchInput = document.getElementById('edit-disp-search');
        const infoDiv = document.getElementById('edit-disp-found-info');
        const idInput = document.getElementById('edit-disp-item');
        const qtyInput = document.getElementById('edit-disp-qty');
        const errDiv = document.getElementById('edit-disp-error-container');

        const checkStockLimit = () => {
            const itemId = idInput.value;
            const qtyVal = parseInt(qtyInput.value) || 0;
            
            errDiv.classList.add('hidden');
            qtyInput.classList.remove('border-red-500', 'ring-red-400', 'ring-2');

            if (!itemId) return true;
            const item = _traceResources.items.find(i => i.id == itemId);
            if (item) {
                const originalQty = parseInt(m.cantidad);
                const stock = parseInt(item.stock_actual) + (itemId == m.item_id ? originalQty : 0);
                if (qtyVal > stock) {
                    errDiv.innerHTML = `⚠️ <strong>Error: Stock insuficiente.</strong> No se puede despachar porque supera el stock disponible (${stock} ${item.unidad_medida || 'unid.'}).`;
                    errDiv.classList.remove('hidden');
                    qtyInput.classList.add('border-red-500', 'ring-red-400', 'ring-2');
                    return false;
                }
            }
            return true;
        };

        qtyInput.addEventListener('input', checkStockLimit);

        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'mt-1 max-h-40 overflow-y-auto bg-white border border-border rounded-lg hidden z-50 relative shadow-lg';
        searchInput.parentNode.after(resultsDiv);

        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            if (val.length < 2) {
                resultsDiv.classList.add('hidden');
                if (!val) {
                    infoDiv.innerHTML = '<span class="italic text-muted-foreground">Busque el insumo...</span>';
                    idInput.value = '';
                    infoDiv.className = 'mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs';
                    checkStockLimit();
                }
                return;
            }

            const matches = _traceResources.items.filter(i =>
                i.categoria_tipo === 'insumo' && (
                    (i.codigo && i.codigo.toLowerCase().includes(val)) ||
                    (i.nombre && i.nombre.toLowerCase().includes(val))
                )
            ).slice(0, 5);

            if (matches.length === 0) {
                resultsDiv.innerHTML = '<div class="p-3 text-xs text-muted-foreground italic text-center">No se encontraron coincidencias</div>';
                resultsDiv.classList.remove('hidden');
                infoDiv.innerHTML = '<span class="text-destructive font-medium">Insumo no encontrado</span>';
                idInput.value = '';
                infoDiv.className = 'mt-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs';
                checkStockLimit();
                return;
            }

            resultsDiv.innerHTML = matches.map(i => `
                <div class="p-2 hover:bg-primary/5 cursor-pointer border-b border-border last:border-0" 
                     onclick="window.selectEditDispatchItem(${i.id}, '${i.nombre.replace(/'/g, "\\'")}', ${i.stock_actual}, '${i.unidad_medida || 'unid.'}')">
                    <div class="text-xs font-bold">${i.nombre}</div>
                    <div class="text-[10px] text-muted-foreground uppercase">Stock: ${i.stock_actual} ${i.unidad_medida || 'unid.'}</div>
                </div>
            `).join('');
            resultsDiv.classList.remove('hidden');
        });

        window.selectEditDispatchItem = (id, nombre, stock, unidad) => {
            idInput.value = id;
            searchInput.value = nombre;
            resultsDiv.classList.add('hidden');
            const originalQty = parseInt(m.cantidad);
            const stockCalc = stock + (id == m.item_id ? originalQty : 0);
            infoDiv.innerHTML = `
                <div class="font-bold text-primary">${nombre}</div>
                <div class="text-muted-foreground">Stock Actual: <span class="font-bold">${stockCalc}</span> ${unidad}</div>
                ${stockCalc <= 0 ? '<div class="text-destructive font-bold mt-1">⚠️ Sin stock disponible</div>' : '<div class="text-green-600 font-bold mt-1">✓ Insumo disponible</div>'}
            `;
            idInput.value = stockCalc > 0 ? id : '';
            infoDiv.className = `mt-2 p-3 rounded-lg border ${stockCalc > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} text-xs`;

            const label = document.getElementById('edit-disp-unit-label');
            if (label) label.textContent = unidad;

            checkStockLimit();
        };

        lucide.createIcons();
    } catch (e) {
        UI.stopLoading();
        UI.toast('Error al cargar datos del despacho', 'error');
        console.error(e);
    }
};

window.editTransfer = async function (id) {
    const user = window.Auth.getUser();
    if (!user || user.role !== 'admin') {
        UI.toast('Solo el Administrador puede editar traslados', 'error');
        return;
    }

    UI.loading('Cargando datos...');
    try {
        const resp = await fetch('api/transfers.php').then(r => r.json());
        const t = (resp.transfers || []).find(x => x.id == id);
        UI.stopLoading();
        if (!t) { UI.toast('Registro no encontrado', 'error'); return; }

        let selectedItem = _traceResources.items.find(i => i.id == t.item_id);

        UI.modal({
            title: 'Editar Traslado de Mobiliario',
            body: `
                <div class="space-y-4 pt-2">
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-primary">Mobiliario <span class="text-destructive">*</span></label>
                        <div class="relative group">
                            <input type="text" id="edit-tr-search" class="input w-full pr-20" 
                                   placeholder="Ingrese Código o Nombre del Artículo..." 
                                   value="${selectedItem ? (selectedItem.codigo || selectedItem.nombre) : ''}">
                            <div class="absolute right-1 top-1 flex gap-1">
                                <button class="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" onclick="UI.openScanner((val, showError) => { 
                                    const found = window._traceResources.items.find(i => i.categoria_tipo === 'mobiliario' && i.codigo && i.codigo.toLowerCase() === val.toLowerCase());
                                    if (!found) {
                                        showError('⚠️ Código no reconocido como Mobiliario.');
                                        return false;
                                    }
                                    document.getElementById('edit-tr-search').value = val; 
                                    document.getElementById('edit-tr-search').dispatchEvent(new Event('input')); 
                                    return true;
                                })" title="Escanear QR">
                                    <i data-lucide="camera" class="w-4 h-4"></i>
                                </button>
                                <div class="p-1.5 text-muted-foreground">
                                    <i data-lucide="search" class="w-4 h-4"></i>
                                </div>
                            </div>
                        </div>
                        <div id="edit-tr-found-info" class="mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs transition-all">
                            ${selectedItem ?
                                `<div class="font-bold text-primary">${selectedItem.nombre}</div>
                                 <div class="text-muted-foreground">Categoría: ${selectedItem.categoria_nombre} | Stock: ${selectedItem.stock_actual}</div>` :
                                '<span class="italic text-muted-foreground">Busque el mobiliario...</span>'
                            }
                        </div>
                        <input type="hidden" id="edit-tr-item" value="${t.item_id}">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Desde (Origen)</label>
                            <select id="edit-tr-origen" class="select w-full">
                                <option value="">Almacén Principal</option>
                                ${_traceResources.locations.map(l => `<option value="${l.id}" ${l.id == t.ubicacion_origen_id ? 'selected' : ''}>${l.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Hacia (Destino) <span class="text-destructive">*</span></label>
                            <select id="edit-tr-destino" class="select w-full">
                                <option value="">Seleccione destino...</option>
                                ${_traceResources.locations.map(l => `<option value="${l.id}" ${l.id == t.ubicacion_destino_id ? 'selected' : ''}>${l.nombre}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Cantidad <span class="text-destructive">*</span></label>
                            <input type="number" id="edit-tr-qty" class="input w-full" value="${t.cantidad}" min="1">
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Fecha</label>
                            <input type="date" id="edit-tr-fecha" class="input w-full" value="${t.fecha}">
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Responsable del Traslado</label>
                        <select id="edit-tr-resp" class="select w-full">
                            <option value="">Seleccione personal...</option>
                            ${_traceResources.staff.map(p => `<option value="${p.id}" ${p.id == t.responsable_id ? 'selected' : ''}>${p.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground">Motivo / Observaciones</label>
                        <textarea id="edit-tr-obs" class="input w-full h-20" placeholder="Ej: Cambio de mobiliario...">${t.motivo || ''}</textarea>
                    </div>
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <input type="checkbox" id="edit-tr-baja" class="w-4 h-4 text-destructive" ${t.tipo === 'Baja' ? 'checked' : ''}>
                        <div>
                            <label for="edit-tr-baja" class="text-xs font-bold text-red-700 block cursor-pointer">Registrar como BAJA definitiva (Mobiliario inservible)</label>
                            <p class="text-[10px] text-red-600">La cantidad indicada se descontará permanentemente del stock por estar malograda.</p>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold block uppercase text-muted-foreground">Foto del Traslado (Opcional)</label>
                        <div id="edit-tr-photo-container" class="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all cursor-pointer" onclick="document.getElementById('edit-tr-file').click()">
                            <input type="file" id="edit-tr-file" accept="image/*" class="hidden" onchange="window.handleTracePhotoChange('edit-tr')">
                            <div id="edit-tr-photo-placeholder" class="flex flex-col items-center justify-center py-2 text-slate-400 ${t.foto_url ? 'hidden' : ''}">
                                <i data-lucide="camera" class="w-8 h-8 mb-2 text-slate-400"></i>
                                <span class="text-xs font-semibold text-slate-600">Tomar foto o subir imagen</span>
                                <span class="text-[10px] text-muted-foreground">Click para usar la cámara o elegir archivo</span>
                            </div>
                            <div id="edit-tr-photo-preview-wrapper" class="flex flex-col items-center justify-center relative ${t.foto_url ? '' : 'hidden'}">
                                <img id="edit-tr-photo-preview" src="${t.foto_url || ''}" class="max-h-32 rounded-lg object-contain shadow-sm border border-slate-100 mb-2">
                                <button type="button" class="btn btn-ghost btn-xs text-destructive flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg border border-destructive/10 bg-destructive/5 hover:bg-destructive hover:text-white transition-all text-xs" onclick="event.stopPropagation(); window.removeTracePhoto('edit-tr')">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Quitar Foto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            confirmText: 'Guardar Cambios',
            onConfirm: async () => {
                const isBaja = document.getElementById('edit-tr-baja').checked;
                const item_id = document.getElementById('edit-tr-item').value;
                const qty = document.getElementById('edit-tr-qty').value;

                if (!item_id || (!isBaja && !document.getElementById('edit-tr-destino').value) || !qty) {
                    UI.toast('Complete los campos obligatorios', 'error');
                    return false;
                }

                // Validar stock
                const item = _traceResources.items.find(i => i.id == item_id);
                if (item) {
                    const originalQty = parseInt(t.cantidad);
                    const stock = parseInt(item.stock_actual) + (item_id == t.item_id ? originalQty : 0);
                    const qtyVal = parseInt(qty);
                    if (qtyVal > stock) {
                        UI.toast(`⚠️ Stock insuficiente. El stock disponible es de ${stock} unidades.`, 'error');
                        return false;
                    }
                }

                UI.loading('Subiendo imagen...');
                let foto_url = t.foto_url;
                const fileInput = document.getElementById('edit-tr-file');
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    try {
                        foto_url = await window.uploadTracePhoto('edit-tr');
                    } catch (e) {
                        UI.stopLoading();
                        UI.toast('Error al subir la imagen: ' + e.message, 'error');
                        return false;
                    }
                } else {
                    const previewWrapper = document.getElementById('edit-tr-photo-preview-wrapper');
                    if (previewWrapper && previewWrapper.classList.contains('hidden')) {
                        foto_url = null;
                    }
                }

                const data = {
                    id: id,
                    item_id: item_id,
                    ubicacion_origen_id: document.getElementById('edit-tr-origen').value,
                    ubicacion_destino_id: isBaja ? null : document.getElementById('edit-tr-destino').value,
                    cantidad: qty,
                    fecha: document.getElementById('edit-tr-fecha').value,
                    responsable_id: document.getElementById('edit-tr-resp').value,
                    motivo: document.getElementById('edit-tr-obs').value,
                    tipo: isBaja ? 'Baja' : 'Salida',
                    foto_url: foto_url
                };

                UI.loading('Guardando cambios...');
                const r = await fetch('api/transfers.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(x => x.json());
                UI.stopLoading();
                if (r.ok) {
                    UI.toast('Traslado actualizado correctamente', 'success');
                    loadTransfers();
                } else {
                    UI.toast('Error al actualizar: ' + r.error, 'error');
                    return false;
                }
            }
        });

        const searchInput = document.getElementById('edit-tr-search');
        const infoDiv = document.getElementById('edit-tr-found-info');
        const idInput = document.getElementById('edit-tr-item');

        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'mt-1 max-h-40 overflow-y-auto bg-white border border-border rounded-lg hidden z-50 relative shadow-lg';
        searchInput.parentNode.after(resultsDiv);

        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            if (val.length < 2) {
                resultsDiv.classList.add('hidden');
                if (!val) {
                    infoDiv.innerHTML = '<span class="italic text-muted-foreground">Busque el mobiliario...</span>';
                    idInput.value = '';
                    infoDiv.className = 'mt-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs';
                }
                return;
            }

            const matches = _traceResources.items.filter(i =>
                i.categoria_tipo === 'mobiliario' && (
                    (i.codigo && i.codigo.toLowerCase().includes(val)) ||
                    (i.nombre && i.nombre.toLowerCase().includes(val))
                )
            ).slice(0, 5);

            if (matches.length === 0) {
                resultsDiv.innerHTML = '<div class="p-3 text-xs text-muted-foreground italic text-center">No se encontraron coincidencias</div>';
                resultsDiv.classList.remove('hidden');
                infoDiv.innerHTML = '<span class="text-destructive font-medium">Mobiliario no encontrado</span>';
                idInput.value = '';
                infoDiv.className = 'mt-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs';
                return;
            }

            resultsDiv.innerHTML = matches.map(i => `
                <div class="p-2 hover:bg-primary/5 cursor-pointer border-b border-border last:border-0" 
                     onclick="window.selectEditTransferItem(${i.id}, '${i.nombre.replace(/'/g, "\\'")}', '${i.categoria_nombre}', ${i.stock_actual})">
                    <div class="text-xs font-bold">${i.nombre}</div>
                    <div class="text-[10px] text-muted-foreground uppercase">${i.categoria_nombre} | Stock: ${i.stock_actual}</div>
                </div>
            `).join('');
            resultsDiv.classList.remove('hidden');
        });

        window.selectEditTransferItem = (id, nombre, categoria, stock) => {
            idInput.value = id;
            searchInput.value = nombre;
            resultsDiv.classList.add('hidden');
            const originalQty = parseInt(t.cantidad);
            const stockCalc = stock + (id == t.item_id ? originalQty : 0);
            infoDiv.innerHTML = `
                <div class="font-bold text-primary">${nombre}</div>
                <div class="text-muted-foreground">Categoría: ${categoria} | Stock Actual: <span class="font-bold">${stockCalc}</span></div>
                ${stockCalc <= 0 ? '<div class="text-destructive font-bold mt-1">⚠️ Sin stock disponible</div>' : '<div class="text-green-600 font-bold mt-1">✓ Disponible para traslado</div>'}
            `;
            idInput.value = stockCalc > 0 ? id : '';
            infoDiv.className = `mt-2 p-3 rounded-lg border ${stockCalc > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} text-xs`;
        };

        lucide.createIcons();
    } catch (e) {
        UI.stopLoading();
        UI.toast('Error al cargar datos del traslado', 'error');
        console.error(e);
    }
};


