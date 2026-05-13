window.Views = window.Views || {};
window.Views.dashboard = function(user) {
  return `
    ${UI.pageHeader(`Hola, ${user.name} 👋`, 'Resumen general del inventario escolar')}
    <div id="dashboard-content">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${[1,2,3,4].map(()=>`<div class="kpi animate-pulse bg-muted h-24"></div>`).join('')}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="card p-5 lg:col-span-2 h-64 animate-pulse bg-muted"></div>
        <div class="card p-5 h-64 animate-pulse bg-muted"></div>
      </div>
    </div>`;
};

window.Views.dashboard.afterMount = async function(user) {
  const container = document.getElementById('dashboard-content');
  try {
    const resp = await fetch('api/dashboard.php');
    const data = await resp.json();

    const kpis = [
      { label:'Activos totales', value: data.kpis.activos, icon:'boxes', tint:'bg-blue-500', text:'text-blue-600' },
      { label:'Stock bajo',      value: data.kpis.stock_bajo, icon:'alert-triangle', tint:'bg-amber-500', text:'text-amber-600' },
      { label:'Mantenimientos',  value: data.kpis.mantenimientos, icon:'wrench', tint:'bg-cyan-500', text:'text-cyan-600' },
      { label:'Compras del mes', value: data.kpis.compras, icon:'shopping-cart', tint:'bg-emerald-500', text:'text-emerald-600' },
    ];

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        ${kpis.map(k => `
          <div class="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between hover:shadow-md transition-all">
            <div>
              <div class="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">${k.label}</div>
              <div class="text-2xl font-black text-primary">${k.value}</div>
            </div>
            <div class="${k.tint} bg-opacity-10 w-12 h-12 rounded-2xl flex items-center justify-center ${k.text}">
              <i data-lucide="${k.icon}" class="w-6 h-6"></i>
            </div>
          </div>`).join('')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="card p-6 bg-white border border-border rounded-2xl shadow-sm">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2">
                <i data-lucide="bar-chart-3" class="w-4 h-4"></i> Items por Categoría
              </h3>
            </div>
            <div class="h-[300px]">
                <canvas id="chart-categories"></canvas>
            </div>
          </div>

          <div class="card p-6 bg-white border border-border rounded-2xl shadow-sm">
            <h3 class="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2 mb-6">
                <i data-lucide="activity" class="w-4 h-4"></i> Mantenimientos Recientes
            </h3>
            <div class="overflow-hidden rounded-xl border border-border">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-muted/50 text-[10px] font-black uppercase text-muted-foreground">
                        <tr>
                            <th class="px-4 py-3">Serie</th>
                            <th class="px-4 py-3">Ítem / Mobiliario</th>
                            <th class="px-4 py-3 text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm">
                        ${data.recientes.length ? data.recientes.map(m=>`
                            <tr class="border-t border-border hover:bg-muted/20 transition-colors">
                                <td class="px-4 py-3 font-mono text-[10px] font-bold text-primary">${m.numero_serie}</td>
                                <td class="px-4 py-3 font-medium">${m.item_nombre}</td>
                                <td class="px-4 py-3 text-right">
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${m.estado === 'Completado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
                                        ${m.estado}
                                    </span>
                                </td>
                            </tr>`).join('') : '<tr><td colspan="3" class="p-10 text-center text-muted-foreground italic">Sin registros</td></tr>'}
                    </tbody>
                </table>
            </div>
          </div>
        </div>

        <div class="space-y-6">
            <div class="card p-6 bg-white border border-border rounded-2xl shadow-sm">
                <h3 class="text-sm font-black uppercase tracking-tight text-primary flex items-center gap-2 mb-6">
                    <i data-lucide="pie-chart" class="w-4 h-4"></i> Salud del Inventario
                </h3>
                <div class="h-[250px] flex items-center justify-center">
                    <canvas id="chart-states"></canvas>
                </div>
                <div id="chart-states-legend" class="mt-4 space-y-2"></div>
            </div>

            <div class="bg-primary p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group">
                <div class="relative z-10">
                    <div class="text-[10px] font-black uppercase opacity-60 mb-1">Acción Rápida</div>
                    <div class="text-lg font-black mb-4">¿Necesitas un reporte?</div>
                    <button class="bg-white text-primary px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform flex items-center gap-2" onclick="router.navigate('reports')">
                        Generar Reporte PDF <i data-lucide="arrow-right" class="w-3 h-3"></i>
                    </button>
                </div>
                <i data-lucide="file-text" class="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform"></i>
            </div>
        </div>
      </div>
    `;

    lucide.createIcons();

    // -- CHARTS --
    
    // Categorías (Bar Chart)
    new Chart(document.getElementById('chart-categories'), {
        type: 'bar',
        data: {
            labels: data.distribucion.map(d => d.nombre),
            datasets: [{
                label: 'Cantidad de Ítems',
                data: data.distribucion.map(d => d.cantidad),
                backgroundColor: '#1b5cff',
                borderRadius: 8,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
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
                backgroundColor: data.estados_activos.map(e => stateColors[e.estado] || '#64748b'),
                borderWidth: 0,
                cutout: '75%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    // Legend for States
    const legendContainer = document.getElementById('chart-states-legend');
    legendContainer.innerHTML = data.estados_activos.map(e => `
        <div class="flex justify-between items-center text-xs">
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background:${stateColors[e.estado] || '#64748b'}"></span>
                <span class="font-medium text-muted-foreground">${e.estado}</span>
            </div>
            <span class="font-bold">${e.cantidad}</span>
        </div>
    `).join('');

  } catch (err) {
    console.error('Error loading dashboard:', err);
    container.innerHTML = `<div class="card p-10 text-center text-destructive">Error al cargar estadísticas.</div>`;
  }
};

window.Views.dashboard.afterMount = window.Views.dashboard.afterMount;
