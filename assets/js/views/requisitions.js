window.Views = window.Views || {};

let _reqAreas = [];
let _reqItemCount = 0;
let _allRequisitions = [];

// ── VISTA PRINCIPAL: DASHBOARD DE REQUISICIONES ──
window.Views.requisitions = function () {
  const user = window.Auth.getUser();
  const isComprador = user?.role === 'comprador' || user?.role === 'admin';

  return `
    ${UI.pageHeader('Gestión de Requisiciones', 'Solicitud de adquisiciones para tu área', `
      <div class="flex gap-2">
        ${!isComprador ? `
          <button class="btn btn-primary" onclick="Router.go('new-requisition')">
            <i data-lucide="plus" class="w-4 h-4 mr-2"></i>Nueva Requisición
          </button>
        ` : ''}
      </div>
    `)}

    <!-- Pestañas dinámicas según Rol -->
    <div class="mb-6 bg-white p-1 rounded-xl border border-slate-200 flex gap-1 w-fit shadow-sm">
      <button id="tab-mis-solicitudes" class="tab-req-btn px-5 py-2 text-xs font-bold rounded-lg transition-all bg-primary text-white" onclick="switchRequisitionsTab('mis-solicitudes')">
        <span class="flex items-center gap-1.5">
          <i data-lucide="${isComprador ? 'inbox' : 'clipboard-list'}" class="w-3.5 h-3.5"></i>
          ${isComprador ? 'Bandeja de Requisiciones' : 'Mis Solicitudes'}
        </span>
      </button>
      <button id="tab-por-aprobar" class="tab-req-btn hidden px-5 py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:bg-slate-100" onclick="switchRequisitionsTab('por-aprobar')">
        <span class="flex items-center gap-1.5">
          <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
          Por Aprobar (Sub-Áreas)
          <span id="badge-por-aprobar-count" class="hidden ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-red-500 text-white rounded-full">0</span>
        </span>
      </button>
    </div>

    <!-- Tabla de Solicitudes -->
    <div class="card p-5">
      <div class="table-container">
        <table class="data w-full">
          <thead>
            <tr>
              <th>Código</th>
              <th>Área</th>
              <th>Creado por</th>
              <th>Envío / Entrega</th>
              <th>Presupuesto</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="requisitions-table-body">
            <tr><td colspan="7" class="text-center py-10 text-slate-400">Cargando requisiciones...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
};

window.switchRequisitionsTab = function (tab) {
  document.querySelectorAll('.tab-req-btn').forEach(btn => {
    btn.classList.remove('bg-primary', 'text-white');
    btn.classList.add('text-slate-600', 'hover:bg-slate-100');
  });
  const activeBtn = document.getElementById(`tab-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-primary', 'text-white');
    activeBtn.classList.remove('text-slate-600', 'hover:bg-slate-100');
  }
  renderRequisitions(tab);
};

async function loadRequisitions() {
  const tbody = document.getElementById('requisitions-table-body');
  if (!tbody) return;

  try {
    const user = Auth.getUser();

    // Cargar áreas para determinar jerarquía
    const areasResp = await fetch('api/areas.php').then(r => r.json());
    _reqAreas = areasResp.areas || [];

    // Si es el Jefe de Pedagogía, mostrar la pestaña "Por Aprobar" de las sub-áreas
    const esDirectorPedagogia = user?.role === 'jefe_area' && user?.area_nombre === 'Pedagogía';
    if (esDirectorPedagogia) {
      const porAprobarTab = document.getElementById('tab-por-aprobar');
      if (porAprobarTab) porAprobarTab.classList.remove('hidden');
    }

    // Cargar únicamente requisiciones
    const data = await fetch('api/purchases.php?requisitions_only=1').then(r => r.json());
    _allRequisitions = data.purchases || [];

    // Badge de pendientes para el Director de Pedagogía
    if (esDirectorPedagogia) {
      const pending = _allRequisitions.filter(p => p.estado === 'Req_Pendiente_Area').length;
      const badge = document.getElementById('badge-por-aprobar-count');
      if (badge) {
        badge.textContent = pending;
        if (pending > 0) badge.classList.remove('hidden');
        else badge.classList.add('hidden');
      }
    }

    renderRequisitions('mis-solicitudes');
  } catch (e) {
    console.error(e);
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-red-400">Error al cargar datos.</td></tr>';
  }
}

