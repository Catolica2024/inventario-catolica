window.Views = window.Views || {};

// ---- NUEVA ORDEN DE COMPRA ----
let _ocSuppliers = [];
let _ocAreas = [];
let _ocInventoryItems = [];
let _ocCategories = [];
let _ocItemRows = 0;
let _ocMobilityData = null;
let _ocAssets = [];

window.Views['new-purchase'] = function () {
  return `
    ${UI.pageHeader('Nueva Orden de Compra / Servicio', 'Complete el formulario para generar el documento', `
      <button class="btn btn-outline" onclick="Router.go('purchases')"><i data-lucide="arrow-left"></i>Volver</button>
    `)}
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

      <!-- Columna principal -->
      <div class="xl:col-span-2 space-y-5">

        <!-- Datos del proveedor -->
        <div class="card p-5">
          <h3 class="font-semibold mb-4 flex items-center gap-2"><i data-lucide="truck" class="w-4 h-4 text-primary"></i>Datos del Proveedor</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="text-sm font-medium">Proveedor <span class="text-destructive">*</span></label>
              <select id="oc-proveedor" class="select mt-1 w-full">
                <option value="">Seleccione un proveedor...</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium">RUC / DNI</label>
              <input id="oc-ruc" class="input mt-1 w-full bg-muted cursor-not-allowed" readonly placeholder="Auto-completa">
            </div>
            <div>
              <label class="text-sm font-medium">Teléfono</label>
              <input id="oc-telefono" class="input mt-1 w-full bg-muted cursor-not-allowed" readonly placeholder="Auto-completa">
            </div>
            <div>
              <label class="text-sm font-medium">Contacto</label>
              <input id="oc-contacto" class="input mt-1 w-full bg-muted cursor-not-allowed" readonly placeholder="Auto-completa">
            </div>
            <div>
              <label class="text-sm font-medium">Dirección</label>
              <input id="oc-direccion" class="input mt-1 w-full bg-muted cursor-not-allowed" readonly placeholder="Auto-completa">
            </div>
          </div>
        </div>

        <!-- Datos de la solicitud -->
        <div class="card p-5">
          <h3 class="font-semibold mb-4 flex items-center gap-2"><i data-lucide="file-text" class="w-4 h-4 text-primary"></i>Datos de la Solicitud</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium">Tipo de Documento <span class="text-destructive">*</span></label>
              <select id="oc-tipo" class="select mt-1 w-full" onchange="toggleOSTargetField()">
                <option value="compra">Orden de Compra (OC)</option>
                <option value="servicio">Orden de Servicio (OS)</option>
              </select>
            </div>
            <div id="os-target-container" class="hidden animate-in slide-in-from-left-2 duration-300">
                <label class="text-sm font-medium text-primary flex items-center gap-1.5">
                    <i data-lucide="wrench" class="w-3.5 h-3.5"></i> Activo / Mobiliario a Intervenir <span class="text-xs text-muted-foreground font-normal">(Opcional)</span>
                </label>
                <div class="relative group mt-1">
                    <input id="os-target-code" class="input w-full pr-10 border-primary/30 focus:border-primary" placeholder="Escanee QR o escriba código..." list="all-assets-list" oninput="onOSTargetChange()">
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 text-primary/50 group-hover:text-primary transition-colors cursor-pointer" onclick="startAssetQRScanner()">
                        <i data-lucide="qr-code" class="w-5 h-5"></i>
                    </div>
                </div>
                <p class="text-[10px] text-muted-foreground mt-1 italic">Vincule un activo para registrar su historial técnico automáticamente.</p>
            </div>
            <div>
              <label class="text-sm font-medium">Centro de costo / Área <span class="text-destructive">*</span></label>
              <select id="oc-area" class="select mt-1 w-full">
                <option value="">Seleccione área...</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium">Fecha requerida <span class="text-destructive">*</span></label>
              <input id="oc-fecha-req" type="date" class="input mt-1 w-full">
            </div>
            <div>
              <label class="text-sm font-medium">Tipo de moneda</label>
              <select id="oc-moneda" class="select mt-1 w-full">
                <option value="PEN">S/ Soles (PEN)</option>
                <option value="USD">$ Dólares (USD)</option>
                <option value="EUR">€ Euros (EUR)</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium">Condición de pago</label>
              <select id="oc-condicion" class="select mt-1 w-full" onchange="toggleCreditDetails()">
                <option value="Al contado">Al contado</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Credito">Crédito</option>
                <option value="Adelanto + Saldo">Adelanto + Saldo</option>
              </select>
            </div>
            <div id="oc-adelanto-container" class="hidden">
              <label class="text-sm font-medium">% Adelanto</label>
              <input type="number" id="oc-adelanto-porc" class="input mt-1 w-full" placeholder="50" min="1" max="99" oninput="recalcOCTotals()">
            </div>
            <div id="oc-credito-container" class="hidden grid grid-cols-2 gap-2">
              <div>
                <label class="text-sm font-medium">Tipo de Crédito</label>
                <select id="oc-credito-tipo" class="select mt-1 w-full" onchange="toggleCreditDetails()">
                  <option value="Dias">Días</option>
                  <option value="Cuotas">Cuotas</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium" id="oc-credito-label">Cantidad</label>
                <input type="number" id="oc-condicion-val" class="input mt-1 w-full" placeholder="30" oninput="recalcOCTotals()">
              </div>
            </div>
            <div>
              <label class="text-sm font-medium">Impuesto (IGV)</label>
              <select id="oc-igv-porcentaje" class="select mt-1 w-full" onchange="recalcOCTotals()">
                <option value="18">18% (General)</option>
                <option value="10">10% (Especial)</option>
                <option value="0">0% (Inafecto/Exonerado)</option>
              </select>
            </div>
            <div class="flex items-center gap-4 pt-6">
              <div class="flex items-center gap-2">
                <input type="checkbox" id="oc-precios-con-igv" class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" onchange="recalcOCTotals()">
                <label for="oc-precios-con-igv" class="text-sm font-medium cursor-pointer">Precios incluyen IGV</label>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="oc-incluye-movilidad" checked class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" onchange="toggleMobilityPrompt()">
                <label for="oc-incluye-movilidad" class="text-sm font-medium cursor-pointer">Incluye movilidad</label>
              </div>
            </div>
            <div class="md:col-span-2">
              <label class="text-sm font-medium">Observaciones / Sustento <span class="text-xs text-muted-foreground">(opcional)</span></label>
              <textarea id="oc-observaciones" class="input mt-1 w-full h-20 resize-none" placeholder="Escriba aquí el sustento o notas adicionales para la compra..."></textarea>
            </div>
          </div>
        </div>

        <!-- Ítems de la OC -->
        <div class="card">
          <div class="p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold flex items-center gap-2"><i data-lucide="list" class="w-4 h-4 text-primary"></i>Detalle de la compra</h3>
              <button class="btn btn-outline btn-sm" onclick="addOCItem()"><i data-lucide="plus" class="w-4 h-4"></i>Agregar ítem</button>
            </div>
            <div class="table-container">
              <table class="data w-full text-sm" id="oc-items-table">
                <thead>
                  <tr>
                    <th class="w-8">#</th>
                    <th class="w-48">Categoría</th>
                    <th class="w-20">Prefijo</th>
                    <th>Descripción / Detalle</th>
                    <th class="w-28">Unidad</th>
                    <th class="w-24">Cantidad</th>
                    <th class="w-32">Precio Unit.</th>
                    <th class="w-32 text-right">Total</th>
                    <th class="w-10"></th>
                  </tr>
                </thead>
                <tbody id="oc-items-body">
                  <tr id="oc-empty-row"><td colspan="8" class="text-center py-6 text-muted-foreground">Agrega al menos un ítem para continuar.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel derecho: resumen y acciones -->
      <div class="space-y-5">
        <div class="card p-5 sticky top-24">
          <h3 class="font-semibold mb-4">Resumen</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-muted-foreground">Subtotal</span><span id="oc-subtotal" class="font-medium">0.00</span></div>
            <div class="flex justify-between"><span class="text-muted-foreground" id="oc-igv-label">IGV (18%)</span><span id="oc-igv" class="font-medium">0.00</span></div>
             <div class="flex justify-between border-t border-border pt-2 mt-2"><span class="font-bold">Total OC</span><span id="oc-total" class="font-bold">0.00</span></div>
             <div id="oc-mob-row" class="hidden flex justify-between text-orange-600 font-medium"><span>Movilidad (Sep.)</span><span id="oc-mob-monto-display">0.00</span></div>
             <div class="flex justify-between border-t-2 border-primary/20 pt-2 mt-2"><span class="font-bold text-lg">Total General</span><span id="oc-total-general" class="font-bold text-lg text-primary">0.00</span></div>
            <div id="oc-cuotas-resumen" class="hidden mt-2 p-2 bg-primary/5 rounded border border-primary/10 text-[11px] text-primary font-medium text-center italic">
              <!-- Mensaje de cuotas -->
            </div>
            <div id="oc-adelanto-resumen" class="hidden mt-2 p-3 bg-blue-50 rounded border border-blue-100 text-xs">
              <div class="flex justify-between mb-1"><span>Adelanto (<span id="res-adelanto-porc">0</span>%):</span><span id="res-adelanto-monto" class="font-bold text-blue-700">0.00</span></div>
              <div class="flex justify-between"><span>Saldo Final:</span><span id="res-saldo-monto" class="font-bold text-primary">0.00</span></div>
            </div>
          </div>

          <div class="mt-5 space-y-2">
            <button class="btn btn-primary w-full" onclick="generateOC()">
              <i data-lucide="file-check" class="w-4 h-4"></i>Generar OC + PDF
            </button>
            <div id="oc-drive-btn" class="hidden">
              <button class="btn btn-outline w-full" onclick="exportToDrive()">
                <i data-lucide="upload-cloud" class="w-4 h-4"></i>Exportar a Google Drive
              </button>
            </div>
          </div>

          <div id="oc-numero-badge" class="hidden mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-center">
            <div class="text-xs text-green-700 font-medium">OC Generada</div>
            <div id="oc-numero-text" class="text-lg font-bold text-green-800 font-mono"></div>
          </div>
        </div>
      </div>
    </div>
    <datalist id="inventory-items">
      <!-- Opciones pobladas dinámicamente -->
    </datalist>
    <datalist id="oc-categories-list">
      <!-- Opciones pobladas dinámicamente -->
    </datalist>
    <datalist id="all-assets-list">
      <!-- Opciones pobladas dinámicamente -->
    </datalist>`;
};

