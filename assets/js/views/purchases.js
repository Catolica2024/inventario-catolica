window.Views = window.Views || {};

// ---- NUEVA ORDEN DE COMPRA ----
let _ocSuppliers = [];
let _ocAreas = [];
let _ocInventoryItems = [];
let _ocItemRows = 0;

window.Views['new-purchase'] = function() {
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
              <select id="oc-tipo" class="select mt-1 w-full" onchange="updateOCTypeLabels()">
                <option value="compra">Orden de Compra (OC)</option>
                <option value="servicio">Orden de Servicio (OS)</option>
              </select>
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
            <div class="flex items-center gap-2 pt-6">
              <input type="checkbox" id="oc-precios-con-igv" class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" onchange="recalcOCTotals()">
              <label for="oc-precios-con-igv" class="text-sm font-medium cursor-pointer">Los precios ya incluyen IGV</label>
            </div>
            <div class="md:col-span-2">
              <label class="text-sm font-medium">Observaciones / Sustento <span class="text-xs text-muted-foreground">(opcional)</span></label>
              <textarea id="oc-observaciones" class="input mt-1 w-full h-20 resize-none" placeholder="Escriba aquí el sustento o notas adicionales para la compra..."></textarea>
            </div>
          </div>
        </div>

        <!-- Ítems de la OC -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2"><i data-lucide="list" class="w-4 h-4 text-primary"></i>Detalle de la compra</h3>
            <button class="btn btn-outline btn-sm" onclick="addOCItem()"><i data-lucide="plus" class="w-4 h-4"></i>Agregar ítem</button>
          </div>
          <div class="overflow-x-auto">
            <table class="data w-full text-sm" id="oc-items-table">
              <thead>
                <tr>
                  <th class="w-8">#</th>
                  <th>Descripción</th>
                  <th class="w-28">Unidad</th>
                  <th class="w-24">Cantidad</th>
                  <th class="w-32">Precio Unit.</th>
                  <th class="w-32 text-right">Total</th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody id="oc-items-body">
                <tr id="oc-empty-row"><td colspan="7" class="text-center py-6 text-muted-foreground">Agrega al menos un ítem para continuar.</td></tr>
              </tbody>
            </table>
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
            <div class="flex justify-between border-t border-border pt-2 mt-2"><span class="font-bold">Total</span><span id="oc-total" class="font-bold text-lg text-primary">0.00</span></div>
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
    </datalist>`;
};

window.Views['new-purchase'].afterMount = async function() {
  const [suppData, areaData, invData] = await Promise.all([
    fetch('api/suppliers.php').then(r => r.json()).catch(() => ({ suppliers: [] })),
    fetch('api/areas.php').then(r => r.json()).catch(() => ({ areas: [] })),
    fetch('api/items.php').then(r => r.json()).catch(() => ({ items: [] }))
  ]);
  _ocSuppliers = suppData.suppliers || [];
  _ocAreas = areaData.areas || [];
  _ocInventoryItems = invData.items || [];

  // Poblar datalist de ítems
  const datalist = document.getElementById('inventory-items');
  if (datalist) {
    _ocInventoryItems.forEach(it => {
        const o = document.createElement('option');
        o.value = it.nombre;
        o.textContent = `${it.codigo} - ${it.marca || ''}`;
        datalist.appendChild(o);
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
  supSel.addEventListener('change', function() {
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
  lucide.createIcons();
};

window.toggleCreditDetails = function() {
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

window.addOCItem = function() {
  const empty = document.getElementById('oc-empty-row');
  if (empty) empty.remove();
  _ocItemRows++;
  const n = _ocItemRows;
  const tbody = document.getElementById('oc-items-body');
  const tr = document.createElement('tr');
  tr.id = `oc-row-${n}`;
  tr.innerHTML = `
    <td class="text-center text-muted-foreground text-xs">${n}</td>
    <td><input class="input w-full text-sm" id="oc-desc-${n}" list="inventory-items" placeholder="Buscar en inventario o escribir libre..." onchange="onItemSelect(${n})"></td>
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

window.onItemSelect = function(n) {
    const input = document.getElementById(`oc-desc-${n}`);
    const val = input.value;
    const item = _ocInventoryItems.find(it => it.nombre === val);
    if (item) {
        input.dataset.itemId = item.id;
        // Si tiene unidad, ponerla (asumiendo que items tiene unidad o valor por defecto)
        // Por ahora lo dejamos libre pero marcamos el ID
        UI.toast(`Ítem vinculado: ${item.codigo}`, 'info');
    } else {
        delete input.dataset.itemId;
    }
};

window.removeOCItem = function(n) {
  document.getElementById(`oc-row-${n}`)?.remove();
  recalcOCTotals();
  if (!document.getElementById('oc-items-body').querySelector('tr')) {
    const tbody = document.getElementById('oc-items-body');
    tbody.innerHTML = '<tr id="oc-empty-row"><td colspan="7" class="text-center py-6 text-muted-foreground">Agrega al menos un ítem para continuar.</td></tr>';
  }
};

window.recalcOCRow = function(n) {
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
  for (let i = 1; i <= _ocItemRows; i++) {
    const el = document.getElementById(`oc-desc-${i}`);
    const desc = el?.value?.trim();
    if (!desc) continue;
    const qty = parseFloat(document.getElementById(`oc-qty-${i}`)?.value || 0);
    const pu = parseFloat(document.getElementById(`oc-pu-${i}`)?.value || 0);
    items.push({ 
        item_id: el.dataset.itemId || null,
        descripcion: desc, 
        unidad: document.getElementById(`oc-unidad-${i}`)?.value || 'Unidad', 
        cantidad: qty, 
        precio_unitario: pu, 
        total: qty * pu 
    });
  }
  return items;
}

window.generateOC = async function() {
  const proveedor_id = document.getElementById('oc-proveedor').value;
  const area = document.getElementById('oc-area').value;
  const fecha_req = document.getElementById('oc-fecha-req').value;
  if (!proveedor_id) { UI.toast('Seleccione un proveedor', 'error'); return; }
  if (!area) { UI.toast('Seleccione el área solicitante', 'error'); return; }
  const items = getOCItems();
  if (items.length === 0) { UI.toast('Agregue al menos un ítem', 'error'); return; }

  const tipo = document.getElementById('oc-tipo').value;
  const sup = _ocSuppliers.find(s => s.id == proveedor_id);
  const user = Auth.getUser();
  const cond = document.getElementById('oc-condicion').value;
  const cTipo = document.getElementById('oc-credito-tipo').value;
  const cVal = document.getElementById('oc-condicion-val').value;
  
  // Calcular total localmente para evitar errores de lectura del DOM
  const porcIgv = parseFloat(document.getElementById('oc-igv-porcentaje').value || 18) / 100;
  const incluido = document.getElementById('oc-precios-con-igv').checked;
  const base = items.reduce((a, it) => a + (parseFloat(it.total) || 0), 0);
  let totalCalculado;
  if (incluido) {
    totalCalculado = base;
  } else {
    totalCalculado = base * (1 + porcIgv);
  }

  let condDetalle = '';
  if (cond === 'Credito' && cVal) {
    condDetalle = cTipo === 'Dias' ? `${cVal} días` : `${cVal} cuotas`;
  }

  const adelantoPorc = cond === 'Adelanto + Saldo' ? (parseFloat(document.getElementById('oc-adelanto-porc').value) || 0) : null;
  const adelantoMonto = adelantoPorc !== null ? (totalCalculado * (adelantoPorc / 100)) : null;
  const saldoMonto = adelantoPorc !== null ? (totalCalculado - adelantoMonto) : null;

  const payload = {
    tipo,
    usuario_id: user?.id,
    proveedor_id,
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
    observaciones: document.getElementById('oc-observaciones').value.trim(),
    items
  };

  if (cond === 'Adelanto + Saldo' && (adelantoPorc <= 0 || adelantoPorc >= 100)) {
    UI.toast('El porcentaje de adelanto debe estar entre 1 y 99', 'warning');
    loader.remove();
    return;
  }

  const loader = document.createElement('div');
  loader.className = 'loading-overlay';
  loader.innerHTML = '<div class="spinner"></div><div class="font-bold text-lg">Generando Documento...</div>';
  document.body.appendChild(loader);

  try {
    const resp = await fetch('api/purchases.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const res = await resp.json();
    loader.remove();

    if (!res.ok) { UI.toast('Error: ' + res.error, 'error'); return; }

    const numero_oc = res.numero_oc;
    UI.toast('Documento ' + numero_oc + ' generado con éxito', 'success');

    document.getElementById('oc-numero-badge').classList.remove('hidden');
    document.getElementById('oc-numero-text').textContent = numero_oc;
    document.getElementById('oc-drive-btn').classList.remove('hidden');

    window._lastOC = { numero_oc, sup, area_id: area, body: payload, items, res };
    const areaNombre = _ocAreas.find(a => a.id == area)?.nombre || area;
    generateOCPDF(numero_oc, sup, areaNombre, payload, items);

  } catch { 
    loader.remove(); 
    UI.toast('Error de conexión', 'error'); 
  }
};

window.updateOCTypeLabels = function() {
  const tipo = document.getElementById('oc-tipo').value;
  const title = document.querySelector('#view h1');
  if (title) {
    title.textContent = tipo === 'servicio' ? 'Nueva Orden de Servicio' : 'Nueva Orden de Compra';
  }
};

window.generateOCPDF = function(numero_oc, sup, area, body, items) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;

  // --- PALETA DE COLORES ---
  const C_NAVY   = [18, 52, 120];   // Azul marino oscuro
  const C_BLUE   = [27, 92, 255];   // Azul primario
  const C_LGRAY  = [245, 247, 252]; // Gris muy claro
  const C_MGRAY  = [220, 225, 235]; // Gris medio
  const C_DARK   = [20, 20, 40];    // Casi negro
  const C_GRAY   = [100, 110, 130]; // Gris texto
  const C_WHITE  = [255, 255, 255];
  const C_GREEN  = [22, 163, 74];

  // --- CÁLCULOS PREVIOS ---
  const isServicio = body.tipo === 'servicio';
  const docTitle   = isServicio ? 'ORDEN DE SERVICIO' : 'ORDEN DE COMPRA';
  const monSym     = body.moneda === 'PEN' ? 'S/' : (body.moneda === 'USD' ? '$' : '\u20ac');
  const porcIgv    = parseFloat(body.igv_porcentaje || 18) / 100;
  const incluido   = !!body.precios_con_igv;
  const base       = items.reduce((a, it) => a + parseFloat(it.total || 0), 0);
  let subtotal, igv, total;
  if (incluido) {
    total = base; subtotal = total / (1 + porcIgv); igv = total - subtotal;
  } else {
    subtotal = base; igv = subtotal * porcIgv; total = subtotal + igv;
  }

  // =============================================
  // CABECERA: Barra azul marina + datos empresa
  // =============================================
  doc.setFillColor(...C_NAVY);
  doc.rect(0, 0, W, 42, 'F');
  // Acento decorativo derecho
  doc.setFillColor(...C_BLUE);
  doc.rect(W - 70, 0, 70, 42, 'F');

  // Logo
  const img = new Image();
  img.src = 'assets/images/icono.png';
  try { doc.addImage(img, 'PNG', 8, 6, 28, 22); } catch(e) {}

  // Nombre empresa
  doc.setTextColor(...C_WHITE);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('CAT\u00d3LICA SCHOOL', 40, 15);
  doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.text('Explora \u00b7 Descubre \u00b7 Aprende', 40, 21);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text('RUC: 20515381539', 40, 27);
  doc.text('VII Etapa, C. San Pedro Clavers 1582, Carabayllo 15318', 40, 32);
  doc.text('Tel: +51 982 784 498  |  compras@colegiolacatolica.edu.pe', 40, 37);

  // Título OC/OS (derecha, sobre fondo azul primario)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(docTitle, W - 8, 18, { align: 'right' });
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(numero_oc, W - 8, 26, { align: 'right' });

  // Fecha emisión en la cabecera
  const fechaEmision = body.fecha ? new Date(body.fecha + 'T12:00:00').toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' }) : new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' });
  doc.setFontSize(7);
  doc.text('Fecha de emisi\u00f3n: ' + fechaEmision, W - 8, 35, { align: 'right' });

  // =============================================
  // SECCIONES: Proveedor + Solicitud
  // =============================================
  let y = 52;

  // Dibuja un bloque de datos con borde y título
  function drawDataBlock(title, lines, x, bw, startY) {
    doc.setFillColor(...C_NAVY);
    doc.rect(x, startY, bw, 6, 'F');
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text(title, x + 3, startY + 4);

    // Borde exterior
    doc.setDrawColor(...C_MGRAY);
    doc.setLineWidth(0.3);
    const rowH = 5.5;
    const blockH = lines.length * rowH + 2;
    doc.rect(x, startY + 6, bw, blockH);

    lines.forEach(([k, v], i) => {
      const ry = startY + 6 + 2 + i * rowH;
      if (i % 2 === 0) {
        doc.setFillColor(...C_LGRAY);
        doc.rect(x, startY + 6 + i * rowH, bw, rowH, 'F');
      }
      doc.setTextColor(...C_GRAY); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text(k, x + 2, ry);
      doc.setTextColor(...C_DARK); doc.setFont('helvetica', 'normal');
      doc.text(String(v || '\u2014'), x + bw * 0.42, ry);
    });
    return startY + 6 + lines.length * rowH + 4;
  }

  const condPagoText = body.condicion_pago + (body.condicion_detalle ? ` (${body.condicion_detalle})` : '');
  const fechaReq = body.fecha_requerida ? new Date(body.fecha_requerida + 'T12:00:00').toLocaleDateString('es-PE', {day:'2-digit', month:'long', year:'numeric'}) : '\u2014';

  const supLines = [
    ['Raz\u00f3n Social:', sup?.razon_social || '\u2014'],
    ['RUC / DNI:', sup?.ruc || '\u2014'],
    ['Direcci\u00f3n:', sup?.direccion || '\u2014'],
    ['Tel\u00e9fono:', sup?.telefono || '\u2014'],
    ['Contacto:', sup?.contacto || '\u2014'],
  ];
  const reqLines = [
    ['\u00c1rea Solicitante:', area],
    ['Condici\u00f3n de Pago:', condPagoText],
    ['Moneda:', body.moneda === 'PEN' ? 'Soles (S/)' : body.moneda],
    ['Fecha Requerida:', fechaReq],
    ['Fecha de Emisi\u00f3n:', fechaEmision],
  ];

  const blockW = 92;
  const endY1 = drawDataBlock('DATOS DEL PROVEEDOR', supLines, 10, blockW, y);
  const endY2 = drawDataBlock('DATOS DE LA SOLICITUD', reqLines, W - 10 - blockW, blockW, y);
  y = Math.max(endY1, endY2) + 4;

  // Nota de adelanto (si aplica)
  if (body.condicion_pago === 'Adelanto + Saldo') {
    const aPorc = body.adelanto_porcentaje || 0;
    const aMonto = parseFloat(body.adelanto_monto || 0);
    const sMonto = parseFloat(body.saldo_monto || 0);
    doc.setFillColor(239, 246, 255);
    doc.rect(10, y, W - 20, 8, 'F');
    doc.setDrawColor(...C_BLUE);
    doc.setLineWidth(0.5);
    doc.line(10, y, 10, y + 8);
    doc.setTextColor(...C_BLUE); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.text(`PAGO INICIAL (Adelanto ${aPorc}%): ${monSym} ${aMonto.toFixed(2)}   /   SALDO PENDIENTE: ${monSym} ${sMonto.toFixed(2)}`, 14, y + 5);
    y += 11;
  }

  // Nota de cuotas (si aplica)
  if (body.condicion_detalle && body.condicion_detalle.includes('cuotas')) {
    const numC = parseInt(body.condicion_detalle);
    if (numC > 1) {
      const cuotaMonto = total / numC;
      doc.setFillColor(239, 246, 255);
      doc.rect(10, y, W - 20, 6, 'F');
      doc.setDrawColor(...C_BLUE);
      doc.setLineWidth(0.5);
      doc.line(10, y, 10, y + 6);
      doc.setTextColor(...C_BLUE); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text(`Pago en ${numC} cuotas de ${monSym} ${cuotaMonto.toFixed(2)} c/u`, 14, y + 4);
      y += 9;
    }
  }

  // =============================================
  // TABLA DE ITEMS
  // =============================================
  doc.autoTable({
    startY: y,
    head: [['#', 'Descripci\u00f3n / Detalle', 'Unidad', 'Cant.', `P. Unit. (${monSym})`, `Total (${monSym})`]],
    body: items.map((it, i) => [
      i + 1,
      it.descripcion,
      it.unidad,
      it.cantidad,
      parseFloat(it.precio_unitario).toFixed(2),
      parseFloat(it.total).toFixed(2)
    ]),
    headStyles: { fillColor: C_NAVY, textColor: C_WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: C_DARK, valign: 'middle' },
    alternateRowStyles: { fillColor: C_LGRAY },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    theme: 'grid',
    tableLineColor: C_MGRAY,
    tableLineWidth: 0.2,
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Footer en cada página
      doc.setFillColor(...C_NAVY);
      doc.rect(0, H - 10, W, 10, 'F');
      doc.setFillColor(...C_BLUE);
      doc.rect(0, H - 10, 4, 10, 'F');
      doc.setTextColor(...C_WHITE); doc.setFontSize(7);
      doc.text(`Cat\u00f3lica School  \u00b7  Sistema de Gesti\u00f3n de Inventario  \u00b7  ${numero_oc}`, W / 2, H - 4.5, { align: 'center' });
    }
  });

  y = doc.lastAutoTable.finalY + 5;

  // =============================================
  // CAJA DE TOTALES
  // =============================================
  const totX = W - 80;
  const totW = 70;

  // Subtotal row
  doc.setFillColor(...C_LGRAY);
  doc.rect(totX, y, totW, 7, 'F');
  doc.setDrawColor(...C_MGRAY); doc.setLineWidth(0.2);
  doc.rect(totX, y, totW, 7);
  doc.setTextColor(...C_GRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Subtotal:', totX + 3, y + 4.8);
  doc.text(`${monSym} ${subtotal.toFixed(2)}`, totX + totW - 3, y + 4.8, { align: 'right' });
  y += 7;

  // IGV row
  doc.setFillColor(...C_LGRAY);
  doc.rect(totX, y, totW, 7, 'F');
  doc.rect(totX, y, totW, 7);
  const igvLabel = incluido ? `IGV (${body.igv_porcentaje || 18}%) Incl.` : `IGV (${body.igv_porcentaje || 18}%)`;
  doc.text(igvLabel + ':', totX + 3, y + 4.8);
  doc.text(`${monSym} ${igv.toFixed(2)}`, totX + totW - 3, y + 4.8, { align: 'right' });
  y += 7;

  // TOTAL row (destacado)
  doc.setFillColor(...C_NAVY);
  doc.rect(totX, y, totW, 9, 'F');
  doc.setTextColor(...C_WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('TOTAL:', totX + 3, y + 6);
  doc.text(`${monSym} ${total.toFixed(2)}`, totX + totW - 3, y + 6, { align: 'right' });
  y += 12;

  // =============================================
  // OBSERVACIONES
  // =============================================
  if (body.observaciones) {
    doc.setFillColor(255, 251, 235);
    const obsLines = doc.splitTextToSize(body.observaciones, W - 24);
    const obsH = obsLines.length * 4.5 + 8;
    doc.rect(10, y, W - 20, obsH, 'F');
    doc.setDrawColor(253, 186, 116); doc.setLineWidth(0.4);
    doc.line(10, y, 10, y + obsH);
    doc.setTextColor(146, 64, 14); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text('OBSERVACIONES / SUSTENTO:', 14, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_DARK);
    doc.text(obsLines, 14, y + 10);
    y += obsH + 6;
  }

  // =============================================
  // FIRMAS
  // =============================================
  const firmaY = Math.min(y + 8, 248);
  const firmas = [['Solicitante', 15], ['V\u00b0B\u00b0 Jefe de \u00c1rea', 80], ['Gerencia General', 148]];
  firmas.forEach(([lbl, x]) => {
    const fw = 50;
    doc.setFillColor(...C_LGRAY);
    doc.rect(x, firmaY, fw, 18, 'F');
    doc.setDrawColor(...C_MGRAY); doc.setLineWidth(0.3);
    doc.rect(x, firmaY, fw, 18);
    // Línea de firma
    doc.setDrawColor(...C_BLUE);
    doc.line(x + 4, firmaY + 12, x + fw - 4, firmaY + 12);
    doc.setTextColor(...C_GRAY); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text(lbl, x + fw / 2, firmaY + 16, { align: 'center' });
  });

  // =============================================
  // FOOTER (ya se dibuja en didDrawPage)
  // =============================================

  if (arguments[5] !== false) doc.save(numero_oc + '.pdf');
  window._lastOCDoc = doc;
  window._lastOCNumero = numero_oc;
  return doc;
}

// Google Drive export
const DRIVE_CLIENT_ID = '180581650294-1hq62hvc88ucednj1a4ksbccaj6vfhdg.apps.googleusercontent.com';
const DRIVE_FOLDER_ID = '1SM2SDdbypPMkNN-VAAyA5q9WSkszWjSs';

window.exportToDrive = function(specificDoc, specificName) {
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
      UI.toast('Subiendo a Drive...', 'info');
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
          if (resp.ok) UI.toast('PDF exportado a Google Drive', 'success');
          else {
              const err = await resp.json();
              console.error('Drive Error:', err);
              UI.toast('Error al exportar: ' + (err.error?.message || 'Error desconocido'), 'error');
          }
      } catch (e) {
          UI.toast('Error de red al subir a Drive', 'error');
      }
    }
  }).requestAccessToken();
};

window.exportOCById = async function(id) {
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
      observaciones: oc.observaciones
    };

    const doc = window.generateOCPDF(oc.numero_oc, sup, oc.area_nombre, body, oc.items, false); // false para no descargar automáticamente
    
    // Llamar a Drive inmediatamente para que el navegador lo vea como acción del usuario
    window.exportToDrive(doc, oc.numero_oc);

  } catch (e) {
    UI.toast('Error: ' + e.message, 'error');
  }
};
