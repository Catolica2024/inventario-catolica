// assets/js/views/inventory.js — Consulta Avanzada de Inventario

let _inventoryData = [];
let _filterSedes = [];
let _filterCats = [];
let _filterLocs = [];

async function loadInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    try {
        const [assetsResp, itemsResp, sedesResp, catsResp, locsResp] = await Promise.all([
            fetch('api/assets.php').then(r => r.json()),
            fetch('api/items.php').then(r => r.json()),
            fetch('api/sedes.php').then(r => r.json()),
            fetch('api/categories_inventario.php').then(r => r.json()),
            fetch('api/locations.php').then(r => r.json())
        ]);

        _inventoryData = [
            ...(assetsResp.assets || []).map(a => ({ ...a, _type: 'unit' })),
            ...(itemsResp.items || []).filter(i => {
                // Si es equipo, solo mostrar si no tiene unidades registradas (para permitir gestión/borrado)
                if (i.categoria_tipo === 'equipo') {
                    const hasUnits = (assetsResp.assets || []).some(a => a.item_id == i.id);
                    return !hasUnits;
                }
                return true;
            }).map(i => ({ ...i, _type: 'stock' }))
        ];

        _filterSedes = sedesResp.sedes || [];
        _filterCats = catsResp.categories || [];
        _filterLocs = locsResp.locations || [];

        renderFilterControls();
        renderInventoryRows(_inventoryData);
    } catch (e) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-destructive">Error al cargar datos.</td></tr>'; }
}