window.Views['new-purchase'].afterMount = async function () {
  UI.loading('Cargando catálogos...');
  const [suppData, areaData, invData, catData] = await Promise.all([
    fetch('api/suppliers.php?active_only=1').then(r => r.json()).catch(() => ({ suppliers: [] })),
    fetch('api/areas.php').then(r => r.json()).catch(() => ({ areas: [] })),
    fetch('api/items.php').then(r => r.json()).catch(() => ({ items: [] })),
    fetch('api/categories_inventario.php').then(r => r.json()).catch(() => ({ categories: [] }))
  ]);
  UI.stopLoading();
  _ocSuppliers = suppData.suppliers || [];
  _ocAreas = areaData.areas || [];
  _ocInventoryItems = invData.items || [];
  _ocCategories = catData.categories || [];

  // Poblar datalist de categorías
  const catList = document.getElementById('oc-categories-list');
  if (catList) {
    _ocCategories.forEach(c => {
      const o = document.createElement('option');
      o.value = c.nombre;
      o.dataset.prefijo = c.prefijo;
      catList.appendChild(o);
    });
  }

  // Poblar select de proveedores
  const supSel = document.getElementById('oc-proveedor');
  _ocSuppliers.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.razon_social;
    supSel.appendChild(o);
  });
  supSel.addEventListener('change', function () {
    const s = _ocSuppliers.find(x => x.id == this.value);
    document.getElementById('oc-ruc').value = s ? (s.ruc || '') : '';
    document.getElementById('oc-telefono').value = s ? (s.telefono || '') : '';
    document.getElementById('oc-contacto').value = s ? (s.contacto || '') : '';
    document.getElementById('oc-direccion').value = s ? (s.direccion || '') : '';
  });

  // Poblar select de áreas
  const areaSel = document.getElementById('oc-area');
  _ocAreas.forEach(a => {
    const o = document.createElement('option');
    o.value = a.id;
    o.textContent = a.nombre;
    areaSel.appendChild(o);
  });

  // Fecha requerida por defecto: hoy + 7 días
  const def = new Date(); def.setDate(def.getDate() + 7);
  document.getElementById('oc-fecha-req').value = def.toISOString().split('T')[0];

  _ocItemRows = 0;
  addOCItem(); // Agregar primera fila vacía

  // CARGAR ACTIVOS PARA OS (EQUIPOS Y MOBILIARIO)
  try {
    const assetsResp = await fetch('api/assets.php').then(r => r.json());
    _ocAssets = assetsResp.assets || [];
    const assetsList = document.getElementById('all-assets-list');
    if (assetsList) {
        _ocAssets.forEach(as => {
            const o = document.createElement('option');
            o.value = as.codigo_interno;
            o.textContent = `${as.item_nombre} - ${as.sede_nombre} (${as.estado})`;
            o.dataset.id = as.id;
            assetsList.appendChild(o);
        });
    }
  } catch(e) { console.error('Error loading assets for OS:', e); }

  lucide.createIcons();
};

window.toggleOSTargetField = function() {
    const type = document.getElementById('oc-tipo').value;
    const container = document.getElementById('os-target-container');
    if (type === 'servicio') {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
        document.getElementById('os-target-code').value = '';
    }
    updateOCTypeLabels();
};

window.onOSTargetChange = function() {
    const code = document.getElementById('os-target-code').value.trim();
    if (!code) return;

    const asset = _ocAssets.find(a => a.codigo_interno === code || a.numero_serie === code);
    if (asset) {
        UI.toast(`Activo detectado: ${asset.item_nombre}`, 'success');
        
        // Si no hay filas, agregamos una
        if (_ocItemRows === 0) {
            addOCItem();
        }

        // Poblar la primera fila con la categoría del activo
        const catInput = document.getElementById('oc-cat-1');
        const descInput = document.getElementById('oc-desc-1');
        
        if (catInput && asset.categoria_nombre) {
            catInput.value = asset.categoria_nombre;
            catInput.dataset.assetId = asset.id; // Guardar ID para el guardado final
            onCategorySelect(1);
            
            if (descInput) {
                descInput.value = `Mantenimiento / Servicio de ${asset.item_nombre} (S/N: ${asset.numero_serie || 'N/A'})`;
            }
        }
    } else {
        document.getElementById('os-target-code').dataset.assetId = '';
    }
};

window.toggleCreditDetails = function () {
  const cond = document.getElementById('oc-condicion').value;
  const container = document.getElementById('oc-credito-container');
  const tipo = document.getElementById('oc-credito-tipo').value;
  const label = document.getElementById('oc-credito-label');

  if (cond === 'Credito') {
    container.classList.remove('hidden');
    document.getElementById('oc-adelanto-container').classList.add('hidden');
    label.textContent = tipo === 'Dias' ? 'Cantidad de Días' : 'N° de Cuotas';
  } else if (cond === 'Adelanto + Saldo') {
    container.classList.add('hidden');
    document.getElementById('oc-adelanto-container').classList.remove('hidden');
  } else {
    container.classList.add('hidden');
    document.getElementById('oc-adelanto-container').classList.add('hidden');
    document.getElementById('oc-condicion-val').value = '';
    document.getElementById('oc-adelanto-porc').value = '';
  }
  recalcOCTotals();
};

