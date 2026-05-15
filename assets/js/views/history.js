window.Views = window.Views || {};
window.Views.history = function() {
  const events = [
    ['2026-05-05 09:14','J. Ramos','Ingreso de lote','+50 Detergente líquido'],
    ['2026-05-04 16:02','M. Pérez','Salida de stock','-200 Hojas bond A4'],
    ['2026-05-03 11:30','C. Vega', 'Mantenimiento','Laptop Dell L-204'],
    ['2026-05-02 08:45','A. Torres','Aprobación','OC-2026-017'],
  ];
  return `
    ${UI.pageHeader('Historial','Bitácora detallada de operaciones del sistema')}
    <div class="card">
      <div class="table-container">
        <table class="data">
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
          <tbody${events.map(e=>`<tr>${e.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
};
