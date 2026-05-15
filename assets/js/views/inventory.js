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
    } catch (e) { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-20 text-destructive font-bold">Error al sincronizar con el servidor.</td></tr>'; }
}

function renderFilterControls() {
    const container = document.getElementById('inventory-filters');
    if (!container) return;
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="lg:col-span-1">
                <label class="text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 block">Buscar / Escanear</label>
                <div class="relative group">
                    <input id="f-search" type="text" placeholder="Código o Serie..." class="input w-full pr-12" oninput="applyAdvancedFilters()">
                    <button class="absolute right-1 top-1 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" onclick="openInventoryScanner()" title="Escanear Código QR">
                        <i data-lucide="maximize" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div>
                <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Sede Institucional</label>
                <select id="f-sede" class="select w-full" onchange="applyAdvancedFilters()">
                    <option value="">Todas las sedes</option>
                    ${_filterSedes.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Categoría</label>
                <select id="f-cat" class="select w-full" onchange="applyAdvancedFilters()">
                    <option value="">Todas las categorías</option>
                    ${_filterCats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Ubicación / Aula</label>
                <select id="f-loc" class="select w-full" onchange="applyAdvancedFilters()">
                    <option value="">Todas las ubicaciones</option>
                    ${_filterLocs.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Estado / Tipo</label>
                <select id="f-status" class="select w-full" onchange="applyAdvancedFilters()">
                    <option value="">Filtrar por estado...</option>
                    <optgroup label="Tipo de Bien">
                        <option value="T:equipo">Equipos (Individuales)</option>
                        <option value="T:mobiliario">Mobiliario (Lotes)</option>
                        <option value="T:insumo">Insumos (Consumibles)</option>
                    </optgroup>
                    <optgroup label="Estado Operativo">
                        <option value="E:Operativo">Operativos</option>
                        <option value="E:Mantenimiento">Mantenimiento</option>
                        <option value="E:Reparación">En Reparación</option>
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-24 text-muted-foreground font-medium italic">No se han encontrado registros que coincidan con los criterios.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(d => {
        const isUnit = d._type === 'unit';
        return `
            <tr class="hover:bg-primary/5 transition-all group">
                <td class="font-mono text-[11px] font-black text-primary tracking-tighter">${isUnit ? (d.codigo_patrimonial || '—') : (d.codigo || '—')}</td>
                <td>
                    <div class="font-bold text-slate-800">${isUnit ? d.item_nombre : d.nombre}</div>
                    <div class="text-[9px] font-black text-muted-foreground uppercase tracking-wider mt-0.5">${isUnit ? (d.numero_serie ? 'S/N: '+d.numero_serie : 'SIN SERIE') : (d.marca || 'GENÉRICO')}</div>
                </td>
                <td><span class="badge ${getCategoryTypeBadge(isUnit ? 'equipo' : d.categoria_tipo)}">${isUnit ? 'EQUIPO' : (d.categoria_nombre || '—')}</span></td>
                <td>
                    <div class="text-xs font-black text-slate-700 uppercase tracking-tighter">
                        ${isUnit ? (d.ubicacion_nombre || '—') : (d.num_ubicaciones > 1 ? 'Múltiples' : (d.ubicacion_nombre || '—'))}
                    </div>
                    <div class="text-[9px] font-bold text-muted-foreground uppercase">${d.sede_nombre || 'Sede Central'}</div>
                </td>
                <td class="text-center">
                    ${isUnit ? 
                        `<span class="badge ${getStatusBadge(d.estado)}">${d.estado}</span>` : 
                        `<div class="flex flex-col items-center">
                            <div class="flex items-center gap-1.5">
                                <span class="font-black text-lg ${d.stock_actual <= 0 ? 'text-destructive' : d.stock_actual <= (d.categoria_stock_minimo || d.stock_minimo) ? 'text-amber-500' : 'text-emerald-600'}">${d.stock_actual}</span>
                                <span class="text-[9px] font-black text-muted-foreground uppercase tracking-widest">disp.</span>
                            </div>
                            <div class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">de ${d.stock_total || d.stock_actual} total</div>
                        </div>`
                    }
                </td>
                <td>
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">${(d.responsable_nombre||'—').charAt(0)}</div>
                        <div class="text-[11px] font-bold text-slate-600 italic">${d.responsable_nombre || 'Sin asignar'}</div>
                    </div>
                </td>
                <td class="text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="btn btn-ghost p-2 rounded-xl" onclick="UI.showQR('${isUnit ? (d.codigo_patrimonial || '—') : (d.codigo || '—')}', '${isUnit ? 'EQUIPO' : (d.categoria_nombre || '—')}')" title="Ver QR"><i data-lucide="qr-code" class="w-4 h-4"></i></button>
                        <button class="btn btn-ghost p-2 rounded-xl" onclick="${isUnit ? `viewAssetDetails(${d.id})` : `viewCatalogItem(${d.id})`}" title="Ver detalle"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        ${isUnit ? 
                            `<button class="btn btn-ghost p-2 rounded-xl text-primary" onclick="loadTraceResources().then(() => openAssignmentModal(${d.id}))" title="Asignar"><i data-lucide="user-plus" class="w-4 h-4"></i></button>` : 
                            (d.categoria_tipo === 'mobiliario' ? 
                                `<button class="btn btn-ghost p-2 rounded-xl text-amber-600" onclick="loadTraceResources().then(() => openTransferModal(${d.id}))" title="Trasladar"><i data-lucide="move" class="w-4 h-4"></i></button>` :
                                `<button class="btn btn-ghost p-2 rounded-xl text-emerald-600" onclick="loadTraceResources().then(() => openDispatchModal(${d.id}))" title="Despachar"><i data-lucide="send" class="w-4 h-4"></i></button>`
                            )
                        }
                        ${window.canDelete(window.Auth.getUser()) ? 
                            `<button class="btn btn-ghost p-2 rounded-xl text-destructive" onclick="deleteInventoryItem('${d._type}', ${d.id}, '${(isUnit ? d.item_nombre : d.nombre || '').replace(/'/g, '\\&apos;')}')" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : 
                            ''
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function getCategoryTypeBadge(type) {
    if (type === 'equipo') return 'badge-blue';
    if (type === 'mobiliario') return 'badge-cyan';
    if (type === 'insumo') return 'badge-green';
    return 'badge-gray';
}

function getStatusBadge(status) {
    const map = { 'Operativo': 'badge-green', 'Mantenimiento': 'badge-yellow', 'Baja': 'badge-red', 'Reparación': 'badge-amber' };
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
        ${UI.pageHeader('Inventario General','Control centralizado de activos e insumos institucionales', `
            <button class="btn btn-outline shadow-sm btn-sm-auto" onclick="loadInventory()"><i data-lucide="refresh-cw" class="w-4 h-4 mr-2"></i>Sincronizar</button>
            <button class="btn btn-outline shadow-sm btn-sm-auto text-emerald-600" onclick="exportInventory()"><i data-lucide="file-spreadsheet" class="w-4 h-4 mr-2"></i>Exportar Excel</button>
            <button class="btn btn-primary shadow-lg btn-sm-auto" onclick="Router.go('registration')"><i data-lucide="plus" class="w-4 h-4 mr-2"></i>Nuevo Bien</button>
        `)}

        <!-- PANEL DE FILTROS -->
        <div class="card p-6 mb-8 bg-white shadow-xl shadow-slate-200/50 border-primary/5">
            <div id="inventory-filters">
                <div class="h-12 flex items-center justify-center text-muted-foreground text-xs font-bold uppercase tracking-widest italic animate-pulse">Preparando filtros inteligentes...</div>
            </div>
        </div>

        <div class="card shadow-2xl shadow-slate-200/40">
            <div class="table-container">
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
                        <tr><td colspan="7" class="text-center py-32 text-muted-foreground animate-pulse font-medium uppercase tracking-widest text-xs">Cargando base de datos maestra...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.Views.inventory.afterMount = function() {
    loadInventory();
    lucide.createIcons();
};

window.deleteInventoryItem = function(type, id, nombre) {
    if (!window.canDelete(window.Auth.getUser())) {
        UI.toast('Solo el Administrador puede eliminar registros', 'error');
        return;
    }
    const isUnit = type === 'unit';
    const msg = isUnit
        ? `¿Seguro que desea eliminar el equipo <strong>${nombre}</strong>?`
        : `¿Seguro que desea eliminar <strong>${nombre}</strong> y todo su historial de stock?`;

    UI.modal({
        title: 'Confirmar Baja Permanente',
        body: `<div class="space-y-4">
            <div class="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 flex items-center gap-4 text-destructive">
                <i data-lucide="alert-octagon" class="w-8 h-8"></i>
                <div class="text-xs font-black uppercase tracking-tight">${msg}</div>
            </div>
            <p class="text-sm text-slate-500 px-2 font-medium">Esta acción no se puede deshacer y el registro será removido permanentemente de todos los reportes institucionales.</p>
        </div>`,
        confirmText: 'Sí, eliminar permanentemente',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            UI.loading('Procesando baja...');
            let ok = false;
            let errorMsg = '';

            if (isUnit) {
                const r = await fetch(`api/assets.php?id=${id}`, { method: 'DELETE' }).then(x => x.json()).catch(() => ({}));
                ok = r.ok;
                errorMsg = r.error || '';
            } else {
                const r = await fetch(`api/items.php?id=${id}&force=1`, { method: 'DELETE' }).then(x => x.json()).catch(() => ({}));
                ok = r.ok;
                errorMsg = r.error || '';
            }

            UI.stopLoading();
            if (ok) {
                UI.toast('Registro eliminado correctamente', 'success');
                loadInventory();
            } else {
                UI.toast('Error al procesar: ' + (errorMsg || 'Error del servidor'), 'error');
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
        return true;
    });
};

window.exportInventory = function() {
    const dataToExport = _inventoryData.map(d => {
        const isUnit = d._type === 'unit';
        return {
            'Código': isUnit ? d.codigo_patrimonial : d.codigo,
            'Descripción': isUnit ? d.item_nombre : d.nombre,
            'Tipo': isUnit ? 'EQUIPO' : d.categoria_tipo,
            'Categoría': d.categoria_nombre,
            'Ubicación': d.ubicacion_nombre,
            'Sede': d.sede_nombre,
            'Estado': d.estado || 'N/A',
            'Stock Actual': isUnit ? 1 : d.stock_actual,
            'Responsable': d.responsable_nombre || 'Sin asignar'
        };
    });
    UI.exportToExcel(dataToExport, 'Inventario_General_' + new Date().toISOString().split('T')[0] + '.xlsx');
};