window.toggleMobilityPrompt = function () {
  const inc = document.getElementById('oc-incluye-movilidad').checked;
  if (!inc) {
    const suppliersOptions = _ocSuppliers.map(s => `<option value="${s.id}">${s.razon_social}</option>`).join('');

    UI.modal({
      title: 'Datos de Movilidad por separado',
      body: `
        <div class="space-y-4">
          <p class="text-xs text-muted-foreground">Seleccione quién realizará la movilidad para que Tesorería pueda ver sus datos bancarios.</p>
          <div>
            <label class="text-sm font-medium">Proveedor de Movilidad <span class="text-destructive">*</span></label>
            <select id="mob-proveedor-id" class="select mt-1 w-full">
              <option value="">Seleccione proveedor...</option>
              ${suppliersOptions}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium">Monto de Movilidad <span class="text-destructive">*</span></label>
              <input type="number" id="mob-monto" class="input mt-1 w-full" placeholder="0.00" step="0.01">
            </div>
            <div>
              <label class="text-sm font-medium">Fecha Tentativa</label>
              <input type="date" id="mob-fecha" class="input mt-1 w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>
          <div>
            <label class="text-sm font-medium">Detalles / Ruta</label>
            <textarea id="mob-desc" class="input mt-1 w-full h-16 resize-none" placeholder="Ej: Lima - Carabayllo - Lima"></textarea>
          </div>
        </div>
      `,
      confirmText: 'Guardar Movilidad',
      onConfirm: () => {
        const proveedor_id = document.getElementById('mob-proveedor-id').value;
        const monto = document.getElementById('mob-monto').value;
        const desc = document.getElementById('mob-desc').value;
        const fecha = document.getElementById('mob-fecha').value;

        if (!proveedor_id) { UI.toast('Seleccione un proveedor de movilidad', 'error'); return; }
        if (!monto || monto <= 0) { UI.toast('El monto es obligatorio', 'error'); return; }

        const providerName = _ocSuppliers.find(s => s.id == proveedor_id)?.razon_social || '—';
        _ocMobilityData = { proveedor_id, proveedor_nombre: providerName, monto, desc, fecha };
        recalcOCTotals();
        UI.toast('Datos de movilidad guardados localmente', 'info');
      },
      onCancel: () => {
        // Si cancela, volvemos a marcar el check
        document.getElementById('oc-incluye-movilidad').checked = true;
      }
    });
  } else {
    _ocMobilityData = null;
  }
};

window.addOCItem = function () {
  const empty = document.getElementById('oc-empty-row');
  if (empty) empty.remove();
  _ocItemRows++;
  const n = _ocItemRows;
  const tbody = document.getElementById('oc-items-body');
  const tr = document.createElement('tr');
  tr.id = `oc-row-${n}`;
  tr.innerHTML = `
    <td class="text-center text-muted-foreground text-xs">${n}</td>
    <td>
        <input class="input w-full text-sm font-bold" id="oc-cat-${n}" list="oc-categories-list" placeholder="Categoría..." onchange="onCategorySelect(${n})">
    </td>
    <td>
        <input class="input w-full text-sm font-mono text-center bg-muted cursor-not-allowed" id="oc-prefijo-${n}" readonly placeholder="---">
    </td>
    <td>
        <input class="input w-full text-sm" id="oc-desc-${n}" placeholder="Detalle adicional...">
    </td>
    <td><input class="input w-full text-sm" id="oc-unidad-${n}" placeholder="Und." value="Unidad"></td>
    <td><input class="input w-full text-sm text-right" id="oc-qty-${n}" type="number" min="1" value="1" oninput="recalcOCRow(${n})"></td>
    <td><input class="input w-full text-sm text-right" id="oc-pu-${n}" type="number" min="0" step="0.01" value="0.00" oninput="recalcOCRow(${n})"></td>
    <td class="text-right font-semibold" id="oc-total-${n}">0.00</td>
    <td class="text-center">
      <button class="btn btn-ghost p-1 text-destructive" onclick="removeOCItem(${n})"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    </td>`;
  tbody.appendChild(tr);
  lucide.createIcons();
};

window.onCategorySelect = function (n) {
  const input = document.getElementById(`oc-cat-${n}`);
  const prefijoEl = document.getElementById(`oc-prefijo-${n}`);
  const val = input.value;

  const cat = _ocCategories.find(c => c.nombre === val);
  if (cat) {
    prefijoEl.value = cat.prefijo || '---';
    
    // ARQUITECTURA EXPERTA: Buscar el Item Maestro vinculado a esta categoría
    // para que la recepción afecte al stock correcto.
    const masterItem = _ocInventoryItems.find(i => i.categoria_inventario_id == cat.id);
    if (masterItem) {
        input.dataset.itemId = masterItem.id;
        input.dataset.categoryId = cat.id;
        UI.toast(`Vínculo de inventario detectado: ${masterItem.nombre}`, 'info');
    } else {
        // Si no existe, usamos el ID de categoría como fallback (el backend debería manejarlo)
        // pero lo ideal es que exista un ítem.
        input.dataset.categoryId = cat.id;
        UI.toast(`Categoría vinculada. Nota: No se encontró ítem maestro para stock.`, 'warning');
    }
  } else {
    prefijoEl.value = '---';
    delete input.dataset.categoryId;
    delete input.dataset.itemId;
    if (val) UI.toast('Esa categoría no existe. Debe crearla primero.', 'warning');
  }
};

window.removeOCItem = function (n) {
  document.getElementById(`oc-row-${n}`)?.remove();
  recalcOCTotals();
  if (!document.getElementById('oc-items-body').querySelector('tr')) {
    const tbody = document.getElementById('oc-items-body');
    tbody.innerHTML = '<tr id="oc-empty-row"><td colspan="9" class="text-center py-6 text-muted-foreground">Agrega al menos un ítem para continuar.</td></tr>';
  }
};

window.recalcOCRow = function (n) {
  const qty = parseFloat(document.getElementById(`oc-qty-${n}`)?.value || 0);
  const pu = parseFloat(document.getElementById(`oc-pu-${n}`)?.value || 0);
  const total = qty * pu;
  const el = document.getElementById(`oc-total-${n}`);
  if (el) el.textContent = total.toFixed(2);
  recalcOCTotals();
};

function recalcOCTotals() {
  const moneda = document.getElementById('oc-moneda')?.value === 'PEN' ? 'S/' : (document.getElementById('oc-moneda')?.value === 'USD' ? '$' : '€');
  const porcIgv = parseFloat(document.getElementById('oc-igv-porcentaje')?.value || 18) / 100;
  const incluido = document.getElementById('oc-precios-con-igv')?.checked || false;

  let base = 0;
  for (let i = 1; i <= _ocItemRows; i++) {
    const el = document.getElementById(`oc-total-${i}`);
    if (el) base += parseFloat(el.textContent || 0);
  }

  let subtotal, igv, total;

  if (incluido) {
    total = base;
    subtotal = total / (1 + porcIgv);
    igv = total - subtotal;
  } else {
    subtotal = base;
    igv = subtotal * porcIgv;
    total = subtotal + igv;
  }

  document.getElementById('oc-subtotal').textContent = moneda + ' ' + subtotal.toFixed(2);
  document.getElementById('oc-igv').textContent = moneda + ' ' + igv.toFixed(2);
  document.getElementById('oc-total').textContent = moneda + ' ' + total.toFixed(2);

  // Mostrar movilidad si existe
  const mobRow = document.getElementById('oc-mob-row');
  const mobDisp = document.getElementById('oc-mob-monto-display');
  const totalGenDisp = document.getElementById('oc-total-general');

  let mobMonto = 0;
  if (_ocMobilityData && _ocMobilityData.monto) {
    mobMonto = parseFloat(_ocMobilityData.monto);
    mobRow.classList.remove('hidden');
    mobDisp.textContent = moneda + ' ' + mobMonto.toFixed(2);
  } else {
    mobRow.classList.add('hidden');
  }

  const totalGeneral = total + mobMonto;
  totalGenDisp.textContent = moneda + ' ' + totalGeneral.toFixed(2);

  // Actualizar etiquetas e info de cuotas
  const label = document.getElementById('oc-igv-label');
  if (label) {
    const porcText = (porcIgv * 100).toFixed(0) + '%';
    label.textContent = incluido ? `IGV (${porcText}) Incluido` : `IGV (${porcText})`;
  }

  const cond = document.getElementById('oc-condicion').value;
  const tipo = document.getElementById('oc-credito-tipo').value;
  const val = parseInt(document.getElementById('oc-condicion-val').value || 0);
  const cuotasDiv = document.getElementById('oc-cuotas-resumen');

  if (cond === 'Credito' && tipo === 'Cuotas' && val > 1) {
    const cuotaMonto = total / val;
    cuotasDiv.textContent = `Se cancelará en ${val} cuotas de ${moneda} ${cuotaMonto.toFixed(2)} c/u.`;
    cuotasDiv.classList.remove('hidden');
  } else {
    cuotasDiv.classList.add('hidden');
  }

  // Adelanto resumen
  const adelantoDiv = document.getElementById('oc-adelanto-resumen');
  if (cond === 'Adelanto + Saldo') {
    const aPorc = parseFloat(document.getElementById('oc-adelanto-porc').value || 0);
    const aMonto = total * (aPorc / 100);
    const sMonto = total - aMonto;
    document.getElementById('res-adelanto-porc').textContent = aPorc;
    document.getElementById('res-adelanto-monto').textContent = aMonto.toFixed(2);
    document.getElementById('res-saldo-monto').textContent = sMonto.toFixed(2);
    adelantoDiv.classList.remove('hidden');
  } else {
    adelantoDiv.classList.add('hidden');
  }
}

