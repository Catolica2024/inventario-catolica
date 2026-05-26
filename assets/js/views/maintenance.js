/**
 * maintenance.js — Gestión de Soporte y Mantenimiento
 */
(function() {
    let _maintResources = { items: [], assets: [], providers: [] };

    window.Views = window.Views || {};

    window.Views.maintenance = function(user) {
        return `
            <div class="space-y-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h2 class="text-xl md:text-2xl font-bold tracking-tight">Soporte y Mantenimiento</h2>
                        <p class="text-sm text-muted-foreground">Control de reparaciones, mantenimiento preventivo y costos asociados.</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button class="btn btn-outline text-emerald-600" onclick="exportMaintenanceExcel()"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Exportar Excel</button>
                        <button class="btn btn-primary" onclick="openNewMaintenanceModal()">
                            <i data-lucide="wrench" class="w-4 h-4"></i> Registrar Mantenimiento
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="card p-4 flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                            <i data-lucide="clock" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <div class="text-2xl font-bold" id="stat-maint-active">0</div>
                            <div class="text-xs text-muted-foreground uppercase font-bold">En Proceso</div>
                        </div>
                    </div>
                    <div class="card p-4 flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <i data-lucide="check-circle" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <div class="text-2xl font-bold" id="stat-maint-completed">0</div>
                            <div class="text-xs text-muted-foreground uppercase font-bold">Completados (Mes)</div>
                        </div>
                    </div>
                    <div class="card p-4 flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <i data-lucide="dollar-sign" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <div class="text-2xl font-bold" id="stat-maint-cost">S/ 0.00</div>
                            <div class="text-xs text-muted-foreground uppercase font-bold">Inversión Total</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="p-4 border-b border-border bg-muted/20">
                        <h3 class="font-bold text-sm uppercase">Historial de Mantenimientos</h3>
                    </div>
                    <div class="table-container">
                        <table class="w-full text-left">
                            <thead class="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground">
                                <tr>
                                    <th class="px-4 py-3">Artículo / Activo</th>
                                    <th class="px-4 py-3">Tipo</th>
                                    <th class="px-4 py-3">Proveedor</th>
                                    <th class="px-4 py-3">Fecha Inicio</th>
                                    <th class="px-4 py-3">Estado</th>
                                    <th class="px-4 py-3">Costo</th>
                                    <th class="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="maint-table-body" class="divide-y divide-border">
                                <tr><td colspan="7" class="text-center py-10 text-muted-foreground italic">Cargando mantenimientos...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    };

    window.Views.maintenance.afterMount = function() {
        loadMaintenance();
        loadMaintResources();
    };

    async function loadMaintResources() {
        try {
            const [items, assets, providers, purchases] = await Promise.all([
                fetch('api/items.php').then(r => r.json()),
                fetch('api/assets.php').then(r => r.json()),
                fetch('api/suppliers.php').then(r => r.json()),
                fetch('api/purchases.php?approved_only=1').then(r => r.json())
            ]);
            _maintResources = {
                items: items.items || [],
                assets: assets.assets || [],
                providers: providers.suppliers || [],
                purchases: (purchases.purchases || []).filter(p => p.tipo === 'servicio')
            };
            window._maintResources = _maintResources;
        } catch (e) { console.error(e); }
    }

    async function loadMaintenance() {
        const tbody = document.getElementById('maint-table-body');
        if (!tbody) return;
        try {
            const resp = await fetch('api/maintenance.php').then(r => r.json());
            const data = resp.maintenance || [];
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-muted-foreground italic">No hay registros de mantenimiento.</td></tr>';
                return;
            }

            let activeCount = 0;
            let completedCount = 0;
            let totalCost = 0;

            tbody.innerHTML = data.map(m => {
                if (m.estado === 'En Proceso' || m.estado === 'Pendiente') activeCount++;
                if (m.estado === 'Completado') completedCount++;
                totalCost += parseFloat(m.costo || 0);

                const badgeClass = m.estado === 'Completado' ? 'bg-green-100 text-green-700' : 
                                  (m.estado === 'En Proceso' ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground');

                return `
                    <tr class="hover:bg-muted/30 transition-colors">
                        <td class="px-4 py-3">
                            <div class="font-bold text-sm">${m.item_nombre}</div>
                            ${m.activo_codigo ? `<div class="text-[10px] text-primary font-mono uppercase">Cod: ${m.activo_codigo}</div>` : `<div class="text-[10px] text-muted-foreground italic">Lote: ${m.cantidad} unid.</div>`}
                        </td>
                        <td class="px-4 py-3 text-xs font-medium">${m.tipo}</td>
                        <td class="px-4 py-3 text-xs text-muted-foreground">${m.proveedor_nombre || 'Interno'}</td>
                        <td class="px-4 py-3 text-xs">${m.fecha_inicio}</td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badgeClass}">${m.estado}</span>
                        </td>
                        <td class="px-4 py-3 font-bold text-sm">S/ ${parseFloat(m.costo).toFixed(2)}</td>
                        <td class="px-4 py-3 text-right whitespace-nowrap">
                            <button class="btn btn-ghost p-1.5" onclick="viewMaintDetails(${m.id})" title="Ver detalles"><i data-lucide="info" class="w-4 h-4"></i></button>
                            ${m.estado !== 'Completado' && m.estado !== 'Cancelado' ? 
                                `<button class="btn btn-ghost p-1.5 text-green-600" onclick="openCompleteMaintModal(${m.id})" title="Finalizar"><i data-lucide="check-check" class="w-4 h-4"></i></button>` : ''
                            }
                            ${window.canDelete(window.Auth.getUser()) ? 
                                `<button class="btn btn-ghost p-1.5 text-destructive" onclick="deleteMaintenanceRecord(${m.id})" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : 
                                ''
                            }
                        </td>
                    </tr>
                `;
            }).join('');

            document.getElementById('stat-maint-active').textContent = activeCount;
            document.getElementById('stat-maint-completed').textContent = completedCount;
            document.getElementById('stat-maint-cost').textContent = `S/ ${totalCost.toLocaleString()}`;

            lucide.createIcons();
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-destructive italic">Error al cargar datos.</td></tr>';
        }
    }

    window.openNewMaintenanceModal = function() {
        UI.modal({
            title: 'Registrar Mantenimiento / Reparación',
            size: 'lg',
            body: `
                <div class="space-y-4 pt-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase">¿Qué se va a reparar?</label>
                            <select id="m-target-type" class="select w-full" onchange="toggleMaintTargetFields()">
                                <option value="equipo">Equipo (Unidad específica)</option>
                                <option value="mobiliario">Mobiliario (Por lotes)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase">Tipo de Servicio</label>
                            <select id="m-type" class="select w-full">
                                <option value="Correctivo">Correctivo (Falla/Rotura)</option>
                                <option value="Preventivo">Preventivo (Mantenimiento)</option>
                            </select>
                        </div>
                    </div>

                    <div id="m-field-equipo">
                        <label class="text-xs font-bold mb-1 block uppercase text-primary">Buscar o Escanear Equipo <span class="text-destructive">*</span></label>
                        <div class="relative group">
                            <input type="text" id="m-search-asset" class="input w-full pr-20" placeholder="Ingrese Código, Serie o Nombre...">
                            <div class="absolute right-1 top-1 flex gap-1">
                                <button class="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" 
                                        onclick="UI.openScanner((val, showError) => { 
                                            const asset = window._maintResources.assets.find(a => (a.codigo_patrimonial && a.codigo_patrimonial.toLowerCase() === val.toLowerCase()) || (a.numero_serie && a.numero_serie.toLowerCase() === val.toLowerCase()) || (a.codigo_interno && a.codigo_interno.toLowerCase() === val.toLowerCase()));
                                            if (!asset) {
                                                const item = window._maintResources.items.find(i => i.codigo && i.codigo.toLowerCase() === val.toLowerCase());
                                                if (item) showError('⚠️ Error: El código ' + val + ' es un ' + item.categoria_tipo.toUpperCase() + ' y no un EQUIPO específico.');
                                                else showError('⚠️ Código ' + val + ' no reconocido como Equipo.');
                                                return false;
                                            }
                                            selectMaintAsset(asset.id, asset.numero_serie || asset.codigo_patrimonial || asset.codigo_interno, asset.item_id);
                                            return true;
                                        })" title="Escanear QR">
                                    <i data-lucide="camera" class="w-4 h-4"></i>
                                </button>
                                <div class="p-1.5 text-muted-foreground">
                                    <i data-lucide="search" class="w-4 h-4"></i>
                                </div>
                            </div>
                        </div>
                        <div id="m-search-results" class="mt-1 max-h-40 overflow-y-auto bg-white border border-border rounded-lg hidden z-50 relative"></div>
                        <input type="hidden" id="m-activo-id">
                        <input type="hidden" id="m-item-id">
                    </div>

                    <div id="m-field-mobiliario" class="hidden">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div class="md:col-span-2">
                                <label class="text-xs font-bold mb-1 block uppercase text-primary">Buscar o Escanear Mobiliario <span class="text-destructive">*</span></label>
                                <div class="relative group">
                                    <input type="text" id="m-search-item" class="input w-full pr-20" placeholder="Ingrese Código o Nombre...">
                                    <div class="absolute right-1 top-1 flex gap-1">
                                        <button class="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm" 
                                                onclick="UI.openScanner((val, showError) => { 
                                                    const found = window._maintResources.items.find(i => i.categoria_tipo === 'mobiliario' && i.codigo && i.codigo.toLowerCase() === val.toLowerCase());
                                                    if (!found) {
                                                        const asset = window._maintResources.assets.find(a => (a.codigo_patrimonial && a.codigo_patrimonial.toLowerCase() === val.toLowerCase()) || (a.numero_serie && a.numero_serie.toLowerCase() === val.toLowerCase()));
                                                        if (asset) showError('⚠️ Error: El código ' + val + ' es un EQUIPO individual, no MOBILIARIO por lote.');
                                                        else showError('⚠️ Código ' + val + ' no reconocido como Mobiliario.');
                                                        return false;
                                                    }
                                                    selectMaintItem(found.id, found.nombre, found.stock_actual);
                                                    return true;
                                                })" title="Escanear QR">
                                            <i data-lucide="camera" class="w-4 h-4"></i>
                                        </button>
                                        <div class="p-1.5 text-muted-foreground">
                                            <i data-lucide="search" class="w-4 h-4"></i>
                                        </div>
                                    </div>
                                </div>
                                <div id="m-item-results" class="mt-1 max-h-40 overflow-y-auto bg-white border border-border rounded-lg hidden z-50 relative shadow-lg"></div>
                                <input type="hidden" id="m-select-item">
                                <div id="m-item-info" class="mt-1 text-[10px] italic text-muted-foreground"></div>
                            </div>
                            <div>
                                <label class="text-xs font-bold mb-1 block uppercase">Cantidad <span class="text-destructive">*</span></label>
                                <input type="number" id="m-qty" class="input w-full" value="1" min="1">
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase">Proveedor / Técnico</label>
                            <select id="m-provider" class="select w-full">
                                <option value="">Técnico Interno / Personal</option>
                                ${_maintResources.providers.map(p => `<option value="${p.id}">${p.razon_social}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold mb-1 block uppercase">Fecha de Inicio <span class="text-destructive">*</span></label>
                            <input type="date" id="m-date" class="input w-full" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>

                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Descripción del Problema <span class="text-destructive">*</span></label>
                        <textarea id="m-issue" class="input w-full h-20 py-2" placeholder="Describa el fallo o motivo del servicio..."></textarea>
                    </div>

                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase text-muted-foreground italic">Presupuesto Estimado (Opcional)</label>
                        <input type="number" id="m-cost" class="input w-full" value="0" step="0.01">
                    </div>

                    <div class="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <label class="text-xs font-bold mb-1 block uppercase text-blue-700">Vincular a Orden de Servicio (OS)</label>
                        <select id="m-os-id" class="select w-full bg-white">
                            <option value="">-- No vincular a OS --</option>
                            ${_maintResources.purchases.map(p => `<option value="${p.id}">${p.numero_oc} - ${p.proveedor_nombre}</option>`).join('')}
                        </select>
                        <p class="text-[9px] text-blue-600 mt-1 italic font-medium">Si vinculas a una OS, el equipo se pondrá disponible automáticamente al firmar la conformidad.</p>
                    </div>
                </div>
            `,
            confirmText: 'Registrar Inicio',
            onConfirm: async () => {
                const targetType = document.getElementById('m-target-type').value;
                const data = {
                    activo_id: (targetType === 'equipo' && document.getElementById('m-activo-id').value) ? document.getElementById('m-activo-id').value : null,
                    item_id: targetType === 'equipo' ? document.getElementById('m-item-id').value : document.getElementById('m-select-item').value,
                    cantidad: targetType === 'equipo' ? 1 : document.getElementById('m-qty').value,
                    tipo: document.getElementById('m-type').value,
                    proveedor_id: document.getElementById('m-provider').value || null,
                    fecha_inicio: document.getElementById('m-date').value,
                    descripcion_problema: document.getElementById('m-issue').value,
                    costo: document.getElementById('m-cost').value || 0,
                    orden_compra_id: document.getElementById('m-os-id').value || null,
                    estado: 'En Proceso'
                };

                if (!data.item_id || !data.fecha_inicio || !data.descripcion_problema) {
                    UI.toast('Complete los campos obligatorios', 'error'); return false;
                }

                UI.loading('Registrando mantenimiento...');
                const r = await fetch('api/maintenance.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
                UI.stopLoading();
                if (r.ok) { UI.toast('Mantenimiento registrado con éxito', 'success'); loadMaintenance(); }
                else UI.toast(r.error, 'error');
            }
        });

        lucide.createIcons();
        initMaintAssetSearch();
    };

    window.toggleMaintTargetFields = function() {
        const type = document.getElementById('m-target-type').value;
        document.getElementById('m-field-equipo').classList.toggle('hidden', type !== 'equipo');
        document.getElementById('m-field-mobiliario').classList.toggle('hidden', type !== 'mobiliario');
    };

    function initMaintAssetSearch() {
        const inputAsset = document.getElementById('m-search-asset');
        const resultsAsset = document.getElementById('m-search-results');
        
        if (inputAsset) {
            inputAsset.oninput = () => {
                const val = inputAsset.value.trim().toLowerCase();
                if (val.length < 2) { resultsAsset.classList.add('hidden'); return; }

                const filtered = _maintResources.assets.filter(a => 
                    (a.numero_serie && a.numero_serie.toLowerCase().includes(val)) || 
                    (a.codigo_patrimonial && a.codigo_patrimonial.toLowerCase().includes(val)) ||
                    (a.item_nombre && a.item_nombre.toLowerCase().includes(val))
                ).slice(0, 5);

                if (filtered.length === 0) { resultsAsset.classList.add('hidden'); return; }

                resultsAsset.innerHTML = filtered.map(a => `
                    <div class="p-2 hover:bg-primary/5 cursor-pointer border-b border-border last:border-0" 
                         onclick="selectMaintAsset(${a.id}, '${a.numero_serie || a.codigo_patrimonial || a.codigo_interno}', ${a.item_id})">
                        <div class="text-xs font-bold">${a.item_nombre}</div>
                        <div class="text-[10px] text-muted-foreground font-mono">S/N: ${a.numero_serie || '—'} | Cód: ${a.codigo_patrimonial || '—'}</div>
                    </div>
                `).join('');
                resultsAsset.classList.remove('hidden');
            };
        }

        const inputItem = document.getElementById('m-search-item');
        const resultsItem = document.getElementById('m-item-results');
        if (inputItem) {
            inputItem.oninput = () => {
                const val = inputItem.value.trim().toLowerCase();
                if (val.length < 2) { resultsItem.classList.add('hidden'); return; }

                const filtered = _maintResources.items.filter(i => 
                    i.categoria_tipo === 'mobiliario' && (
                        (i.codigo && i.codigo.toLowerCase().includes(val)) || 
                        (i.nombre && i.nombre.toLowerCase().includes(val))
                    )
                ).slice(0, 5);

                if (filtered.length === 0) { resultsItem.classList.add('hidden'); return; }

                resultsItem.innerHTML = filtered.map(i => `
                    <div class="p-2 hover:bg-primary/5 cursor-pointer border-b border-border last:border-0" 
                         onclick="window.selectMaintItem(${i.id}, '${i.nombre.replace(/'/g, "\\'")}', ${i.stock_actual})">
                        <div class="text-xs font-bold">${i.nombre}</div>
                        <div class="text-[10px] text-muted-foreground uppercase">Stock: ${i.stock_actual}</div>
                    </div>
                `).join('');
                resultsItem.classList.remove('hidden');
            };
        }
    }

    window.selectMaintAsset = function(id, label, itemId) {
        document.getElementById('m-activo-id').value = id;
        document.getElementById('m-item-id').value = itemId;
        document.getElementById('m-search-asset').value = label;
        document.getElementById('m-search-results').classList.add('hidden');
        UI.toast('Equipo seleccionado', 'info');
    };

    window.selectMaintItem = function(id, nombre, stock) {
        document.getElementById('m-select-item').value = id;
        document.getElementById('m-search-item').value = nombre;
        document.getElementById('m-item-results').classList.add('hidden');
        document.getElementById('m-item-info').innerHTML = `✓ Mobiliario seleccionado (Stock: ${stock})`;
        UI.toast('Mobiliario seleccionado', 'info');
    };

    window.openCompleteMaintModal = function(id) {
        UI.modal({
            title: 'Finalizar Mantenimiento',
            body: `
                <div class="space-y-4 pt-2">
                    <p class="text-sm text-muted-foreground">Registre la solución y el costo final del servicio.</p>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Fecha de Finalización <span class="text-destructive">*</span></label>
                        <input type="date" id="m-end-date" class="input w-full" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Costo Final (S/) <span class="text-destructive">*</span></label>
                        <input type="number" id="m-final-cost" class="input w-full" step="0.01">
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase">Solución Realizada <span class="text-destructive">*</span></label>
                        <textarea id="m-solution" class="input w-full h-24 py-2" placeholder="Detalle qué se hizo para resolver el problema..."></textarea>
                    </div>
                    <div>
                        <label class="text-xs font-bold mb-1 block uppercase font-bold text-green-600">Estado Final</label>
                        <select id="m-final-state" class="select w-full">
                            <option value="Completado">Reparado / Operativo</option>
                            <option value="Cancelado">No se pudo reparar / Descartado</option>
                        </select>
                    </div>
                </div>
            `,
            confirmText: 'Cerrar Mantenimiento',
            onConfirm: async () => {
                const data = {
                    id: id,
                    fecha_fin: document.getElementById('m-end-date').value,
                    costo: document.getElementById('m-final-cost').value,
                    descripcion_solucion: document.getElementById('m-solution').value,
                    estado: document.getElementById('m-final-state').value
                };

                if (!data.fecha_fin || !data.descripcion_solucion) {
                    UI.toast('Complete la descripción de la solución', 'error'); return;
                }

                UI.loading('Actualizando registro...');
                const r = await fetch('api/maintenance.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(x => x.json());
                UI.stopLoading();
                if (r.ok) { UI.toast('Mantenimiento finalizado con éxito', 'success'); loadMaintenance(); }
                else UI.toast(r.error, 'error');
            }
        });
    };

    window.viewMaintDetails = async function(id) {
        UI.loading('Cargando...');
        try {
            const resp = await fetch('api/maintenance.php').then(r => r.json());
            const m = (resp.maintenance || []).find(x => x.id == id);
            if (!m) return;

            UI.modal({
                title: 'Detalles del Mantenimiento',
                body: `
                    <div class="space-y-4 pt-2">
                        <div class="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <div class="text-muted-foreground uppercase font-bold text-[9px]">Artículo</div>
                                <div class="font-bold text-sm text-primary">${m.item_nombre}</div>
                            </div>
                            <div>
                                <div class="text-muted-foreground uppercase font-bold text-[9px]">Estado</div>
                                <div class="font-bold text-sm">${m.estado}</div>
                            </div>
                        </div>
                        <div class="p-3 bg-muted rounded-lg text-sm">
                            <div class="font-bold text-[10px] uppercase text-muted-foreground mb-1">Problema:</div>
                            ${m.descripcion_problema}
                        </div>
                        ${m.descripcion_solucion ? `
                            <div class="p-3 bg-green-50 border border-green-100 rounded-lg text-sm">
                                <div class="font-bold text-[10px] uppercase text-green-700 mb-1">Solución:</div>
                                ${m.descripcion_solucion}
                            </div>
                        ` : ''}
                        <div class="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <div class="text-muted-foreground uppercase font-bold text-[9px]">Proveedor</div>
                                <div class="font-medium">${m.proveedor_nombre || 'Interno'}</div>
                            </div>
                            <div>
                                <div class="text-muted-foreground uppercase font-bold text-[9px]">Costo Total</div>
                                <div class="font-bold text-sm text-blue-600">S/ ${parseFloat(m.costo).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                `,
                footer: `<button class="btn btn-outline" onclick="UI.closeModal()">Cerrar</button>`
            });
        } finally { UI.stopLoading(); }
    };

    window.deleteMaintenanceRecord = function(id) {
        if (!window.canDelete(window.Auth.getUser())) {
            UI.toast('Solo el Administrador puede eliminar registros de mantenimiento', 'error');
            return;
        }
        UI.confirm('¿Está seguro de eliminar este registro de mantenimiento? Esta acción no se puede deshacer.', async () => {
            UI.loading('Eliminando...');
            try {
                const r = await fetch(`api/maintenance.php?id=${id}`, { method: 'DELETE' }).then(x => x.json());
                if (r.ok) { UI.toast('Registro eliminado', 'success'); loadMaintenance(); }
                else UI.toast(r.error, 'error');
            } catch(e) { UI.toast('Error al eliminar', 'error'); }
            finally { UI.stopLoading(); }
        });
    };

    window.exportMaintenanceExcel = async function() {
        UI.loading('Preparando datos...');
        try {
            const resp = await fetch('api/maintenance.php').then(r => r.json());
            const data = (resp.maintenance || []).map(m => ({
                'Artículo': m.item_nombre,
                'Activo': m.activo_codigo || 'Lote',
                'Tipo': m.tipo,
                'Proveedor': m.proveedor_nombre || 'Interno',
                'Fecha Inicio': m.fecha_inicio,
                'Fecha Fin': m.fecha_fin || '—',
                'Estado': m.estado,
                'Costo': parseFloat(m.costo).toFixed(2),
                'Problema': m.descripcion_problema,
                'Solución': m.descripcion_solucion || ''
            }));
            UI.exportToExcel(data, 'Historial_Mantenimiento.xlsx');
        } catch(e) { UI.toast('Error al exportar', 'error'); }
        finally { UI.stopLoading(); }
    };

})();
