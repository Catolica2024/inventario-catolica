window.Views = window.Views || {};
window.Views.dashboard = function(user) {
  return `
    ${UI.pageHeader(`Bienvenido de nuevo, ${user.name.split(' ')[0]} 👋`, 'Resumen estratégico del inventario institucional', `
        <div class="flex items-center gap-3">
            <!-- Indicador de refresco automático -->
            <div id="db-refresh-indicator" class="opacity-0 transition-opacity duration-300 flex items-center gap-1.5 text-[10px] font-bold text-primary">
                <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Actualizando...
            </div>
            <button class="btn btn-outline shadow-sm btn-sm-auto" onclick="App.renderView(Auth.getUser(), 'dashboard')"><i data-lucide="refresh-cw" class="w-4 h-4 mr-2"></i>Actualizar</button>
        </div>
    `)}
    <div id="dashboard-content" class="space-y-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        ${[1,2,3,4].map(()=>`<div class="kpi animate-pulse bg-slate-100 h-28 border-none"></div>`).join('')}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
            <div class="card p-8 h-[400px] animate-pulse bg-slate-50 border-none"></div>
            <div class="card p-8 h-[300px] animate-pulse bg-slate-50 border-none"></div>
        </div>
        <div class="card p-8 h-[500px] animate-pulse bg-slate-50 border-none"></div>
      </div>
    </div>`;
};