function renderRequisitions(tab) {
  const tbody = document.getElementById('requisitions-table-body');
  if (!tbody) return;

  const user = window.Auth.getUser();
  const isAdmin = user?.role === 'admin';
  const isComprador = user?.role === 'comprador' || isAdmin;

  const esDirectorPedagogia = user?.role === 'jefe_area' && user?.area_nombre === 'Pedagogía';
  let filtered = [];

  if (isAdmin) {
    // El administrador ve todas las requisiciones de todos, incluyendo pendientes de área, bandeja de compras y rechazados
    filtered = _allRequisitions;
  } else if (tab === 'por-aprobar') {
    // Si es el Director de Pedagogía, le salen todas las requisiciones pendientes de aprobación de área
    filtered = _allRequisitions.filter(p => p.estado === 'Req_Pendiente_Area');
  } else if (isComprador) {
    filtered = _allRequisitions.filter(p => p.estado === 'Req_Pendiente_Compras');
  } else {
    filtered = _allRequisitions.filter(p => String(p.creado_por) === String(user?.id));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-14 text-slate-400">
      <div class="flex flex-col items-center gap-3">
        <i data-lucide="inbox" class="w-10 h-10 text-slate-300"></i>
        <span class="text-sm">No hay requisiciones en esta sección.</span>
      </div>
    </td></tr>`;
    lucide.createIcons();
    return;
  }

  const badgeMap = {
    'Req_Pendiente_Area':    { label: 'Falta Firma Área',      cls: 'badge-yellow', icon: 'clock' },
    'Req_Pendiente_Compras': { label: 'En Bandeja de Compras', cls: 'badge-indigo', icon: 'truck' },
    'Req_Rechazada':         { label: 'Rechazada',             cls: 'badge-red',    icon: 'x-circle' },
  };

  tbody.innerHTML = filtered.map(p => {
    const cfg = badgeMap[p.estado] || { label: p.estado, cls: 'badge-gray', icon: 'help-circle' };
    const isOwner = String(p.creado_por) === String(user?.id);

    return `
      <tr>
        <td class="font-mono text-xs font-bold text-primary">${p.numero_oc}</td>
        <td class="font-semibold text-sm">${p.area_nombre || '—'}</td>
        <td class="text-xs text-slate-600">${p.creador_nombre || '—'}</td>
        <td class="text-xs">
          <div class="font-semibold text-slate-700">Envío: ${p.fecha_envio_requisicion ? p.fecha_envio_requisicion.split(' ')[0].split('-').reverse().join('/') : '—'}</div>
          <div class="text-[10px] text-slate-400">Entrega: ${p.fecha_requerida ? p.fecha_requerida.split('-').reverse().join('/') : '—'}</div>
        </td>
        <td>
          ${p.dentro_presupuesto == 1
            ? `<span class="badge badge-green text-[10px] py-0.5 px-2 flex items-center gap-1 w-fit"><i data-lucide="check" class="w-3 h-3"></i>En Ppto.</span>`
            : `<span class="badge badge-red text-[10px] py-0.5 px-2 flex items-center gap-1 w-fit"><i data-lucide="alert-triangle" class="w-3 h-3"></i>Fuera Ppto.</span>`}
        </td>
        <td>
          <span class="badge ${cfg.cls} flex items-center gap-1.5 py-1 px-2.5 w-fit text-[11px]">
            <i data-lucide="${cfg.icon}" class="w-3 h-3"></i>${cfg.label}
          </span>
        </td>
        <td class="text-right">
          <div class="flex justify-end gap-1 flex-wrap">
            <button class="btn btn-ghost p-1.5" title="Ver detalles" onclick="viewRequisitionDetails(${p.id})">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            ${tab === 'por-aprobar' ? `
              <button class="btn btn-ghost p-1.5 text-emerald-600 hover:bg-emerald-50" title="Aprobar" onclick="approveRequisition(${p.id})">
                <i data-lucide="check" class="w-4 h-4"></i>
              </button>
              <button class="btn btn-ghost p-1.5 text-destructive hover:bg-red-50" title="Rechazar" onclick="rejectRequisition(${p.id})">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            ` : ''}
            ${isComprador && p.estado === 'Req_Pendiente_Compras' ? `
              <button class="btn btn-primary px-3 py-1.5 text-xs font-bold" onclick="Router.go('edit-purchase', { requisition_id: ${p.id} })">
                <i data-lucide="arrow-right-left" class="w-3.5 h-3.5 mr-1"></i>Procesar
              </button>
            ` : ''}
            ${isAdmin ? `
              <button class="btn btn-ghost p-1.5 text-destructive" title="Anular" onclick="confirmDeleteRequisition(${p.id}, '${p.numero_oc}')">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');

  lucide.createIcons();
}

// ── VISTA: NUEVA REQUISICIÓN ──
window.Views['new-requisition'] = function () {
  const user = window.Auth.getUser();
  const areaNombre = user?.area_nombre || 'Sin área asignada';
  const areaId = user?.area_id;

  // Banner de ruta según si el rol requiere aprobación pedagógica o no
  const esPedagogia = user?.role === 'req_pedagogia';
  const bannerHtml = esPedagogia
    ? `<div class="p-3.5 rounded-xl border flex items-start gap-3 text-sm bg-yellow-50 border-yellow-200 text-yellow-800">
         <i data-lucide="shield-alert" class="w-5 h-5 text-yellow-500 shrink-0 mt-0.5"></i>
         <div>
           <p class="font-bold text-xs">Ruta con Firma Intermedia (Pedagogía)</p>
           <p class="text-[11px] text-yellow-700">Tu solicitud se enviará primero para aprobación del <strong>Director de Pedagogía</strong> antes de llegar a Compras.</p>
         </div>
       </div>`
    : `<div class="p-3.5 rounded-xl border flex items-start gap-3 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">
         <i data-lucide="check-circle" class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"></i>
         <div>
           <p class="font-bold text-xs">Ruta Directa a Compras</p>
           <p class="text-[11px] text-emerald-700">Tu solicitud irá directamente a la bandeja del <strong>Jefe de Compras</strong> para cotización.</p>
         </div>
       </div>`;

  return `
    ${UI.pageHeader('Nueva Requisición de Compra', 'Describe los bienes o servicios que necesitas', `
      <button class="btn btn-outline" onclick="Router.go('requisitions')">
        <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i>Volver
      </button>
    `)}

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Columna principal -->
      <div class="lg:col-span-2 space-y-5">

        <!-- Datos Generales -->
        <div class="card p-5">
          <h3 class="font-bold mb-4 flex items-center gap-2 text-slate-800">
            <i data-lucide="file-text" class="w-4 h-4 text-primary"></i>Datos de la Solicitud
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Área (solo lectura, tomada del usuario) -->
            <div>
              <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Área Solicitante</label>
              <div class="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">
                <i data-lucide="building-2" class="w-4 h-4 text-primary shrink-0"></i>
                ${areaNombre}
              </div>
              <input type="hidden" id="req-area-id" value="${areaId || ''}">
            </div>

            <!-- Fecha requerida -->
            <div>
              <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide" for="req-fecha-req">
                Fecha Requerida de Entrega <span class="text-destructive">*</span>
              </label>
              <input id="req-fecha-req" type="date" class="input mt-1 w-full">
            </div>

            <!-- Banner de ruta (span completo) -->
            <div class="md:col-span-2">
              ${bannerHtml}
            </div>

          </div>
        </div>

        <!-- Tabla de Ítems simplificada (sin Categoría) -->
        <div class="card p-5">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold flex items-center gap-2 text-slate-800">
              <i data-lucide="list" class="w-4 h-4 text-primary"></i>Artículos / Servicios Solicitados
            </h3>
            <button class="btn btn-outline btn-sm" onclick="addReqItem()">
              <i data-lucide="plus" class="w-3.5 h-3.5 mr-1.5"></i>Agregar fila
            </button>
          </div>

          <div class="table-container">
            <table class="data w-full">
              <thead>
                <tr>
                  <th style="width:40px">#</th>
                  <th>Descripción del bien o servicio solicitado <span class="text-destructive">*</span></th>
                  <th style="width:150px">Unidad</th>
                  <th style="width:110px;text-align:right">Cantidad <span class="text-destructive">*</span></th>
                  <th style="width:50px"></th>
                </tr>
              </thead>
              <tbody id="req-items-body">
                <tr id="req-empty-row">
                  <td colspan="5" class="text-center py-8 text-slate-400 text-sm">
                    <i data-lucide="package-plus" class="w-6 h-6 mx-auto mb-2 text-slate-300"></i>
                    Aún no ha agregado ningún artículo.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
            <i data-lucide="info" class="w-3 h-3"></i>
            Describe claramente cada bien o servicio. El área de Compras se encargará de la selección de proveedor y categorización.
          </p>
        </div>

      </div>

      <!-- Columna lateral -->
      <div class="space-y-5">

        <!-- Control Presupuestal -->
        <div class="card p-5">
          <h3 class="font-bold mb-1 text-slate-800">
            Control Presupuestal <span class="text-destructive">*</span>
          </h3>
          <p class="text-xs text-slate-500 mb-4">¿Esta compra está contemplada en el presupuesto anual de tu área?</p>

          <!-- Opción: Dentro del presupuesto (sin seleccionar por defecto) -->
          <div id="ppto-si"
               onclick="selectPresupuesto(true)"
               class="ppto-option flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 mb-3 border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50">
            <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <i data-lucide="check-circle" class="w-5 h-5 text-slate-400"></i>
            </div>
            <div class="flex-1">
              <p class="font-bold text-sm text-slate-700">Dentro del presupuesto</p>
              <p class="text-[11px] text-slate-400">La compra ya está considerada en el ppto. anual</p>
            </div>
            <div id="ppto-si-dot" class="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0">
              <div class="w-3 h-3 rounded-full bg-transparent"></div>
            </div>
          </div>

          <!-- Opción: Fuera del presupuesto (sin seleccionar por defecto) -->
          <div id="ppto-no"
               onclick="selectPresupuesto(false)"
               class="ppto-option flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/50">
            <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <i data-lucide="alert-triangle" class="w-5 h-5 text-slate-400"></i>
            </div>
            <div class="flex-1">
              <p class="font-bold text-sm text-slate-700">Fuera del presupuesto</p>
              <p class="text-[11px] text-slate-400">Requiere justificación especial</p>
            </div>
            <div id="ppto-no-dot" class="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0">
              <div class="w-3 h-3 rounded-full bg-transparent"></div>
            </div>
          </div>

          <!-- Mensaje de error de validación -->
          <p id="ppto-error" class="hidden mt-2 text-xs text-destructive font-semibold flex items-center gap-1">
            <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i>
            Debes seleccionar una opción de presupuesto.
          </p>

          <input type="hidden" id="req-dentro-presupuesto" value="">
        </div>

        <!-- Observaciones / Justificación -->
        <div class="card p-5">
          <h3 class="font-bold mb-2 text-slate-800">Notas / Justificación</h3>
          <p class="text-xs text-slate-400 mb-3">Agrega cualquier detalle o contexto que ayude al área de Compras a entender mejor la necesidad.</p>
          <textarea id="req-observaciones" class="textarea w-full text-sm" rows="4"
            placeholder="Ej: Se necesita para el evento del viernes, marca preferida XYZ, etc..."></textarea>
        </div>

        <!-- Botones -->
        <div class="space-y-2">
          <button class="btn btn-primary w-full py-3 text-sm font-bold shadow-md shadow-primary/20" onclick="saveRequisition()">
            <i data-lucide="send" class="w-4 h-4 mr-2"></i>Enviar Requisición
          </button>
          <button class="btn btn-outline w-full py-2.5 text-sm" onclick="Router.go('requisitions')">
            Cancelar
          </button>
        </div>

      </div>
    </div>
  `;
};

// Selección de presupuesto mediante tarjetas
window.selectPresupuesto = function (dentroPresupuesto) {
  const hiddenInput = document.getElementById('req-dentro-presupuesto');
  if (hiddenInput) hiddenInput.value = dentroPresupuesto ? '1' : '0';

  // Ocultar mensaje de error y limpiar bordes de alerta
  const errEl = document.getElementById('ppto-error');
  if (errEl) errEl.classList.add('hidden');
  ['ppto-si', 'ppto-no'].forEach(id => {
    document.getElementById(id)?.classList.remove('border-destructive');
  });

  const cardSi  = document.getElementById('ppto-si');
  const cardNo  = document.getElementById('ppto-no');
  const dotSi   = document.getElementById('ppto-si-dot');
  const dotNo   = document.getElementById('ppto-no-dot');

  if (!cardSi || !cardNo) return;

  if (dentroPresupuesto) {
    // Activo: dentro del presupuesto (verde)
    cardSi.className = 'ppto-option flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 mb-3 border-emerald-500 bg-emerald-50';
    dotSi.innerHTML  = '<div class="w-3 h-3 rounded-full bg-emerald-500"></div>';
    dotSi.className  = 'w-5 h-5 rounded-full border-2 border-emerald-500 flex items-center justify-center shrink-0';

    // Inactivo: fuera del presupuesto (gris)
    cardNo.className = 'ppto-option flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 border-slate-200 bg-white';
    dotNo.innerHTML  = '<div class="w-3 h-3 rounded-full bg-transparent"></div>';
    dotNo.className  = 'w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0';
  } else {
    // Activo: fuera del presupuesto (rojo)
    cardNo.className = 'ppto-option flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 border-red-500 bg-red-50';
    dotNo.innerHTML  = '<div class="w-3 h-3 rounded-full bg-red-500"></div>';
    dotNo.className  = 'w-5 h-5 rounded-full border-2 border-red-500 flex items-center justify-center shrink-0';

    // Inactivo: dentro del presupuesto (gris)
    cardSi.className = 'ppto-option flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 mb-3 border-slate-200 bg-white';
    dotSi.innerHTML  = '<div class="w-3 h-3 rounded-full bg-transparent"></div>';
    dotSi.className  = 'w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0';
  }

  lucide.createIcons();
};

// Inicializar formulario de nueva requisición
async function loadRequisitionFormDetails() {
  // Solo auto-cargar áreas para el banner (ya se muestran en la vista estática)
  // Agregar primera fila vacía
  _reqItemCount = 0;
  addReqItem();

  // Fecha requerida: mínimo hoy
  const fechaInput = document.getElementById('req-fecha-req');
  if (fechaInput) {
    const today = todayPE();
    fechaInput.min = today;
  }

  lucide.createIcons();
}

// Agregar fila de ítem (sin columna de categoría)
window.addReqItem = function () {
  const empty = document.getElementById('req-empty-row');
  if (empty) empty.remove();

  _reqItemCount++;
  const n = _reqItemCount;
  const tbody = document.getElementById('req-items-body');
  const tr = document.createElement('tr');
  tr.id = `req-row-${n}`;
  tr.innerHTML = `
    <td class="text-center text-slate-400 text-xs font-bold !p-1">${n}</td>
    <td class="!p-1">
      <input class="input w-full text-sm !px-2 !h-9"
             id="req-desc-${n}"
             placeholder="Ej: Resma de papel A4 80g, Tóner para impresora HP...">
    </td>
    <td class="!p-1">
      <select class="select w-full text-sm !px-2 !h-9" id="req-unidad-${n}">
        <option value="Unidad">Unidad(es)</option>
        <option value="Caja">Caja(s)</option>
        <option value="Paquete">Paquete(s)</option>
        <option value="Resma">Resma(s)</option>
        <option value="Kilo">Kilo(s)</option>
        <option value="Litro">Litro(s)</option>
        <option value="Galón">Galón(es)</option>
        <option value="Bidón">Bidón(es)</option>
        <option value="Saco">Saco(s)</option>
        <option value="Metro">Metro(s)</option>
        <option value="Servicio">Servicio(s)</option>
      </select>
    </td>
    <td class="!p-1">
      <input class="input w-full text-sm text-right font-semibold !px-2 !h-9"
             id="req-qty-${n}" type="number" min="1" value="1">
    </td>
    <td class="!p-1 text-center">
      <button class="btn btn-ghost p-1.5 text-destructive hover:bg-red-50 rounded-lg"
              onclick="removeReqItem(${n})" title="Eliminar fila">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
  document.getElementById(`req-desc-${n}`)?.focus();
  lucide.createIcons();
};

window.removeReqItem = function (n) {
  const tr = document.getElementById(`req-row-${n}`);
  if (tr) tr.remove();
  const tbody = document.getElementById('req-items-body');
  if (tbody && tbody.querySelectorAll('tr').length === 0) {
    tbody.innerHTML = `<tr id="req-empty-row">
      <td colspan="5" class="text-center py-8 text-slate-400 text-sm">
        <i data-lucide="package-plus" class="w-6 h-6 mx-auto mb-2 text-slate-300"></i>
        Aún no ha agregado ningún artículo.
      </td>
    </tr>`;
    lucide.createIcons();
  }
};

// Guardar Requisición (POST)
window.saveRequisition = async function () {
  const user = Auth.getUser();
  const areaId = parseInt(document.getElementById('req-area-id')?.value);
  const fechaReq = document.getElementById('req-fecha-req').value;
  const obs = document.getElementById('req-observaciones').value.trim();
  const pptoVal = document.getElementById('req-dentro-presupuesto')?.value;
  const dentroPresupuesto = pptoVal === '1';

  if (!areaId) {
    UI.toast('Tu cuenta no tiene un área asignada. Contacta al administrador.', 'error');
    return;
  }
  if (!fechaReq) {
    UI.toast('Debes indicar la fecha requerida de entrega.', 'warning');
    return;
  }
  // Validación obligatoria del presupuesto
  if (pptoVal === '' || pptoVal === null || pptoVal === undefined) {
    const errEl = document.getElementById('ppto-error');
    if (errEl) errEl.classList.remove('hidden');
    // Efecto visual: resaltar ambas tarjetas con borde rojo pulsante
    ['ppto-si', 'ppto-no'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('border-destructive', 'animate-pulse');
        setTimeout(() => el.classList.remove('animate-pulse'), 1500);
      }
    });
    UI.toast('Debes indicar si la compra está dentro o fuera del presupuesto.', 'warning');
    return;
  }

  // Recoger ítems
  const tbody = document.getElementById('req-items-body');
  const rows = tbody ? tbody.querySelectorAll('tr:not(#req-empty-row)') : [];
  if (rows.length === 0) {
    UI.toast('Agrega al menos un artículo o servicio.', 'warning');
    return;
  }

  const items = [];
  let hasError = false;

  rows.forEach(row => {
    const n = row.id.replace('req-row-', '');
    const desc = document.getElementById(`req-desc-${n}`)?.value.trim();
    const unit = document.getElementById(`req-unidad-${n}`)?.value;
    const qty  = parseInt(document.getElementById(`req-qty-${n}`)?.value || 0);

    if (!desc || qty < 1) { hasError = true; return; }

    items.push({
      descripcion:     desc,
      unidad:          unit,
      cantidad:        qty,
      precio_unitario: 0.00,
      total:           0.00,
      categoria_nombre: null,  // El comprador asignará la categoría después
      prefijo:         null,
    });
  });

  if (hasError) {
    UI.toast('Completa la descripción y cantidad (mayor a 0) de todos los artículos.', 'warning');
    return;
  }

  UI.loading('Enviando requisición...');

  try {
    const payload = {
      usuario_id:         user?.id,
      area_id:            areaId,
      fecha:              todayPE(),
      fecha_requerida:    fechaReq,
      dentro_presupuesto: dentroPresupuesto ? 1 : 0,
      observaciones:      obs,
      items,
    };

    const resp = await fetch('api/purchases.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const res = await resp.json();
    UI.stopLoading();

    if (res.ok) {
      UI.toast(`Requisición ${res.numero_oc} enviada correctamente.`, 'success');
      Router.go('requisitions');
    } else {
      UI.toast('Error: ' + (res.error || 'Ocurrió un problema.'), 'error');
    }
  } catch (e) {
    UI.stopLoading();
    console.error(e);
    UI.toast('Error de red. Intenta de nuevo.', 'error');
  }
};

// ── ACCIONES ──

window.approveRequisition = function (id) {
  const req = _allRequisitions.find(r => r.id == id);
  if (!req) return;
  UI.modal({
    title: 'Aprobar Requisición',
    body: `<p>¿Confirma la aprobación de la requisición <strong class="text-primary font-mono">${req.numero_oc}</strong>?<br>
           Se enviará de inmediato a la bandeja del Jefe de Compras.</p>`,
    confirmText: 'Sí, aprobar',
    onConfirm: async () => {
      UI.loading('Aprobando...');
      try {
        const resp = await fetch('api/purchases.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_status', id, estado: 'Req_Pendiente_Compras' })
        });
        const res = await resp.json();
        UI.stopLoading();
        if (res.ok) { UI.toast('Requisición aprobada y enviada a Compras.', 'success'); loadRequisitions(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch (e) { UI.stopLoading(); UI.toast('Error de red.', 'error'); }
    }
  });
};

window.rejectRequisition = function (id) {
  const req = _allRequisitions.find(r => r.id == id);
  if (!req) return;
  UI.modal({
    title: 'Rechazar Requisición',
    body: `<p class="mb-3">Ingresa el motivo del rechazo de <strong class="font-mono text-primary">${req.numero_oc}</strong>:</p>
           <textarea id="req-motivo" class="textarea w-full text-sm" rows="3"
             placeholder="Describe el motivo del rechazo..."></textarea>`,
    confirmText: 'Rechazar',
    onConfirm: async () => {
      const motivo = document.getElementById('req-motivo')?.value.trim();
      if (!motivo) { UI.toast('Debes ingresar un motivo.', 'warning'); return false; }
      UI.loading('Rechazando...');
      try {
        const resp = await fetch('api/purchases.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_status', id, estado: 'Req_Rechazada',
            motivo_rechazo: motivo,
            rechazo_por: 'Director de Área'
          })
        });
        const res = await resp.json();
        UI.stopLoading();
        if (res.ok) { UI.toast('Requisición rechazada.', 'success'); loadRequisitions(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch (e) { UI.stopLoading(); UI.toast('Error de red.', 'error'); }
    }
  });
};

window.confirmDeleteRequisition = function (id, code) {
  UI.modal({
    title: 'Anular Requisición',
    body: `<p>¿Seguro que deseas anular la requisición <strong class="font-mono text-primary">${code}</strong>? Esta acción no se puede deshacer.</p>`,
    confirmText: 'Sí, anular',
    onConfirm: async () => {
      UI.loading('Anulando...');
      try {
        const user = window.Auth.getUser();
        const resp = await fetch(`api/purchases.php?id=${id}&usuario_id=${user?.id || ''}`, { method: 'DELETE' });
        const res = await resp.json();
        UI.stopLoading();
        if (res.ok) { UI.toast('Requisición anulada.', 'success'); loadRequisitions(); }
        else UI.toast('Error: ' + res.error, 'error');
      } catch (e) { UI.stopLoading(); UI.toast('Error de red.', 'error'); }
    }
  });
};

// ── VER DETALLES EN MODAL ──
window.viewRequisitionDetails = async function (id) {
  try {
    const data = await fetch(`api/purchases.php?id=${id}`).then(r => r.json());
    const req = data.purchase;
    if (!req) return;

    const formatDateTimeStr = (dtStr) => {
      if (!dtStr) return '—';
      return window.formatPEDate(dtStr, true);
    };

    const statusMap = {
      'Req_Pendiente_Area':    '<span class="badge badge-yellow py-1 px-2.5 flex items-center gap-1.5 w-fit"><i data-lucide="clock" class="w-3.5 h-3.5"></i>Falta Firma del Área</span>',
      'Req_Pendiente_Compras': '<span class="badge badge-indigo py-1 px-2.5 flex items-center gap-1.5 w-fit"><i data-lucide="truck" class="w-3.5 h-3.5"></i>En Bandeja de Compras</span>',
      'Req_Rechazada':         '<span class="badge badge-red py-1 px-2.5 flex items-center gap-1.5 w-fit"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i>Rechazada</span>',
    };

    const itemsHtml = req.items.map((it, i) => `
      <tr>
        <td class="text-center font-bold text-xs py-2">${i + 1}</td>
        <td class="text-xs py-2">${it.descripcion}</td>
        <td class="text-xs py-2 text-center">${it.unidad}</td>
        <td class="text-xs font-bold py-2 text-right">${it.cantidad}</td>
      </tr>`).join('');

    UI.modal({
      title: `Requisición ${req.numero_oc}`,
      body: `
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3 text-sm p-4 bg-slate-50 rounded-xl border border-slate-200/70">
            <div><p class="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Estado</p>${statusMap[req.estado] || req.estado}</div>
            <div><p class="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Área</p><p class="font-semibold text-slate-800">${req.area_nombre || '—'}</p></div>
            <div><p class="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Creado Por</p><p class="font-semibold">${req.creador_nombre || '—'}</p></div>
            <div><p class="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Presupuesto</p>
              ${req.dentro_presupuesto == 1
                ? '<span class="text-emerald-600 font-bold text-xs flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> En Presupuesto</span>'
                : '<span class="text-red-500 font-bold text-xs flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Fuera de Presupuesto</span>'}
            </div>
          </div>

          <!-- Ciclo de Vida de Fechas -->
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/70">
            <p class="text-[10px] uppercase font-bold text-slate-400 mb-2.5">Historial de Fechas</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span class="text-slate-500 block font-semibold">1. Fecha Envío:</span>
                <span class="font-bold text-slate-800">${formatDateTimeStr(req.fecha_envio_requisicion)}</span>
              </div>
              <div>
                <span class="text-slate-500 block font-semibold">2. Aprobación Director:</span>
                <span class="font-bold text-amber-700">${formatDateTimeStr(req.fecha_aprobacion_director)}</span>
              </div>
              <div>
                <span class="text-slate-500 block font-semibold">3. Fecha de Entrega:</span>
                <span class="font-bold text-slate-800">${req.fecha_requerida ? req.fecha_requerida.split('-').reverse().join('/') : '—'}</span>
              </div>
            </div>
          </div>
          ${req.observaciones ? `
          <div class="p-3.5 rounded-xl border bg-slate-50 text-xs text-slate-700">
            <span class="font-bold block text-slate-500 mb-1">Notas / Justificación:</span>
            ${req.observaciones}
          </div>` : ''}
          <div>
            <p class="text-[11px] font-bold uppercase text-slate-400 mb-2">Artículos Solicitados</p>
            <div class="table-container max-h-60 overflow-y-auto rounded-lg border border-slate-200">
              <table class="data w-full">
                <thead>
                  <tr>
                    <th style="width:40px">#</th>
                    <th>Descripción</th>
                    <th style="width:100px;text-align:center">Unidad</th>
                    <th style="width:90px;text-align:right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </div>
          </div>
        </div>`,
      hideConfirm: true,
      confirmText: 'Cerrar',
    });
    lucide.createIcons();
  } catch (e) {
    console.error(e);
    UI.toast('No se pudieron cargar los detalles.', 'error');
  }
};

// ── HOOKS: afterMount (llamado por el router DESPUÉS de pintar el DOM) ──
// El router tiene un setTimeout de 50ms antes de llamar afterMount, garantizando
// que el DOM está listo cuando cargamos los datos.
window.Views.requisitions.afterMount = function () {
  loadRequisitions();
};

window.Views['new-requisition'].afterMount = function () {
  loadRequisitionFormDetails();
};