function getOCItems() {
  const items = [];
  let invalidRow = null;
  for (let i = 1; i <= _ocItemRows; i++) {
    const catEl = document.getElementById(`oc-cat-${i}`);
    const descEl = document.getElementById(`oc-desc-${i}`);
    const catNombre = catEl?.value?.trim();
    if (!catNombre) continue; // Fila vacía, se omite
    const desc = descEl?.value?.trim() || catNombre;
    const qty = parseFloat(document.getElementById(`oc-qty-${i}`)?.value || 0);
    const pu = parseFloat(document.getElementById(`oc-pu-${i}`)?.value || 0);
    const prefijo = document.getElementById(`oc-prefijo-${i}`)?.value || '';

    // Validar que la categoría exista en el sistema
    const catValida = _ocCategories.find(c => c.nombre === catNombre);
    if (!catValida) {
      // Resaltar la fila con error
      if (catEl) {
        catEl.classList.add('border-red-500', 'ring-2', 'ring-red-400');
        setTimeout(() => catEl.classList.remove('border-red-500', 'ring-2', 'ring-red-400'), 4000);
      }
      invalidRow = { row: i, nombre: catNombre };
      continue; // Marcar pero seguir para detectar todos los errores
    }

    // Categoría válida: limpiar estilos de error si hubiera
    catEl?.classList.remove('border-red-500', 'ring-2', 'ring-red-400');

    items.push({
      item_id: catEl.dataset.itemId || catValida.id || null,
      categoria_nombre: catNombre,
      prefijo: catValida.prefijo || prefijo,
      descripcion: desc,
      unidad: document.getElementById(`oc-unidad-${i}`)?.value || 'Unidad',
      cantidad: qty,
      precio_unitario: pu,
      total: qty * pu
    });
  }
  return { items, invalidRow };
}

