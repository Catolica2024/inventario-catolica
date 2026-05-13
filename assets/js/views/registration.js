// assets/js/views/registration.js — Módulo Especializado de Registro (Submódulos)

let _regActiveTab = 'equipo'; // 'equipo', 'mobiliario', 'insumo'
let _regResources = { cats: [], locs: [], staff: [], items: [] };

async function loadRegResources() {
    const [catsResp, locsResp, staffResp, itemsResp] = await Promise.all([
        fetch('api/categories_inventario.php').then(r => r.json()),
        fetch('api/locations.php').then(r => r.json()),
        fetch('api/staff.php').then(r => r.json()),
        fetch('api/items.php').then(r => r.json())
    ]);
    _regResources = {
        cats: catsResp.categories || [],
        locs: locsResp.locations || [],
        staff: staffResp.staff || [],
        items: itemsResp.items || []
    };
}

window.switchRegTab = function(tab) {
    _regActiveTab = tab;
    Views.registration.render();
};

window.Views.registration = function() {
    const isEq = _regActiveTab === 'equipo';
    const isMob = _regActiveTab === 'mobiliario';
    const isIns = _regActiveTab === 'insumo';

    return `
        ${UI.pageHeader('Registrar Bien','Selecciona el tipo de bien para iniciar el alta', '')}

        <div class="max-w-5xl mx-auto">
            <!-- NAVEGACIÓN DE SUBMÓDULOS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button onclick="switchRegTab('equipo')" class="p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${_regActiveTab === 'equipo' ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-muted bg-white hover:border-primary/40'}">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center ${_regActiveTab === 'equipo' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}">
                        <i data-lucide="monitor"></i>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${_regActiveTab === 'equipo' ? 'text-primary' : ''}">ACTIVOS / EQUIPOS</div>
                        <div class="text-[10px] text-muted-foreground uppercase font-semibold">Laptops, Proyectores, PCs</div>
                    </div>
                </button>

                <button onclick="switchRegTab('mobiliario')" class="p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${_regActiveTab === 'mobiliario' ? 'border-orange-500 bg-orange-500/5 shadow-md shadow-orange-500/10' : 'border-muted bg-white hover:border-orange-500/40'}">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center ${_regActiveTab === 'mobiliario' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}">
                        <i data-lucide="armchair"></i>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${_regActiveTab === 'mobiliario' ? 'text-orange-600' : ''}">MOBILIARIO</div>
                        <div class="text-[10px] text-muted-foreground uppercase font-semibold">Sillas, Estantes, Carpetas</div>
                    </div>
                </button>

                <button onclick="switchRegTab('insumo')" class="p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${_regActiveTab === 'insumo' ? 'border-green-600 bg-green-600/5 shadow-md shadow-green-600/10' : 'border-muted bg-white hover:border-green-600/40'}">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center ${_regActiveTab === 'insumo' ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}">
                        <i data-lucide="package"></i>
                    </div>
                    <div class="text-center">
                        <div class="font-bold ${_regActiveTab === 'insumo' ? 'text-green-700' : ''}">INSUMOS</div>
                        <div class="text-[10px] text-muted-foreground uppercase font-semibold">Papelería, Limpieza, Útiles</div>
                    </div>
                </button>
            </div>

            <!-- FORMULARIO DINÁMICO -->
            <div class="card p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                <div id="reg-form-content">
                    ${isEq ? renderEquiposForm() : (isMob ? renderMobiliarioForm() : renderInsumosForm())}
                </div>
            </div>
        </div>
    `;
};