// Función central de carga: puede llamarse en montaje inicial o en refrescos silenciosos.
// silent=true → no muestra skeleton, solo actualiza los valores ya renderizados.
async function _loadDashboardContent(user, container, silent = false) {
  try {
    // Indicador sutil de refresco (solo en modo silencioso)
    if (silent) {
      const ind = document.getElementById('db-refresh-indicator');
      if (ind) { ind.classList.remove('opacity-0'); ind.classList.add('opacity-100'); }
    }

    const resp = await fetch('api/dashboard.php');
    const data = await resp.json();

    const fmtPEN = (v) => 'S/ ' + parseFloat(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtUSD = (v) => '$ ' + parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const pm = data.pagos?.por_moneda || { PEN: {pagado:0,pendiente:0}, USD: {pagado:0,pendiente:0} };

    const kpis = [
      { label:'Activos Registrados',  value: data.kpis.activos,        icon:'boxes',        tint:'bg-blue-500',    text:'text-blue-600',    desc: 'Equipos operativos' },
      { label:'Alertas de Stock',     value: data.kpis.stock_bajo,      icon:'alert-circle', tint:'bg-amber-500',   text:'text-amber-600',   desc: 'Items bajo el mínimo' },
      { label:'En Mantenimiento',     value: data.kpis.mantenimientos,  icon:'wrench',       tint:'bg-cyan-500',    text:'text-cyan-600',    desc: 'Revisiones programadas' },
      { label:'Compras del Mes',      value: data.kpis.compras,         icon:'shopping-cart', tint:'bg-emerald-500', text:'text-emerald-600', desc: 'Órdenes procesadas' },
    ];

    container.innerHTML = `
      <!-- KPIs operativos -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        ${kpis.map(k => `
          <div class="card p-6 flex flex-col justify-between hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-default group overflow-hidden relative border-primary/5">
            <div class="flex items-center justify-between relative z-10">
                <div>
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">${k.label}</div>
                    <div class="text-3xl font-black text-slate-800 tracking-tighter">${k.value}</div>
                </div>
                <div class="${k.tint} bg-opacity-10 w-12 h-12 rounded-2xl flex items-center justify-center ${k.text} group-hover:scale-110 transition-transform">
                    <i data-lucide="${k.icon}" class="w-6 h-6"></i>
                </div>
            </div>
            <div class="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 relative z-10">
                <span class="w-1.5 h-1.5 rounded-full ${k.tint}"></span> ${k.desc}
            </div>
            <div class="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                <i data-lucide="${k.icon}" class="w-24 h-24"></i>
            </div>
          </div>`).join('')}
      </div>

      <!-- Panel de pagos por moneda -->
      <div class="card p-6 border-primary/5 shadow-xl shadow-slate-200/50">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <i data-lucide="banknote" class="w-4 h-4"></i>
          </div>
          <div>
            <h3 class="text-sm font-black uppercase tracking-[0.15em] text-slate-800">Estado de Pagos por Moneda</h3>
            <p class="text-[10px] text-muted-foreground mt-0.5">Órdenes aprobadas, recibidas y completadas</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

          <!-- ── SOLES (PEN) ── -->
          <div class="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full tracking-wider">S/ SOLES (PEN)</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <i data-lucide="circle-check-big" class="w-3.5 h-3.5 text-emerald-600"></i>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pagado</span>
                </div>
                <div class="text-xl font-black text-emerald-700">${fmtPEN(pm.PEN?.pagado ?? 0)}</div>
                <div class="text-[9px] text-muted-foreground mt-0.5 font-semibold">Pagos completados</div>
              </div>
              <div class="bg-white border border-orange-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-orange-500"></i>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pendiente</span>
                </div>
                <div class="text-xl font-black text-orange-600">${fmtPEN(pm.PEN?.pendiente ?? 0)}</div>
                <div class="text-[9px] text-muted-foreground mt-0.5 font-semibold">Aprobado, sin pagar</div>
              </div>
            </div>
          </div>

          <!-- ── DÓLARES (USD) ── -->
          <div class="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-black bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full tracking-wider">$ DÓLARES (USD)</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <i data-lucide="circle-check-big" class="w-3.5 h-3.5 text-emerald-600"></i>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pagado</span>
                </div>
                <div class="text-xl font-black text-emerald-700">${fmtUSD(pm.USD?.pagado ?? 0)}</div>
                <div class="text-[9px] text-muted-foreground mt-0.5 font-semibold">Pagos completados</div>
              </div>
              <div class="bg-white border border-orange-100 rounded-xl p-4 shadow-sm">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-orange-500"></i>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pendiente</span>
                </div>
                <div class="text-xl font-black text-orange-600">${fmtUSD(pm.USD?.pendiente ?? 0)}</div>
                <div class="text-[9px] text-muted-foreground mt-0.5 font-semibold">Aprobado, sin pagar</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <div class="card p-8 bg-white border-primary/5 shadow-xl shadow-slate-200/50">
            <div class="flex items-center justify-between mb-8">
              <div>
                <h3 class="text-sm font-black uppercase tracking-[0.15em] text-primary flex items-center gap-2">
                    <i data-lucide="bar-chart-3" class="w-4 h-4"></i> Distribución de Bienes
                </h3>
                <p class="text-[10px] font-bold text-muted-foreground uppercase mt-1">Cantidad de ítems por categoría principal</p>
              </div>
            </div>
            <div class="h-[300px]">
                <canvas id="chart-categories"></canvas>
            </div>
          </div>

          <div class="card border-primary/5 shadow-xl shadow-slate-200/50">
            <div class="p-6 border-b border-border bg-slate-50/50">
                <h3 class="text-sm font-black uppercase tracking-[0.15em] text-primary flex items-center gap-2">
                    <i data-lucide="activity" class="w-4 h-4"></i> Mantenimientos Recientes
                </h3>
            </div>
            <div class="table-container">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 text-[10px] font-black uppercase text-muted-foreground">
                        <tr>
                            <th class="px-6 py-4">Código / Serie</th>
                            <th class="px-6 py-4">Descripción del Bien</th>
                            <th class="px-6 py-4 text-right">Estado Actual</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm font-medium">
                        ${data.recientes.length ? data.recientes.map(m=>`
                            <tr class="border-t border-border hover:bg-primary/5 transition-colors group">
                                <td class="px-6 py-4 font-mono text-[11px] font-black text-primary tracking-tighter">${m.numero_serie}</td>
                                <td class="px-6 py-4 text-slate-700">${m.item_nombre}</td>
                                <td class="px-6 py-4 text-right">
                                    <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${m.estado === 'Completado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                                        ${m.estado}
                                    </span>
                                </td>
                            </tr>`).join('') : '<tr><td colspan="3" class="p-16 text-center text-muted-foreground italic font-medium">No hay registros de mantenimiento recientes.</td></tr>'}
                    </tbody>
                </table>
            </div>
          </div>
        </div>

        <div class="space-y-8">
            <div class="card p-8 bg-white border-primary/5 shadow-xl shadow-slate-200/50">
                <h3 class="text-sm font-black uppercase tracking-[0.15em] text-primary flex items-center gap-2 mb-8">
                    <i data-lucide="pie-chart" class="w-4 h-4"></i> Salud del Inventario
                </h3>
                <div class="h-[250px] relative flex items-center justify-center">
                    <canvas id="chart-states"></canvas>
                    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div class="text-2xl font-black text-slate-800">${data.kpis.activos}</div>
                        <div class="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Activos</div>
                    </div>
                </div>
                <div id="chart-states-legend" class="mt-8 space-y-3"></div>
            </div>

            <div class="card p-8 bg-white border-primary/5 shadow-xl shadow-slate-200/50">
                <h3 class="text-sm font-black uppercase tracking-[0.15em] text-primary flex items-center gap-2 mb-8">
                    <i data-lucide="wallet" class="w-4 h-4"></i> Control Presupuestal
                </h3>
                <div class="h-[200px] relative flex items-center justify-center">
                    <canvas id="chart-budget"></canvas>
                    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div class="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Total Gasto</div>
                        <div class="text-xs font-black text-slate-800">S/ ${(data.gasto_presupuesto.total).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                </div>
                <div class="mt-8 space-y-3">
                    <div class="flex justify-between items-center group cursor-default">
                        <div class="flex items-center gap-3">
                            <span class="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></span>
                            <span class="text-[11px] font-bold text-slate-500 group-hover:text-slate-800 transition-colors uppercase tracking-widest">En Presupuesto</span>
                        </div>
                        <span class="text-xs font-black text-emerald-600">S/ ${(data.gasto_presupuesto.dentro).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="flex justify-between items-center group cursor-default">
                        <div class="flex items-center gap-3">
                            <span class="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span>
                            <span class="text-[11px] font-bold text-slate-500 group-hover:text-slate-800 transition-colors uppercase tracking-widest">Fuera Presupuesto</span>
                        </div>
                        <span class="text-xs font-black text-red-500">S/ ${(data.gasto_presupuesto.fuera).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            <div class="bg-primary p-8 rounded-[2rem] text-white shadow-2xl shadow-primary/20 relative overflow-hidden group cursor-pointer" onclick="Router.go('reports')">
                <div class="relative z-10">
                    <div class="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-2">Módulo de Inteligencia</div>
                    <div class="text-xl font-black leading-tight mb-6">Genere reportes analíticos de todo el inventario</div>
                    <button class="bg-white text-primary px-6 py-3 rounded-2xl text-xs font-black shadow-lg hover:scale-105 transition-transform flex items-center gap-3">
                        Explorar Reportes <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </button>
                </div>
                <i data-lucide="file-text" class="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500"></i>
            </div>
        </div>
      </div>
    `;

    lucide.createIcons();

    // -- CHARTS --
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';
    
    // Categorías (Horizontal Bar Chart)
    new Chart(document.getElementById('chart-categories'), {
        type: 'bar',
        data: {
            labels: data.distribucion.map(d => d.nombre),
            datasets: [{
                data: data.distribucion.map(d => d.cantidad),
                backgroundColor: '#1b5cff',
                borderRadius: 12,
                barThickness: 24,
                hoverBackgroundColor: '#36a2bc'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                y: { grid: { display: false }, ticks: { font: { size: 11, weight: 'bold' }, color: '#0f172a' } }
            }
        }
    });

    // Estados (Doughnut Chart)
    const stateColors = {
        'Operativo': '#10b981',
        'Mantenimiento': '#f59e0b',
        'Baja': '#ef4444',
        'Reparación': '#3b82f6'
    };

    new Chart(document.getElementById('chart-states'), {
        type: 'doughnut',
        data: {
            labels: data.estados_activos.map(e => e.estado),
            datasets: [{
                data: data.estados_activos.map(e => e.cantidad),
                backgroundColor: data.estados_activos.map(e => stateColors[e.estado] || '#cbd5e1'),
                borderWidth: 0,
                cutout: '80%',
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    // Presupuesto (Doughnut Chart)
    const hasData = (data.gasto_presupuesto.dentro > 0 || data.gasto_presupuesto.fuera > 0);
    new Chart(document.getElementById('chart-budget'), {
        type: 'doughnut',
        data: {
            labels: ['En Presupuesto', 'Fuera Presupuesto'],
            datasets: [{
                data: hasData ? [data.gasto_presupuesto.dentro, data.gasto_presupuesto.fuera] : [1, 0],
                backgroundColor: hasData ? ['#10b981', '#ef4444'] : ['#cbd5e1', '#e2e8f0'],
                borderWidth: 0,
                cutout: '75%',
                hoverOffset: hasData ? 15 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    const legendContainer = document.getElementById('chart-states-legend');
    legendContainer.innerHTML = data.estados_activos.map(e => `
        <div class="flex justify-between items-center group cursor-default">
            <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full shadow-sm" style="background:${stateColors[e.estado] || '#cbd5e1'}"></span>
                <span class="text-[11px] font-bold text-slate-500 group-hover:text-slate-800 transition-colors uppercase tracking-widest">${e.estado}</span>
            </div>
            <span class="text-xs font-black text-slate-800">${e.cantidad}</span>
        </div>
    `).join('');


  } catch (err) {
    console.error('Error loading dashboard:', err);
    if (!silent) {
      container.innerHTML = `<div class="card p-20 text-center text-destructive font-black uppercase tracking-widest text-xs border-dashed">Sincronización de datos fallida.</div>`;
    }
  } finally {
    // Ocultar indicador de refresco
    const ind = document.getElementById('db-refresh-indicator');
    if (ind) { ind.classList.remove('opacity-100'); ind.classList.add('opacity-0'); }
  }
}

// afterMount: monta el dashboard y lo registra en DashboardBus
window.Views.dashboard.afterMount = async function(user) {
  const container = document.getElementById('dashboard-content');

  // Función de refresco: primera llamada muestra skeleton, las siguientes son silenciosas
  let _firstLoad = true;
  const refresh = async (silent = false) => {
    // Si es el primer load, renderó el skeleton la vista estática ya
    await _loadDashboardContent(user, container, _firstLoad ? false : silent);
    _firstLoad = false;
  };

  // Registrar con DashboardBus (habilita polling + actualización por mutaciones)
  if (window.DashboardBus) DashboardBus.register(refresh);

  // Carga inicial
  await refresh(false);
};