window.generateOC = async function () {
  const proveedor_id = document.getElementById('oc-proveedor').value;
  const area = document.getElementById('oc-area').value;
  const fecha_req = document.getElementById('oc-fecha-req').value;

  if (!proveedor_id) { UI.toast('Seleccione un proveedor', 'error'); return; }
  if (!area) { UI.toast('Seleccione el área solicitante', 'error'); return; }

  const { items, invalidRow } = getOCItems();

  if (invalidRow) {
    UI.toast(`Fila ${invalidRow.row}: La categoría "${invalidRow.nombre}" no existe en el sistema. Créala primero en Módulo Categorías.`, 'error');
    return;
  }
  if (items.length === 0) { UI.toast('Agregue al menos un ítem con una categoría válida', 'error'); return; }

  UI.loading('Generando Documento...');

  try {
    const tipo = document.getElementById('oc-tipo').value;
    const sup = _ocSuppliers.find(s => s.id == proveedor_id);
    const user = Auth.getUser();
    const cond = document.getElementById('oc-condicion').value;
    const cTipo = document.getElementById('oc-credito-tipo').value;
    const cVal = document.getElementById('oc-condicion-val').value;
    
    // Obtener activo_id si es OS
    let activoId = null;
    if (tipo === 'servicio') {
        const targetCode = document.getElementById('os-target-code').value.trim();
        if (targetCode) {
            const asset = _ocAssets.find(a => a.codigo_interno === targetCode || a.numero_serie === targetCode);
            if (asset) {
                activoId = asset.id;
            } else {
                UI.toast('El código de activo no es válido, se procesará como servicio general', 'warning');
            }
        }
    }

    const porcIgv = parseFloat(document.getElementById('oc-igv-porcentaje').value || 18) / 100;
    const incluido = document.getElementById('oc-precios-con-igv').checked;
    const base = items.reduce((a, it) => a + (parseFloat(it.total) || 0), 0);
    let totalCalculado = incluido ? base : base * (1 + porcIgv);

    let condDetalle = '';
    if (cond === 'Credito' && cVal) {
      condDetalle = cTipo === 'Dias' ? `${cVal} días` : `${cVal} cuotas`;
    }

    const adelantoPorc = cond === 'Adelanto + Saldo' ? (parseFloat(document.getElementById('oc-adelanto-porc').value) || 0) : null;
    const adelantoMonto = adelantoPorc !== null ? (totalCalculado * (adelantoPorc / 100)) : null;
    const saldoMonto = adelantoPorc !== null ? (totalCalculado - adelantoMonto) : null;

    if (cond === 'Adelanto + Saldo' && (adelantoPorc <= 0 || adelantoPorc >= 100)) {
      UI.toast('El porcentaje de adelanto debe estar entre 1 y 99', 'warning');
      UI.stopLoading();
      return;
    }

    const payload = {
      tipo,
      usuario_id: user?.id,
      proveedor_id,
      activo_id: activoId, // Link al equipo/mueble a intervenir
      fecha: new Date().toISOString().split('T')[0],
      area_id: area,
      moneda: document.getElementById('oc-moneda').value,
      condicion_pago: cond,
      condicion_detalle: condDetalle,
      adelanto_porcentaje: adelantoPorc,
      adelanto_monto: adelantoMonto ? adelantoMonto.toFixed(2) : null,
      saldo_monto: saldoMonto ? saldoMonto.toFixed(2) : null,
      fecha_requerida: fecha_req,
      igv_porcentaje: document.getElementById('oc-igv-porcentaje').value,
      precios_con_igv: incluido ? 1 : 0,
      incluye_movilidad: document.getElementById('oc-incluye-movilidad').checked ? 1 : 0,
      monto_movilidad: _ocMobilityData ? _ocMobilityData.monto : 0,
      mobility: _ocMobilityData,
      observaciones: document.getElementById('oc-observaciones').value.trim(),
      items
    };

    const resp = await fetch('api/purchases.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let res;
    try {
      res = await resp.json();
    } catch (e) {
      console.error('Invalid JSON response:', e);
      throw new Error('La respuesta del servidor no es válida');
    }

    UI.stopLoading();

    if (res.ok) {
      const areaNombre = document.getElementById('oc-area').options[document.getElementById('oc-area').selectedIndex].text;
      payload.fecha_vencimiento = res.fecha_vencimiento || null;

      // ─── PASO 1: Generar y DESCARGAR PDF de la OC/OS ─────────────────
      UI.loading('Descargando PDF de la OC…');
      let ocDoc = null;
      try {
        ocDoc = generateOCPDF(res.numero_oc, sup, areaNombre, payload, items);
      } catch (pdfErr) {
        console.error('Error in generateOCPDF:', pdfErr);
        UI.toast('Error al generar el PDF de la OC', 'warning');
      }

      // ─── PASO 2: Generar y DESCARGAR PDF de Movilidad (si aplica) ────
      let mobDoc = null;
      if (!payload.incluye_movilidad && payload.mobility) {
        await new Promise(r => setTimeout(r, 800));
        UI.loading('Descargando PDF de Movilidad…');
        try {
          mobDoc = generateMobilityPDF(res.numero_oc, payload.mobility, sup, payload.moneda, payload.mobility.proveedor_nombre);
        } catch (mobErr) {
          console.error('Error in generateMobilityPDF:', mobErr);
        }
      }

      // ─── PASO 3: Subir a Google Drive, guardar SOLO el link en BD ────
      UI.loading('Subiendo a Google Drive…');

      // Helper: sube un PDF y devuelve el webViewLink (o null si falla)
      const uploadToDrive = (doc, name) => new Promise((resolve) => {
        if (!doc || typeof google === 'undefined') { resolve(null); return; }
        const pdfBlob = doc.output('blob');
        const metadata = { name: name + '.pdf', mimeType: 'application/pdf', parents: [DRIVE_FOLDER_ID] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', pdfBlob);

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
                // Hacer el archivo accesible a cualquiera con el link
                await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
                  method: 'POST',
                  headers: { Authorization: 'Bearer ' + token.access_token, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: 'reader', type: 'anyone' })
                });
                UI.toast(`"${name}.pdf" subido a Drive ✓`, 'success');
                resolve(fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`);
              } else {
                UI.toast(`Error al subir "${name}" a Drive`, 'warning');
                resolve(null);
              }
            } catch {
              UI.toast(`Error de red al subir "${name}" a Drive`, 'warning');
              resolve(null);
            }
          }
        }).requestAccessToken();
      });

      // ─── PASO 4: Notificar y redirigir (SIN ESPERAR A DRIVE) ──────────
      UI.stopLoading();
      UI.toast(`${tipo === 'servicio' ? 'OS' : 'OC'} ${res.numero_oc} generada con éxito.`, 'success');
      
      // Redirigir inmediatamente para no bloquear al usuario
      Router.go('purchases');

      // ─── PASO 5: Subir a Google Drive (PROCESO EN SEGUNDO PLANO) ──────
      // No usamos 'await' aquí para que no bloquee la interfaz
      (async () => {
          try {
            const driveLinks = {};
            if (ocDoc) driveLinks.pdf_oc_url = await uploadToDrive(ocDoc, res.numero_oc);
            if (mobDoc) driveLinks.pdf_mov_url = await uploadToDrive(mobDoc, res.numero_oc + '-MOV');

            if (driveLinks.pdf_oc_url || driveLinks.pdf_mov_url) {
              await fetch('api/purchases.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_drive_links', id: res.id, ...driveLinks })
              });
              console.log('Copia de seguridad en Drive completada.');
            }
          } catch (driveErr) {
            console.error('Drive background upload error:', driveErr);
          }
      })();

    } else {
      UI.toast('Error: ' + (res.error || 'Ocurrió un problema en el servidor'), 'error');
    }

  } catch (err) {
    console.error('Error in generateOC:', err);
    UI.stopLoading();
    UI.toast('Error: ' + err.message, 'error');
  }
};

window.updateOCTypeLabels = function () {
  const tipo = document.getElementById('oc-tipo').value;
  const title = document.querySelector('#view h1');
  if (title) {
    title.textContent = tipo === 'servicio' ? 'Nueva Orden de Servicio' : 'Nueva Orden de Compra';
  }
};

window.generateOCPDF = function (numero_oc, sup, area, body, items) {
  if (typeof window.jspdf === 'undefined') {
    UI.toast('La librería PDF aún se está cargando. Espere unos segundos e intente de nuevo.', 'warning');
    return null;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;

  // --- PALETA DE COLORES INSTITUCIONAL ---
  const C_NAVY = [27, 92, 255];   // #1b5cff (Principal)
  const C_BLUE = [54, 162, 188];   // #36a2bc (Secundario)
  const C_LGRAY = [243, 244, 244]; // #f3f4f4 (Fondo/Acento)
  const C_MGRAY = [200, 200, 200]; // Gris para bordes
  const C_DARK = [31, 41, 55];    // Gris muy oscuro (Texto)
  const C_GRAY = [100, 110, 130];
  const C_WHITE = [255, 255, 255];
  const C_GREEN = [22, 163, 74];

  // --- CÁLCULOS PREVIOS ---
  const isServicio = body.tipo === 'servicio';
  const docTitle = isServicio ? 'ORDEN DE SERVICIO' : 'ORDEN DE COMPRA';
  const monSym = body.moneda === 'PEN' ? 'S/' : (body.moneda === 'USD' ? '$' : '\u20ac');
  const porcIgv = parseFloat(body.igv_porcentaje || 18) / 100;
  const incluido = !!body.precios_con_igv;
  const base = items.reduce((a, it) => a + (parseFloat(it.total) || 0), 0);

  const fM = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? '0.00' : n.toFixed(2);
  };

  let subtotal, igv, total;
  if (incluido) {
    total = base; subtotal = total / (1 + porcIgv); igv = total - subtotal;
  } else {
    subtotal = base; igv = subtotal * porcIgv; total = subtotal + igv;
  }

  // =============================================
  // CABECERA (ESTILO IMAGEN)
  // =============================================
  // Logo e info Colegio (Izquierda - Fondo Blanco)
  const img = new Image();
  img.src = 'assets/images/icono.png';
  try { doc.addImage(img, 'PNG', 10, 8, 25, 20); } catch (e) { }

  doc.setTextColor(...C_NAVY);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('CAT\u00d3LICA SCHOOL', 40, 15);
  doc.setTextColor(...C_BLUE); doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text('Explora \u00b7 Descubre \u00b7 Aprende', 40, 20);

  doc.setTextColor(...C_GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('RUC: 20515381539', 40, 26);
  doc.text('Direcci\u00f3n: VII Etapa, C. San Pedro Clavers 1582, Carabayllo 15318', 40, 31);
  doc.text('Tel: +51 982 784 498  |  compras@colegiolacatolica.edu.pe', 40, 36);

  // Cuadro OC (Derecha - Fondo Azul)
  doc.setFillColor(...C_NAVY);
  doc.rect(W - 75, 8, 65, 32, 'F');
  doc.setTextColor(...C_WHITE);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(docTitle, W - 42.5, 16, { align: 'center' });
  doc.setFontSize(10);
  doc.text('N\u00b0 ' + numero_oc, W - 42.5, 23, { align: 'center' });

  const fechaEmision = body.fecha ? new Date(body.fecha + 'T12:00:00').toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE');
  const fechaValida = body.fecha_vencimiento ? new Date(body.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-PE') : '---';

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('Emisi\u00f3n: ' + fechaEmision, W - 42.5, 30, { align: 'center' });
  doc.text('V\u00e1lida hasta: ' + fechaValida, W - 42.5, 36, { align: 'center' });

  // =============================================
  // BLOQUES DE DATOS (PROVEEDOR / ENTREGA)
  // =============================================
  let y = 48;

  const drawGridBlock = (title, lines, x, bw) => {
    doc.setFillColor(...C_NAVY);
    doc.rect(x, y, bw, 6, 'F');
    doc.setTextColor(...C_WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(title, x + 2, y + 4.5);

    let curY = y + 6;
    doc.setDrawColor(...C_MGRAY); doc.setLineWidth(0.2);

    lines.forEach(([lbl, val]) => {
      const labelWidth = 32;
      const textVal = String(val || '---');
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      const wrappedVal = doc.splitTextToSize(textVal, bw - labelWidth - 4);
      const rowH = Math.max(6, (wrappedVal.length * 3.5) + 2);

      doc.setFillColor(...C_LGRAY);
      doc.rect(x, curY, labelWidth, rowH, 'F');
      doc.rect(x, curY, bw, rowH);
      doc.line(x + labelWidth, curY, x + labelWidth, curY + rowH);

      doc.setTextColor(...C_NAVY); doc.setFont('helvetica', 'bold');
      doc.text(lbl, x + 2, curY + 4);

      doc.setTextColor(...C_DARK); doc.setFont('helvetica', 'normal');
      doc.text(wrappedVal, x + labelWidth + 2, curY + 4);
      curY += rowH;
    });
    return curY;
  };

  const supLines = [
    ['Proveedor:', sup?.razon_social],
    ['RUC / DNI:', sup?.ruc],
    ['Direcci\u00f3n:', sup?.direccion],
    ['Tel\u00e9fono:', sup?.telefono],
    ['Contacto:', sup?.contacto],
  ];

  const condPagoText = body.condicion_pago + (body.condicion_detalle ? ` (${body.condicion_detalle})` : '');
  const entregaLines = [
    ['Lugar entrega:', 'Cat\u00f3lica School'],
    ['Fecha requerida:', body.fecha_requerida || '---'],
    ['Condici\u00f3n pago:', condPagoText],
    ['Moneda:', body.moneda === 'PEN' ? 'Soles (S/)' : 'D\u00f3lares ($)'],
    ['Centro de costo:', area],
  ];

  const bw = (W - 24) / 2;
  const h1 = drawGridBlock('DATOS DEL PROVEEDOR', supLines, 10, bw);
  const h2 = drawGridBlock('DATOS DE ENTREGA Y PAGO', entregaLines, W / 2 + 2, bw);
  y = Math.max(h1, h2) + 4;

  // =============================================
  // TABLA DE ITEMS
  // =============================================
  try {
    doc.autoTable({
      startY: y,
      head: [['\u00cdtem', 'Prefijo', 'Categor\u00eda / Descripci\u00f3n', 'Unidad', 'Cant.', 'P. Unit.', 'Subtotal']],
      body: (items || []).map((it, i) => {
        const catLabel = it.categoria_nombre || '';
        const detalle = (it.descripcion && it.descripcion !== it.categoria_nombre) ? it.descripcion : '';
        const fullDesc = detalle ? `${catLabel}\n${detalle}` : catLabel || it.descripcion || '---';
        return [
          i + 1,
          it.prefijo || '\u2014',
          fullDesc,
          it.unidad || 'Unidad',
          it.cantidad || 0,
          `${monSym}  ${fM(it.precio_unitario)}`,
          `${monSym}  ${fM(it.total)}`
        ];
      }),
      headStyles: { fillColor: C_NAVY, textColor: C_WHITE, fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: C_DARK, valign: 'middle', lineColor: C_MGRAY, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: [27, 92, 255] },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' },
      },
      theme: 'grid',
      margin: { left: 10, right: 10 }
    });
    y = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 2 : y + 20;
  } catch (e) {
    console.error('Error in autoTable:', e);
    y += 10;
  }

  // =============================================
  // TOTALES
  // =============================================
  try {
    const drawTotalLine = (lbl, val, isFinal = false) => {
      doc.setDrawColor(...C_MGRAY);
      doc.setFillColor(isFinal ? C_NAVY : C_LGRAY);
      doc.rect(W - 55, y, 20, 6, 'F');
      doc.rect(W - 35, y, 25, 6, 'F');
      doc.rect(W - 55, y, 45, 6);
      doc.line(W - 35, y, W - 35, y + 6);

      doc.setTextColor(isFinal ? C_WHITE : C_NAVY); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(lbl + ':', W - 53, y + 4.5);
      doc.text(`${monSym}  ${fM(val)}`, W - 12, y + 4.5, { align: 'right' });
      y += 6;
    };

    drawTotalLine('Subtotal', subtotal);
    drawTotalLine('Descuento', 0);
    drawTotalLine('IGV (18%)', igv);
    drawTotalLine('Flete', 0);
    drawTotalLine('TOTAL', total, true);
  } catch (e) {
    console.error('Error in Totales:', e);
    y += 30;
  }

  y += 4;

  // =============================================
  // OBSERVACIONES
  // =============================================
  try {
    doc.setFillColor(...C_NAVY);
    doc.rect(10, y, W - 20, 6, 'F');
    doc.setTextColor(...C_WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES Y CONDICIONES ESPECIALES:', 12, y + 4.5);
    y += 6;

    doc.setDrawColor(...C_MGRAY);
    const obsText = body.observaciones || 'Sin observaciones adicionales.';
    const obsLines = doc.splitTextToSize(obsText, W - 24);
    const obsH = Math.max(12, obsLines.length * 4 + 4);
    doc.rect(10, y, W - 20, obsH);
    doc.setTextColor(...C_DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(obsLines, 12, y + 5);

    if (body.incluye_movilidad) {
      doc.setTextColor(...C_NAVY); doc.setFont('helvetica', 'bold');
      doc.text('\u2713 ESTE DOCUMENTO INCLUYE EL COSTO DE MOVILIDAD / TRANSPORTE', 12, y + obsH - 2);
    }
    y += obsH + 4;
  } catch (e) {
    console.error('Error in Observaciones:', e);
    y += 20;
  }

  // =============================================
  // FIRMAS
  // =============================================
  try {
    const colW = (W - 20) / 3;
    const drawFirma = (lbl, x) => {
      doc.setFillColor(...C_LGRAY);
      doc.rect(x, y, colW, 6, 'F');
      doc.rect(x, y, colW, 25);
      doc.rect(x, y, colW, 6);
      doc.rect(x, y + 25, colW, 4);

      doc.setTextColor(...C_NAVY); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text(lbl, x + colW / 2, y + 4.5, { align: 'center' });

      doc.setTextColor(...C_GRAY); doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5);
      doc.text('Firma y Sello', x + colW / 2, y + 28, { align: 'center' });
    };

    drawFirma('Solicitado por:', 10);
    drawFirma('Revisado por:', 10 + colW);
    drawFirma('Autorizado por:', 10 + colW * 2);
  } catch (e) {
    console.error('Error in Firmas:', e);
  }

  if (arguments[5] !== false) doc.save(numero_oc + '.pdf');
  window._lastOCDoc = doc;
  window._lastOCNumero = numero_oc;
  return doc;
}

window.generateMobilityPDF = function (numero_oc, mob, sup, moneda, mobProviderName) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;

  // --- COLORES ---
  const C_NAVY = [27, 92, 255];
  const C_BLUE = [54, 162, 188];
  const C_LGRAY = [243, 244, 244];
  const C_MGRAY = [220, 225, 235];
  const C_DARK = [31, 41, 55];
  const C_GRAY = [100, 116, 139];
  const C_WHITE = [255, 255, 255];
  const monSym = moneda === 'PEN' ? 'S/' : (moneda === 'USD' ? '$' : '€');

  // 1. Cabecera (Estilo Imagen)
  const img = new Image();
  img.src = 'assets/images/icono.png';
  try { doc.addImage(img, 'PNG', 10, 8, 25, 20); } catch (e) { }

  doc.setTextColor(...C_NAVY);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('CAT\u00d3LICA SCHOOL', 40, 15);
  doc.setTextColor(...C_BLUE); doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text('Explora \u00b7 Descubre \u00b7 Aprende', 40, 20);

  doc.setTextColor(...C_GRAY); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('RUC: 20515381539', 40, 26);
  doc.text('Direcci\u00f3n: VII Etapa, C. San Pedro Clavers 1582, Carabayllo 15318', 40, 31);

  // Cuadro Titulo (Derecha - Fondo Azul)
  doc.setFillColor(...C_NAVY);
  doc.rect(W - 75, 8, 65, 30, 'F');
  doc.setTextColor(...C_WHITE);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('ANEXO DE MOVILIDAD', W - 42.5, 16, { align: 'center' });
  doc.setFontSize(9);
  doc.text('REF: ' + numero_oc, W - 42.5, 23, { align: 'center' });
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('FECHA: ' + (mob.fecha || new Date().toLocaleDateString()), W - 42.5, 30, { align: 'center' });

  // 2. Detalles del Servicio (Grid)
  let y = 48;
  doc.setFillColor(...C_NAVY);
  doc.rect(10, y, W - 20, 6, 'F');
  doc.setTextColor(...C_WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DEL SERVICIO DE TRANSPORTE', 12, y + 4.5);
  y += 6;

  const drawMobLine = (lbl, val, h = 6) => {
    const labelWidth = 52;
    const textVal = String(val || '---');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    const wrappedLabel = doc.splitTextToSize(lbl, labelWidth - 4);
    doc.setFont('helvetica', 'normal');
    const wrappedVal = doc.splitTextToSize(textVal, W - 20 - labelWidth - 4);
    const rowH = Math.max(h, (wrappedVal.length * 4) + 2, (wrappedLabel.length * 4) + 2);

    doc.setDrawColor(...C_MGRAY); doc.setLineWidth(0.2);
    doc.setFillColor(...C_LGRAY);
    doc.rect(10, y, labelWidth, rowH, 'F');
    doc.rect(10, y, W - 20, rowH);
    doc.line(10 + labelWidth, y, 10 + labelWidth, y + rowH);

    doc.setTextColor(...C_NAVY); doc.setFont('helvetica', 'bold');
    doc.text(wrappedLabel, 12, y + 4);

    doc.setTextColor(...C_DARK); doc.setFont('helvetica', 'normal');
    doc.text(wrappedVal, 10 + labelWidth + 2, y + 4);
    y += rowH;
  };

  drawMobLine('PROVEEDOR TRANSPORTISTA:', mobProviderName);
  drawMobLine('CONCEPTO / RUTA:', mob.desc || 'Servicio de movilidad vinculado a la orden ' + numero_oc, 12);

  // Monto Destacado
  doc.setFillColor(...C_NAVY);
  doc.rect(W - 65, y + 4, 55, 10, 'F');
  doc.setTextColor(...C_WHITE); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('MONTO A PAGAR:', W - 63, y + 10.5);
  doc.setFontSize(12);
  doc.text(`${monSym} ${parseFloat(mob.monto).toFixed(2)}`, W - 12, y + 10.5, { align: 'right' });
  y += 18;

  doc.setTextColor(...C_GRAY); doc.setFontSize(7.5); doc.setFont('helvetica', 'italic');
  doc.text('* Este documento justifica el gasto de transporte por separado de la orden principal.', 10, y);
  y += 15;

  // 3. Firmas
  const colW = (W - 20) / 3;
  const drawFirmaMob = (lbl, x) => {
    doc.setFillColor(...C_LGRAY);
    doc.rect(x, y, colW, 6, 'F');
    doc.rect(x, y, colW, 25);
    doc.rect(x, y, colW, 6);

    doc.setTextColor(...C_NAVY); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text(lbl, x + colW / 2, y + 4.5, { align: 'center' });

    doc.setTextColor(...C_GRAY); doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5);
    doc.text('Firma y Sello', x + colW / 2, y + 28, { align: 'center' });
  };

  drawFirmaMob('Solicitante', 10);
  drawFirmaMob('V\u00b0B\u00b0 Administraci\u00f3n', 10 + colW);
  drawFirmaMob('Transportista', 10 + colW * 2);

  // Footer decorativo
  doc.setFillColor(...C_NAVY);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setTextColor(...C_WHITE); doc.setFontSize(7);
  doc.text('\u00a9 ' + new Date().getFullYear() + ' CAT\u00d3LICA SCHOOL - ANEXO DE MOVILIDAD', W / 2, H - 4.5, { align: 'center' });

  doc.save('MOVILIDAD-' + numero_oc + '.pdf');
  return doc;
};

// Google Drive export
const DRIVE_CLIENT_ID = '180581650294-1hq62hvc88ucednj1a4ksbccaj6vfhdg.apps.googleusercontent.com';
const DRIVE_FOLDER_ID = '1SM2SDdbypPMkNN-VAAyA5q9WSkszWjSs';

window.exportToDrive = function (specificDoc, specificName) {
  if (!DRIVE_CLIENT_ID) {
    UI.toast('Configura el Client ID de Google Drive primero', 'error');
    return;
  }

  const doc = specificDoc || window._lastOCDoc;
  const name = specificName || window._lastOCNumero;

  if (!doc) { UI.toast('Genere el PDF primero', 'error'); return; }
  const pdfBlob = doc.output('blob');

  UI.toast('Iniciando sesión en Google...', 'info');

  if (typeof google === 'undefined') {
    UI.toast('La librería de Google aún se está cargando. Reintente en 2 segundos.', 'warning');
    return;
  }

  // Inicializar Google Sign-In
  google.accounts.oauth2.initTokenClient({
    client_id: DRIVE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: async (token) => {
      UI.loading('Subiendo PDF a Google Drive...');
      const metadata = { name: (name || 'OC') + '.pdf', mimeType: 'application/pdf', parents: [DRIVE_FOLDER_ID] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', pdfBlob);
      try {
        const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token.access_token },
          body: form
        });
        UI.stopLoading();
        if (resp.ok) UI.toast('PDF exportado a Google Drive', 'success');
        else {
          const err = await resp.json();
          console.error('Drive Error:', err);
          UI.toast('Error al exportar: ' + (err.error?.message || 'Error desconocido'), 'error');
        }
      } catch (e) {
        UI.stopLoading();
        UI.toast('Error de red al subir a Drive', 'error');
      }
    }
  }).requestAccessToken();
};

window.exportOCById = async function (id) {
  try {
    UI.toast('Preparando exportación...', 'info');
    const resp = await fetch(`api/purchases.php?id=${id}`);
    const data = await resp.json();
    const oc = data.purchase;
    if (!oc) throw new Error('No se encontró la orden');

    const sup = {
      razon_social: oc.proveedor_nombre,
      ruc: oc.ruc,
      direccion: oc.proveedor_direccion,
      telefono: oc.proveedor_telefono,
      contacto: oc.proveedor_contacto
    };

    const body = {
      condicion_pago: oc.condicion_pago,
      condicion_detalle: oc.condicion_detalle,
      adelanto_porcentaje: oc.adelanto_porcentaje,
      adelanto_monto: oc.adelanto_monto,
      saldo_monto: oc.saldo_monto,
      moneda: oc.moneda,
      fecha_requerida: oc.fecha_requerida,
      fecha: oc.fecha,
      igv_porcentaje: oc.igv_porcentaje,
      precios_con_igv: oc.precios_con_igv,
      incluye_movilidad: oc.incluye_movilidad,
      observaciones: oc.observaciones
    };

    const doc = window.generateOCPDF(oc.numero_oc, sup, oc.area_nombre, body, oc.items, false); // false para no descargar automáticamente

    // Llamar a Drive inmediatamente para que el navegador lo vea como acción del usuario
    window.exportToDrive(doc, oc.numero_oc);

  } catch (e) {
    UI.toast('Error: ' + e.message, 'error');
  }
};

// ---- LISTADO DE ÓRDENES DE COMPRA ----
async function loadPurchases() {
  const tbody = document.getElementById('purchases-table-body');
  if (!tbody) return;
  try {
    const data = await fetch('api/purchases.php').then(r => r.json());
    if (!data.purchases || data.purchases.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-muted-foreground">No hay órdenes de compra registradas.</td></tr>';
      return;
    }
    tbody.innerHTML = data.purchases.map(p => {
      // LÓGICA DE ESTADO MAESTRO (PREMIUM)
      const isApproved = p.aprobado_gerente && p.aprobado_finanzas;
      const isRejected = p.rechazado_gerente || p.rechazado_finanzas;
      const isMobilityPaid = p.monto_movilidad > 0 ? (p.mobility_pagado == 1) : true;
      const isMainPaid = p.pagado == 1;
      const isAdelantoPaid = p.adelanto_pagado == 1;
      const isReceived = p.estado === 'Completada' || p.conformidad_url;
      const isOS = p.tipo === 'servicio';

      let masterStatus = { label: 'Pendiente', class: 'badge-yellow', icon: 'clock' };

      if (isRejected) {
          masterStatus = { label: 'Rechazada', class: 'badge-red', icon: 'x-circle' };
      } else if (isReceived) {
          masterStatus = { 
              label: isOS ? 'Realizado ✓' : 'En Almacén ✓', 
              class: 'badge-blue', 
              icon: isOS ? 'check-circle' : 'package' 
          };
      } else if (isMainPaid && isMobilityPaid) {
          masterStatus = { label: 'Pagado Total', class: 'badge-green', icon: 'banknote' };
      } else if (isMainPaid || isAdelantoPaid || (p.monto_movilidad > 0 && isMobilityPaid)) {
          masterStatus = { label: 'Pago Parcial', class: 'badge-emerald', icon: 'wallet' };
      } else if (isApproved) {
          masterStatus = { label: 'Pendiente de Pago', class: 'badge-indigo', icon: 'credit-card' };
      }

      const statusHtml = `
        <div class="flex flex-col gap-2">
            <span class="badge ${masterStatus.class} w-fit flex items-center gap-1.5 py-1 px-2.5">
                <i data-lucide="${masterStatus.icon}" class="w-3 h-3"></i>
                ${masterStatus.label}
            </span>
            <div class="flex items-center gap-3 ml-1">
                <!-- Micro-indicadores de flujo -->
                <div class="flex gap-1" title="Aprobaciones (Gerencia / Finanzas)">
                    <i data-lucide="user-check" class="w-3 h-3 ${p.aprobado_gerente ? 'text-green-500' : 'text-slate-300'}"></i>
                    <i data-lucide="shield-check" class="w-3 h-3 ${p.aprobado_finanzas ? 'text-green-500' : 'text-slate-300'}"></i>
                </div>
                <div class="w-px h-3 bg-slate-200"></div>
                <div class="flex gap-1" title="Pagos OC (Adelanto / Total)">
                    <i data-lucide="wallet" class="w-3 h-3 ${p.adelanto_pagado ? 'text-blue-500' : 'text-slate-300'}"></i>
                    <i data-lucide="circle-dollar-sign" class="w-3 h-3 ${p.pagado ? 'text-green-500' : 'text-slate-300'}"></i>
                </div>
                ${p.monto_movilidad > 0 ? `
                <div class="w-px h-3 bg-slate-200"></div>
                <div class="flex gap-1" title="Pago de Movilidad">
                    <i data-lucide="truck" class="w-3 h-3 ${p.mobility_pagado == 1 ? 'text-orange-500' : 'text-slate-300'}"></i>
                </div>
                ` : ''}
                ${isReceived ? `
                    <div class="w-px h-3 bg-slate-200"></div>
                    <a href="${p.conformidad_url || '#'}" target="_blank" title="Ver Conformidad">
                        <i data-lucide="file-text" class="w-3 h-3 text-primary animate-pulse"></i>
                    </a>
                ` : ''}
            </div>
        </div>`;

      return `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${p.numero_oc}</td>
        <td>
          <div class="font-bold text-sm">${p.proveedor_nombre}</div>
          <div class="text-[10px] text-muted-foreground uppercase">${p.area_nombre || 'Sin área'}</div>
        </td>
        <td class="text-xs">${p.fecha || '—'}</td>
        <td class="font-bold text-sm">
            S/ ${(parseFloat(p.total || 0) + parseFloat(p.monto_movilidad || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            ${p.monto_movilidad > 0 ? `<div class="text-[9px] text-orange-600 font-medium">+ S/ ${parseFloat(p.monto_movilidad).toFixed(2)} Mov.</div>` : ''}
        </td>
        <td>${statusHtml}</td>
        <td class="text-right">
          <div class="flex justify-end gap-1">
            <button class="btn btn-ghost p-1.5" title="Ver detalles" onclick="viewOrderDetails(${p.id})"><i data-lucide="eye" class="w-4 h-4"></i></button>
            <button class="btn btn-ghost p-1.5 text-primary" title="Exportar a Drive" onclick="exportOCById(${p.id})"><i data-lucide="download" class="w-4 h-4"></i></button>
            ${window.canDelete(window.Auth.getUser()) ? 
                `<button class="btn btn-ghost p-1.5 text-destructive" title="Eliminar orden" onclick="confirmDeleteOC(${p.id}, '${p.numero_oc}')"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : 
                ''
            }
          </div>
        </td>
      </tr>`;
    }).join('');
    lucide.createIcons();
  } catch { tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-destructive">Error al cargar órdenes.</td></tr>'; }
}

window.Views.purchases = function () {
  return `
    ${UI.pageHeader('Órdenes de Compra y Servicio', 'Gestión de adquisiciones institucionales', `
      <div class="flex gap-2">
        <button class="btn btn-outline text-emerald-600" onclick="exportPurchasesExcel()"><i data-lucide="file-spreadsheet" class="w-4 h-4 mr-2"></i>Exportar Excel</button>
        <button class="btn btn-primary" onclick="Router.go('new-purchase')"><i data-lucide="plus" class="w-4 h-4 mr-2"></i>Nueva Orden</button>
      </div>
    `)}
    <div class="card">
      <div class="table-container">
        <table class="data">
          <thead>
            <tr><th>N° OC/OS</th><th>Proveedor / Área</th><th>Fecha</th><th>Monto Total</th><th>Estado</th><th class="text-right">Acciones</th></tr>
          </thead>
          <tbody id="purchases-table-body">
            <tr><td colspan="6" class="text-center py-10 text-muted-foreground">Cargando órdenes...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
};

window.Views.purchases.afterMount = loadPurchases;

window.confirmDeleteOC = function(id, numero) {
  if (!window.canDelete(window.Auth.getUser())) {
    UI.toast('Solo el Administrador puede eliminar órdenes de compra', 'error');
    return;
  }
  UI.modal({
    title: 'Eliminar Orden',
    body: `<p>¿Está seguro de que desea eliminar la orden <strong>${numero}</strong>? Esta acción no se puede deshacer y eliminará todos los registros asociados (ítems, cuotas, etc.).</p>`,
    confirmText: 'Sí, eliminar',
    onConfirm: async () => {
      UI.loading('Eliminando orden...');
      try {
        const resp = await fetch(`api/purchases.php?id=${id}`, { method: 'DELETE' });
        const res = await resp.json();
        UI.stopLoading();
        if (res.ok) {
          UI.toast('Orden eliminada correctamente', 'success');
          loadPurchases();
        } else {
          UI.toast('Error: ' + (res.error || 'No se pudo eliminar'), 'error');
        }
      } catch (e) {
        UI.stopLoading();
        UI.toast('Error de red al eliminar', 'error');
      }
    }
  });
};

// --- ESCÁNER DE ACTIVOS PARA OS ---
window.startAssetQRScanner = function() {
    UI.modal({
        title: 'Escanear Activo / Mobiliario',
        body: `
            <div class="space-y-4">
                <div id="qr-reader" class="overflow-hidden rounded-xl bg-slate-900 aspect-square flex items-center justify-center text-white text-xs italic">
                    Iniciando cámara...
                </div>
                <div id="qr-reader-results" class="text-center text-sm font-medium text-primary"></div>
                <p class="text-[10px] text-muted-foreground text-center italic">Encuadre el código QR del activo dentro del marco para detectarlo automáticamente.</p>
            </div>
        `,
        confirmText: 'Detener Cámara',
        onConfirm: () => {
            if (window._qrScanner) {
                window._qrScanner.stop().catch(e => console.error(e));
            }
            return true;
        }
    });

    setTimeout(() => {
        const html5QrCode = new Html5Qrcode("qr-reader");
        window._qrScanner = html5QrCode;
        
        const config = { fps: 15, qrbox: { width: 250, height: 250 } };

        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
                // Éxito: Limpiar texto de protocolos si vienen de URLs (ej: https://.../ID-123 -> ID-123)
                const finalCode = decodedText.split('/').pop();
                const targetInput = document.getElementById('os-target-code');
                if (targetInput) {
                    targetInput.value = finalCode;
                    window.onOSTargetChange();
                }
                UI.toast(`Activo detectado: ${finalCode}`, 'success');
                
                // Detener y cerrar automáticamente
                html5QrCode.stop().then(() => {
                    // Cerrar el modal buscando el botón de confirmación
                    const closeBtn = document.querySelector('.modal-container button');
                    if (closeBtn) closeBtn.click();
                }).catch(err => console.error(err));
            },
            (errorMessage) => { /* buscando... */ }
        ).catch(err => {
            const container = document.getElementById('qr-reader');
            if (container) container.innerHTML = `<div class="p-6 text-center text-destructive font-medium">Error de cámara: ${err}</div>`;
            console.error(err);
        });
    }, 500); // Pequeño delay para asegurar que el DOM del modal esté listo
};
window.exportPurchasesExcel = async function() {
    UI.loading('Preparando datos...');
    try {
        const data = await fetch('api/purchases.php').then(r => r.json());
        const exportData = (data.purchases || []).map(p => ({
            'N° OC/OS': p.numero_oc,
            'Tipo': p.tipo === 'servicio' ? 'Servicio' : 'Compra',
            'Proveedor': p.proveedor_nombre,
            'Área': p.area_nombre || 'Sin área',
            'Fecha': p.fecha,
            'Monto Base': parseFloat(p.total).toFixed(2),
            'Movilidad': parseFloat(p.monto_movilidad).toFixed(2),
            'Total General': (parseFloat(p.total) + parseFloat(p.monto_movilidad)).toFixed(2),
            'Estado': p.estado,
            'Aprob. Gerente': p.aprobado_gerente ? 'SÍ' : 'NO',
            'Aprob. Finanzas': p.aprobado_finanzas ? 'SÍ' : 'NO',
            'Pagado': p.pagado == 1 ? 'SÍ' : 'NO'
        }));
        UI.exportToExcel(exportData, 'Historial_Compras_Servicios.xlsx');
    } catch(e) { UI.toast('Error al exportar', 'error'); }
    finally { UI.stopLoading(); }
};
