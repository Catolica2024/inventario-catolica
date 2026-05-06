window.Views = window.Views || {};

// ---- NUEVA ORDEN DE COMPRA ----
let _ocSuppliers = [];
let _ocLocations = [];
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
              <select id="oc-condicion" class="select mt-1 w-full">
                <option value="Al contado">Al contado</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Credito">Crédito</option>
              </select>
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
            <div class="flex justify-between"><span class="text-muted-foreground">IGV (18%)</span><span id="oc-igv" class="font-medium">0.00</span></div>
            <div class="flex justify-between border-t border-border pt-2 mt-2"><span class="font-bold">Total</span><span id="oc-total" class="font-bold text-lg text-primary">0.00</span></div>
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
    </div>`;
};

window.Views['new-purchase'].afterMount = async function() {
  const [suppData, locData] = await Promise.all([
    fetch('api/suppliers.php').then(r => r.json()).catch(() => ({ suppliers: [] })),
    fetch('api/locations.php').then(r => r.json()).catch(() => ({ locations: [] }))
  ]);
  _ocSuppliers = suppData.suppliers || [];
  _ocLocations = locData.locations || [];

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
  _ocLocations.forEach(l => {
    const o = document.createElement('option');
    o.value = l.nombre;
    o.textContent = l.nombre + (l.tipo ? ' (' + l.tipo + ')' : '');
    areaSel.appendChild(o);
  });

  // Fecha requerida por defecto: hoy + 7 días
  const def = new Date(); def.setDate(def.getDate() + 7);
  document.getElementById('oc-fecha-req').value = def.toISOString().split('T')[0];

  _ocItemRows = 0;
  addOCItem(); // Agregar primera fila vacía
  lucide.createIcons();
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
    <td><input class="input w-full text-sm" id="oc-desc-${n}" placeholder="Descripción del producto/servicio"></td>
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
  let subtotal = 0;
  for (let i = 1; i <= _ocItemRows; i++) {
    const el = document.getElementById(`oc-total-${i}`);
    if (el) subtotal += parseFloat(el.textContent || 0);
  }
  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  document.getElementById('oc-subtotal').textContent = moneda + ' ' + subtotal.toFixed(2);
  document.getElementById('oc-igv').textContent = moneda + ' ' + igv.toFixed(2);
  document.getElementById('oc-total').textContent = moneda + ' ' + total.toFixed(2);
}

function getOCItems() {
  const items = [];
  for (let i = 1; i <= _ocItemRows; i++) {
    const desc = document.getElementById(`oc-desc-${i}`)?.value?.trim();
    if (!desc) continue;
    const qty = parseFloat(document.getElementById(`oc-qty-${i}`)?.value || 0);
    const pu = parseFloat(document.getElementById(`oc-pu-${i}`)?.value || 0);
    items.push({ descripcion: desc, unidad: document.getElementById(`oc-unidad-${i}`)?.value || 'Unidad', cantidad: qty, precio_unitario: pu, total: qty * pu });
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
  const body = {
    usuario_id: user?.id,
    tipo,
    proveedor_id,
    fecha: new Date().toISOString().split('T')[0],
    area_solicitante: area,
    moneda: document.getElementById('oc-moneda').value,
    condicion_pago: document.getElementById('oc-condicion').value,
    fecha_requerida: fecha_req,
    observaciones: document.getElementById('oc-observaciones').value.trim(),
    items
  };

  const loader = document.createElement('div');
  loader.className = 'loading-overlay';
  loader.innerHTML = '<div class="spinner"></div><div class="font-bold text-lg">Generando Documento...</div>';
  document.body.appendChild(loader);

  try {
    const resp = await fetch('api/purchases.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const res = await resp.json();
    loader.remove();

    if (!res.ok) { UI.toast('Error: ' + res.error, 'error'); return; }

    const numero_oc = res.numero_oc;
    UI.toast('Documento ' + numero_oc + ' generado con éxito', 'success');

    document.getElementById('oc-numero-badge').classList.remove('hidden');
    document.getElementById('oc-numero-text').textContent = numero_oc;
    document.getElementById('oc-drive-btn').classList.remove('hidden');

    window._lastOC = { numero_oc, sup, area, body, items, res };
    generateOCPDF(numero_oc, sup, area, body, items);

  } catch { 
    loader.remove(); 
    UI.toast('Error de conexión', 'error'); 
  }
};

window.generateOCPDF = function(numero_oc, sup, area, body, items) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const BLUE = [27, 92, 255];
  const isServicio = body.tipo === 'servicio';
  const docTitle = isServicio ? 'ORDEN DE SERVICIO' : 'ORDEN DE COMPRA';
  const DARK = [15, 23, 42];
  const GRAY = [100, 116, 139];
  const LGRAY = [241, 245, 249];
  const W = 210;

  const img = new Image();
  img.src = 'assets/images/icono.png';
  try {
    doc.addImage(img, 'PNG', 12, 10, 25, 25);
  } catch(e) {}
  
  doc.setTextColor(...BLUE);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CATÓLICA SCHOOL', 45, 18);
  
  doc.setTextColor(59, 130, 246);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Explora · Descubre · Aprende', 45, 24);

  doc.setTextColor(...GRAY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('RUC: 20515381539', 45, 30);
  doc.text('Dirección: VII Etapa, C. San Pedro Clavers 1582, Carabayllo 15318', 45, 35);
  doc.text('Tel: +51 982 784 498 | compras@colegiolacatolica.edu.pe', 45, 40);

  doc.setTextColor(...DARK);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(docTitle, 105, 35, { align: 'center' });
  doc.setFontSize(14);
  doc.text(numero_oc, 105, 43, { align: 'center' });

  let y = 60;

  doc.setFillColor(...LGRAY);
  doc.rect(10, y, 88, 5, 'F');
  doc.rect(112, y, 88, 5, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL PROVEEDOR', 14, y + 3.5);
  doc.text('DATOS DE LA SOLICITUD', 116, y + 3.5);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.setFontSize(8);
  const supLines = [
    ['Razón Social:', sup?.razon_social || '—'],
    ['RUC/DNI:', sup?.ruc || '—'],
    ['Dirección:', sup?.direccion || '—'],
    ['Teléfono:', sup?.telefono || '—'],
    ['Contacto:', sup?.contacto || '—'],
  ];
  const reqLines = [
    ['Área solicitante:', area],
    ['Condición de pago:', body.condicion_pago],
    ['Moneda:', body.moneda === 'PEN' ? 'Soles (S/)' : body.moneda],
    ['Fecha requerida:', body.fecha_requerida || '—'],
    ['Fecha de emisión:', body.fecha],
  ];
  supLines.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, 14, y + i * 6);
    doc.setFont('helvetica', 'normal'); doc.text(String(v), 42, y + i * 6);
  });
  reqLines.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold'); doc.text(k, 116, y + i * 6);
    doc.setFont('helvetica', 'normal'); doc.text(String(v), 148, y + i * 6);
  });
  y += supLines.length * 6 + 10;

  const monSym = body.moneda === 'PEN' ? 'S/' : (body.moneda === 'USD' ? '$' : '€');
  doc.autoTable({
    startY: 105,
    head: [[ '#', 'Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Total' ]],
    body: items.map((it, i) => [ i + 1, it.descripcion, it.unidad, it.cantidad, monSym + ' ' + parseFloat(it.precio_unitario).toFixed(2), monSym + ' ' + parseFloat(it.total).toFixed(2) ]),
    headStyles: { fillColor: BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: { 0:{cellWidth:8,halign:'center'}, 3:{halign:'center'}, 4:{halign:'right'}, 5:{halign:'right'} },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 6;

  // Totales (derecha)
  const subtotal = items.reduce((a, it) => a + parseFloat(it.total || 0), 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;
  const totX = 130;
  doc.setFillColor(...LGRAY);
  doc.rect(totX, y, 70, 22, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
  doc.text('Subtotal:', totX + 4, y + 6);
  doc.text('IGV (18%):', totX + 4, y + 12);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('TOTAL:', totX + 4, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(monSym + ' ' + subtotal.toFixed(2), W - 14, y + 6, { align: 'right' });
  doc.text(monSym + ' ' + igv.toFixed(2), W - 14, y + 12, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.setTextColor(...BLUE);
  doc.text(monSym + ' ' + total.toFixed(2), W - 14, y + 19, { align: 'right' });

  y += 30;

  // Observaciones si existen
  if (body.observaciones) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
    doc.text('OBSERVACIONES / SUSTENTO:', 10, y - 5);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
    const splitObs = doc.splitTextToSize(body.observaciones, 190);
    doc.text(splitObs, 10, y);
    y += (splitObs.length * 4) + 10;
  }

  // Firmas
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
  const firmaY = Math.min(y + 10, 250);
  [['Solicitante', 50], ['V°B° Jefe de Área', 105], ['Aprobado por', 160]].forEach(([label, x]) => {
    doc.line(x, firmaY + 12, x + 40, firmaY + 12);
    doc.text(label, x + 20, firmaY + 17, { align: 'center' });
  });

  // Footer
  doc.setFillColor(...BLUE);
  doc.rect(0, 287, W, 10, 'F');
  doc.setTextColor(255,255,255); doc.setFontSize(7);
  doc.text('Católica School · Sistema de Gestión de Inventario · ' + numero_oc, W/2, 293, { align: 'center' });

  // Guardar PDF
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
      moneda: oc.moneda,
      fecha_requerida: oc.fecha_requerida,
      fecha: oc.fecha,
      observaciones: oc.observaciones
    };

    const doc = window.generateOCPDF(oc.numero_oc, sup, oc.area_solicitante, body, oc.items, false); // false para no descargar automáticamente
    
    // Llamar a Drive inmediatamente para que el navegador lo vea como acción del usuario
    window.exportToDrive(doc, oc.numero_oc);

  } catch (e) {
    UI.toast('Error: ' + e.message, 'error');
  }
};