function renderEquiposForm() {
    const cats = _regResources.cats.filter(c => c.tipo === 'equipo');
    return `
        <div class="space-y-6">
            <h3 class="text-lg font-bold flex items-center gap-2 text-primary border-b pb-2">
                <i data-lucide="plus-circle"></i> Registro de Equipo Nuevo
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Tipo de Equipo / Categoría <span class="text-destructive">*</span></label>
                    <select id="reg-cat" class="select w-full h-11" onchange="updateRegCode()">
                        <option value="">Seleccione...</option>
                        ${cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Código Patrimonial</label>
                    <input id="reg-code" class="input w-full h-11 bg-muted font-mono" readonly placeholder="Generado automáticamente">
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Número de Serie</label>
                    <input id="reg-serie" class="input w-full h-11" placeholder="Ej: S/N ABC123XYZ">
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Marca / Modelo</label>
                    <input id="reg-brand" class="input w-full h-11" placeholder="Ej: Lenovo / E14 Gen 2">
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Ubicación Destino <span class="text-destructive">*</span></label>
                    <select id="reg-loc" class="select w-full h-11">
                        <option value="">Seleccione Depósito...</option>
                        ${_regResources.locs.filter(l => l.tipo === 'Depósito' && l.estado === 'activo').map(l => `<option value="${l.id}">${l.nombre} (${l.sede_nombre})</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Especificaciones Técnicas <span class="text-xs text-muted-foreground font-normal">(Opcional)</span></label>
                    <input id="reg-name" class="input w-full h-11" placeholder="Ej: Lenovo ThinkPad E14, Core i7, 16GB RAM">
                </div>
            </div>
            <div class="flex justify-end pt-4">
                <button class="btn btn-primary h-12 px-12 font-bold" onclick="saveEquipment()">
                    <i data-lucide="save" class="mr-2"></i> Registrar Activo
                </button>
            </div>
        </div>
    `;
}

function renderMobiliarioForm() {
    const cats = _regResources.cats.filter(c => c.tipo === 'mobiliario');
    return `
        <div class="space-y-6">
            <h3 class="text-lg font-bold flex items-center gap-2 text-orange-600 border-b pb-2">
                <i data-lucide="plus-circle"></i> Registro de Mobiliario / Enseres
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Categoría <span class="text-destructive">*</span></label>
                    <select id="reg-cat" class="select w-full h-11" onchange="updateRegCode()">
                        <option value="">Seleccione...</option>
                        ${cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Código de Catálogo</label>
                    <input id="reg-code" class="input w-full h-11 bg-muted font-mono" readonly placeholder="Generado automáticamente">
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Cantidad que Ingresa <span class="text-destructive">*</span></label>
                    <input id="reg-qty" type="number" class="input w-full h-11" value="1" min="1">
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Ubicación / Sede <span class="text-destructive">*</span></label>
                    <select id="reg-loc" class="select w-full h-11">
                        <option value="">Seleccione Depósito...</option>
                        ${_regResources.locs.filter(l => l.tipo === 'Depósito' && l.estado === 'activo').map(l => `<option value="${l.id}">${l.nombre} (${l.sede_nombre})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Marca / Modelo</label>
                    <input id="reg-brand" class="input w-full h-11" placeholder="Ej: Artesanal / Melamina">
                </div>
                <div class="md:col-span-2">
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Descripción del Mueble <span class="text-xs text-muted-foreground font-normal">(Opcional)</span></label>
                    <input id="reg-name" class="input w-full h-11" placeholder="Ej: Carpeta Unipersonal de madera">
                </div>
            </div>
            <div class="flex justify-end pt-4">
                <button class="btn border-orange-600 bg-orange-600 text-white hover:bg-orange-700 h-12 px-12 font-bold shadow-lg shadow-orange-600/20" onclick="saveStockItem('mobiliario')">
                    <i data-lucide="save" class="mr-2"></i> Registrar Mobiliario
                </button>
            </div>
        </div>
    `;
}

function renderInsumosForm() {
    const cats = _regResources.cats.filter(c => c.tipo === 'insumo');
    return `
        <div class="space-y-6">
            <h3 class="text-lg font-bold flex items-center gap-2 text-green-700 border-b pb-2">
                <i data-lucide="plus-circle"></i> Registro de Insumos / Consumibles
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Categoría <span class="text-destructive">*</span></label>
                    <select id="reg-cat" class="select w-full h-11" onchange="updateRegCode()">
                        <option value="">Seleccione...</option>
                        ${cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Código de Catálogo</label>
                    <input id="reg-code" class="input w-full h-11 bg-muted font-mono" readonly placeholder="Generado automáticamente">
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Cantidad / Unidades <span class="text-destructive">*</span></label>
                    <input id="reg-qty" type="number" class="input w-full h-11" value="1" min="1">
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Marca</label>
                    <input id="reg-brand" class="input w-full h-11" placeholder="Ej: Atlas / Elite">
                </div>
                <div>
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Ubicación de Almacenaje <span class="text-destructive">*</span></label>
                    <select id="reg-loc" class="select w-full h-11">
                        <option value="">Seleccione Depósito...</option>
                        ${_regResources.locs.filter(l => l.tipo === 'Depósito' && l.estado === 'activo').map(l => `<option value="${l.id}">${l.nombre} (${l.sede_nombre})</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="text-sm font-bold mb-1 block text-muted-foreground">Detalles / Especificaciones <span class="text-xs text-muted-foreground font-normal">(Opcional)</span></label>
                    <input id="reg-details" class="input w-full h-11" placeholder="Ej: Color, tamaño, peso, marca específica, etc.">
                </div>
            </div>
            <div class="flex justify-end pt-4">
                <button class="btn border-green-700 bg-green-700 text-white hover:bg-green-800 h-12 px-12 font-bold shadow-lg shadow-green-700/20" onclick="saveStockItem('insumo')">
                    <i data-lucide="save" class="mr-2"></i> Registrar Insumo
                </button>
            </div>
        </div>
    `;
}

window.Views.registration.afterMount = async function() {
    await loadRegResources();
    lucide.createIcons();
};

window.Views.registration.render = function() {
    document.getElementById('view').innerHTML = window.Views.registration();
    window.Views.registration.afterMount();
};

window.updateRegCode = async function() {
    const cat_id = document.getElementById('reg-cat').value;
    if (!cat_id) return;
    const resp = await fetch(`api/items.php?action=next_code&categoria_id=${cat_id}`).then(r => r.json());
    if (resp.next_code) document.getElementById('reg-code').value = resp.next_code;
};

window.saveEquipment = async function() {
    const cat_id = document.getElementById('reg-cat')?.value;
    const loc_id = document.getElementById('reg-loc')?.value;
    if (!cat_id || !loc_id) { UI.toast('Seleccione una Categoría y una Ubicación Destino', 'warning'); return; }

    const catObj = _regResources.cats.find(c => c.id == cat_id);
    if (!catObj) { UI.toast('Error: Categoría no encontrada. Recargue la página.', 'error'); return; }

    const specs = document.getElementById('reg-name')?.value.trim() || '';
    const finalName = specs ? `${catObj.nombre} (${specs})` : catObj.nombre;

    UI.loading('Registrando activo...');
    try {
        // 1. Crear el ítem en el catálogo
        const itmResp = await fetch('api/items.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: finalName,
                categoria_inventario_id: cat_id,
                codigo: document.getElementById('reg-code')?.value || null,
                marca: document.getElementById('reg-brand')?.value || null,
                modelo: document.getElementById('reg-brand')?.value || null
            })
        });
        const itm = await itmResp.json();
        if (!itm.ok) { UI.toast('Error al crear el ítem: ' + (itm.error || 'Error del servidor'), 'error'); return; }

        // 2. Crear la unidad física (activo)
        const assetResp = await fetch('api/assets.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: itm.id,
                numero_serie: document.getElementById('reg-serie')?.value.trim() || null,
                codigo_interno: document.getElementById('reg-code')?.value || null,
                ubicacion_id: loc_id,
                personal_id: null,
                estado: 'Operativo'
            })
        });
        const asset = await assetResp.json();

        if (asset.ok) {
            UI.toast('¡Activo registrado con éxito!', 'success');
            const code = document.getElementById('reg-code')?.value || 'N/A';
            UI.showQR(code, catObj.nombre);
            switchRegTab('equipo');
        } else {
            // ROLLBACK: eliminar el ítem recién creado para no dejar huérfanos
            await fetch(`api/items.php?id=${itm.id}&force=1`, { method: 'DELETE' });
            UI.toast('Error al registrar el activo: ' + (asset.error || 'Error del servidor'), 'error');
        }
    } catch(e) {
        console.error('saveEquipment error:', e);
        UI.toast('Error de conexión. Verifique su red.', 'error');
    } finally {
        UI.stopLoading();
    }
};

window.saveStockItem = async function(type) {
    const cat_id = document.getElementById('reg-cat').value;
    const qty = document.getElementById('reg-qty').value;
    const loc_id = document.getElementById('reg-loc').value;
    if (!cat_id || !qty || !loc_id) { UI.toast('Complete todos los campos obligatorios', 'error'); return; }

    const catName = _regResources.cats.find(c => c.id == cat_id).nombre;
    
    let finalName = '';
    if (type === 'insumo') {
        const details = document.getElementById('reg-details')?.value.trim() || '';
        finalName = details ? `${catName} (${details})` : catName;
    } else {
        // Mobiliario
        const desc = document.getElementById('reg-name')?.value.trim() || '';
        finalName = desc ? `${catName} - ${desc}` : catName;
    }

    UI.loading('Registrando stock...');
    try {
        const itm = await fetch('api/items.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                nombre: finalName, 
                categoria_inventario_id: cat_id, 
                codigo: document.getElementById('reg-code').value,
                stock_inicial: qty, 
                marca: document.getElementById('reg-brand').value 
            }) 
        }).then(r => r.json());

        if (itm.ok) {
            // Asignar a ubicación
            await fetch('api/movements.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itm.id, ubicacion_id: loc_id, cantidad: qty, tipo: 'Entrada', observacion: 'Carga inicial' })
            });
            UI.toast('Registro completado con éxito', 'success');
            UI.showQR(document.getElementById('reg-code').value, catName);
            switchRegTab(type);
        } else UI.toast('Error: ' + itm.error, 'error');
    } catch(e) { UI.toast('Error de conexión', 'error'); }
    finally { UI.stopLoading(); }
};