function renderFilterControls() {
    const container = document.getElementById('inventory-filters');
    if (!container) return;
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div class="md:col-span-1">
                <label class="text-[10px] font-bold text-primary uppercase mb-1 block">Buscar / Escanear</label>
                <div class="relative group">
                    <input id="f-search" type="text" placeholder="Código o Serie..." class="input input-sm w-full pr-10 border-primary/20 focus:border-primary transition-all" oninput="applyAdvancedFilters()">
                    <button class="absolute right-1 top-1 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" onclick="openInventoryScanner()" title="Escanear Código QR">
                        <i data-lucide="camera" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div>
                <label class="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Sede</label>
                <select id="f-sede" class="select select-sm w-full" onchange="applyAdvancedFilters()">
                    <option value="">Todas las sedes</option>
                    ${_filterSedes.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Categoría</label>
                <select id="f-cat" class="select select-sm w-full" onchange="applyAdvancedFilters()">
                    <option value="">Todas las categorías</option>
                    ${_filterCats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Ubicación / Aula</label>
                <select id="f-loc" class="select select-sm w-full" onchange="applyAdvancedFilters()">
                    <option value="">Todas las ubicaciones</option>
                    ${_filterLocs.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Estado / Tipo</label>
                <select id="f-status" class="select select-sm w-full" onchange="applyAdvancedFilters()">
                    <option value="">Todos</option>
                    <optgroup label="Tipo de Bien">
                        <option value="T:equipo">Equipos (Unidades)</option>
                        <option value="T:mobiliario">Mobiliario</option>
                        <option value="T:insumo">Insumos</option>
                    </optgroup>
                    <optgroup label="Estado (Equipos)">
                        <option value="E:Operativo">Operativos</option>
                        <option value="E:Mantenimiento">Mantenimiento</option>
                        <option value="E:Reparación">Reparación</option>
                        <option value="E:Baja">De Baja</option>
                    </optgroup>
                </select>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function renderInventoryRows(data) {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-20 text-muted-foreground">No se encontraron bienes con los filtros aplicados.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => {
        const isUnit = d._type === 'unit';
        return `
            <tr class="hover:bg-muted/50 transition-colors">
                <td class="font-mono text-xs font-bold text-primary">${isUnit ? (d.codigo_patrimonial || '—') : (d.codigo || '—')}</td>
                <td>
                    <div class="font-medium text-sm">${isUnit ? d.item_nombre : d.nombre}</div>
                    <div class="text-[10px] text-muted-foreground uppercase">${isUnit ? (d.numero_serie ? 'S/N: '+d.numero_serie : '') : (d.marca || '')}</div>
                </td>
                <td><span class="badge ${getCategoryTypeBadge(isUnit ? 'equipo' : d.categoria_tipo)}">${isUnit ? 'EQUIPO' : (d.categoria_nombre || '—')}</span></td>
                <td class="text-xs">
                    <div class="font-semibold uppercase">
                        ${isUnit 
                            ? (d.ubicacion_nombre || '—') 
                            : (d.num_ubicaciones > 1 ? 'Varios' : (d.ubicacion_nombre || '—'))
                        }
                    </div>
                    <div class="text-[10px] text-muted-foreground">${d.sede_nombre || '—'}</div>
                </td>
                <td class="text-center">
                    ${isUnit ? 
                        `<span class="badge ${getStatusBadge(d.estado)}">${d.estado}${d.responsable_nombre ? ' <span class="text-[9px] opacity-80">(Asignado)</span>' : ''}</span>` : 
                        `<div class="flex flex-col items-center gap-0.5">
                            <div class="flex items-center gap-1">
                                <span class="font-bold text-sm ${d.stock_actual <= 0 ? 'text-destructive' : d.stock_actual <= (d.categoria_stock_minimo || d.stock_minimo) ? 'text-orange-500' : 'text-green-600'}">${d.stock_actual}</span>
                                <span class="text-[10px] text-muted-foreground">disp.</span>
                            </div>
                            <div class="text-[10px] text-muted-foreground">de ${d.stock_total || d.stock_actual} total</div>
                        </div>`
                    }
                </td>
                <td class="text-xs text-muted-foreground font-medium italic">${d.responsable_nombre || '—'}</td>
                <td class="text-right whitespace-nowrap">
                    <button class="btn btn-ghost p-1.5" onclick="UI.showQR('${isUnit ? (d.codigo_patrimonial || '—') : (d.codigo || '—')}', '${isUnit ? 'EQUIPO' : (d.categoria_nombre || '—')}')" title="Ver QR"><i data-lucide="qr-code" class="w-4 h-4"></i></button>
                    <button class="btn btn-ghost p-1.5" onclick="${isUnit ? `viewAssetDetails(${d.id})` : `viewCatalogItem(${d.id})`}" title="Ver detalle"><i data-lucide="eye" class="w-4 h-4"></i></button>
                    ${isUnit ? 
                        `<button class="btn btn-ghost p-1.5 text-blue-600" onclick="loadTraceResources().then(() => openAssignmentModal(${d.id}))" title="Asignar a personal"><i data-lucide="user-plus" class="w-4 h-4"></i></button>` : 
                        (d.categoria_tipo === 'mobiliario' ? 
                            `<button class="btn btn-ghost p-1.5 text-orange-600" onclick="loadTraceResources().then(() => openTransferModal(${d.id}))" title="Trasladar"><i data-lucide="move" class="w-4 h-4"></i></button>` :
                            `<button class="btn btn-ghost p-1.5 text-green-600" onclick="loadTraceResources().then(() => openDispatchModal(${d.id}))" title="Despachar"><i data-lucide="send" class="w-4 h-4"></i></button>`
                        )
                    }
                    <button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteInventoryItem('${d._type}', ${d.id}, '${(isUnit ? d.item_nombre : d.nombre || '').replace(/'/g, '\\&apos;')}')" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function getCategoryTypeBadge(type) {
    if (type === 'equipo') return 'badge-blue';
    if (type === 'mobiliario') return 'badge-orange';
    if (type === 'insumo') return 'badge-green';
    return 'badge-gray';
}

function getStatusBadge(status) {
    const map = { 'Operativo': 'badge-green', 'Mantenimiento': 'badge-yellow', 'Baja': 'badge-red', 'Reparación': 'badge-orange' };
    return map[status] || 'badge-gray';
}

window.applyAdvancedFilters = function() {
    const search = document.getElementById('f-search').value.toLowerCase();
    const sede = document.getElementById('f-sede').value;
    const cat = document.getElementById('f-cat').value;
    const loc = document.getElementById('f-loc').value;
    const statusVal = document.getElementById('f-status').value;

    const filtered = _inventoryData.filter(d => {
        const matchSearch = !search || 
            (d.item_nombre || d.nombre || '').toLowerCase().includes(search) || 
            (d.numero_serie || '').toLowerCase().includes(search) || 
            (d.codigo_patrimonial || d.codigo || '').toLowerCase().includes(search);
        const matchSede = !sede || d.sede_id == sede;
        const matchCat = !cat || (d.categoria_inventario_id == cat || d.categoria_id == cat);
        const matchLoc = !loc || d.ubicacion_id == loc;
        
        let matchStatus = true;
        if (statusVal) {
            if (statusVal.startsWith('T:')) {
                const type = statusVal.split(':')[1];
                matchStatus = d.categoria_tipo === type || (d._type === 'unit' && type === 'equipo');
            } else if (statusVal.startsWith('E:')) {
                const status = statusVal.split(':')[1];
                matchStatus = d.estado === status;
            }
        }

        return matchSearch && matchSede && matchCat && matchLoc && matchStatus;
    });

    renderInventoryRows(filtered);
};

window.Views.inventory = function() {
    return `
        ${UI.pageHeader('Inventario General','Consulta avanzada y estado global de bienes', `
            <button class="btn btn-outline" onclick="loadInventory()"><i data-lucide="refresh-cw"></i></button>
        `)}

        <!-- PANEL DE FILTROS -->
        <div class="card p-4 mb-6 bg-muted/20 border-primary/10">
            <div id="inventory-filters">
                <div class="h-10 flex items-center justify-center text-muted-foreground text-xs italic">Cargando filtros...</div>
            </div>
        </div>

        <div class="card overflow-hidden">
            <table class="data">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descripción del Bien</th>
                        <th>Categoría</th>
                        <th>Ubicación / Sede</th>
                        <th class="text-center">Estado / Stock</th>
                        <th>Responsable</th>
                        <th class="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody id="inventory-table-body">
                    <tr><td colspan="7" class="text-center py-20 text-muted-foreground">Cargando inventario...</td></tr>
                </tbody>
            </table>
        </div>
    `;
};

window.Views.inventory.afterMount = function() {
    loadInventory();
    lucide.createIcons();
};

window.deleteInventoryItem = function(type, id, nombre) {
    const isUnit = type === 'unit';
    const msg = isUnit
        ? `¿Eliminar el equipo <strong>${nombre}</strong>? Se quitará del inventario permanentemente.`
        : `¿Eliminar <strong>${nombre}</strong> y todo su historial de stock? Esta acción no se puede deshacer.`;

    UI.modal({
        title: 'Confirmar Eliminación',
        body: `<div class="space-y-3">
            <p class="text-sm">${msg}</p>
            <div class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                ⚠ Esta acción es permanente y no se puede revertir.
            </div>
        </div>`,
        confirmText: 'Sí, eliminar',
        onConfirm: async () => {
            UI.loading('Eliminando registro...');
            let ok = false;
            let errorMsg = '';

            if (isUnit) {
                // Eliminar activo (equipo individual)
                const r = await fetch(`api/assets.php?id=${id}`, { method: 'DELETE' }).then(x => x.json()).catch(() => ({}));
                ok = r.ok;
                errorMsg = r.error || '';
            } else {
                // Eliminar ítem de catálogo (mobiliario/insumo) con cascada
                const r = await fetch(`api/items.php?id=${id}&force=1`, { method: 'DELETE' }).then(x => x.json()).catch(() => ({}));
                ok = r.ok;
                errorMsg = r.error || '';
            }

            UI.stopLoading();
            if (ok) {
                UI.toast('Registro eliminado correctamente', 'success');
                loadInventory(); // Recargar tabla
            } else {
                UI.toast('Error al eliminar: ' + (errorMsg || 'Error del servidor'), 'error');
            }
        }
    });
};

window.openInventoryScanner = function() {
    UI.openScanner((decodedText) => {
        const searchInput = document.getElementById('f-search');
        if (searchInput) {
            searchInput.value = decodedText;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        applyAdvancedFilters();
        return true; // Cerrar el modal tras detección exitosa
    });
};
