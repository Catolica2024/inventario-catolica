// Helpers de UI reutilizables
window.UI = {
  toast(message, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''} animate-slide-up`;
    t.textContent = message;
    document.getElementById('toast').appendChild(t);
    setTimeout(() => t.remove(), 3500);
  },
  modal(opts) {
    const { title, body, onConfirm, confirmText = 'Guardar', extraButtons = [], hideCancel, hideConfirm, onClose, size } = opts;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop fade-in';
    wrap.innerHTML = `
      <div class="modal ${size === 'lg' ? 'max-w-4xl' : ''}">
        <div class="modal-header">
          <h3 class="text-xl font-black tracking-tight text-foreground">${title}</h3>
          <button class="btn btn-ghost p-2 -mr-2" data-close><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-footer flex flex-col md:flex-row gap-3">
          <div class="flex-1 flex flex-col md:flex-row gap-2">
            ${extraButtons.map((b, i) => `<button class="btn ${b.class || 'btn-outline'}" data-extra="${i}">${b.icon ? `<i data-lucide="${b.icon}"></i>` : ''}${b.text}</button>`).join('')}
          </div>
          <div class="flex flex-col-reverse md:flex-row gap-2">
            ${!hideCancel ? '<button class="btn btn-outline" data-close>Cancelar</button>' : ''}
            ${!hideConfirm ? `<button class="btn ${opts.confirmClass || 'btn-primary'}" data-confirm>${confirmText}</button>` : ''}
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    lucide.createIcons();
    
    const close = () => {
        if (onClose) onClose();
        wrap.remove();
    };
    
    wrap.querySelectorAll('[data-close]').forEach(b => b.onclick = (e) => { e.stopPropagation(); close(); });
    const btnConfirm = wrap.querySelector('[data-confirm]');
    if (btnConfirm) btnConfirm.onclick = async () => { 
        if (onConfirm) {
            const res = await onConfirm(wrap);
            if (res === false) return;
        }
        close(); 
    };
    extraButtons.forEach((b, i) => {
      const el = wrap.querySelector(`[data-extra="${i}"]`);
      if (el) el.onclick = () => b.onClick && b.onClick(wrap);
    });
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  },
  confirm(message, onConfirm, title = 'Confirmar Acción') {
    this.modal({
        title,
        body: `<p class="text-sm font-medium text-slate-600">${message}</p>`,
        confirmText: 'Sí, continuar',
        onConfirm
    });
  },
  pageHeader(title, subtitle, actionsHTML = '') {
    const user = window.Auth ? window.Auth.getUser() : null;
    return `
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl md:text-3xl font-black tracking-tight text-foreground">${title}</h1>
          ${subtitle ? `<p class="text-sm font-medium text-muted-foreground mt-1">${subtitle}</p>` : ''}
        </div>
        <div class="flex flex-wrap gap-2 items-center">
            ${actionsHTML}
        </div>
      </div>`;
  },
  exportToExcel(data, filename = 'reporte.xlsx') {
    if (!data || data.length === 0) {
      this.toast('No hay datos para exportar', 'warning');
      return;
    }
    try {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
        XLSX.writeFile(workbook, filename);
        this.toast('Excel generado correctamente', 'success');
    } catch (e) {
        console.error('Export error:', e);
        this.toast('Error al generar Excel', 'error');
    }
  },
  emptyState(text = 'Sin datos disponibles') {
    return `<div class="card p-6 sm:p-20 text-center text-muted-foreground border-dashed flex flex-col items-center justify-center">
        <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
            <i data-lucide="inbox" class="text-slate-300 w-8 h-8"></i>
        </div>
        <div class="font-bold text-slate-400">${text}</div>
    </div>`;
  },
  loading(message = 'Procesando...') {
    let loader = document.getElementById('global-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.className = 'loading-overlay fade-in';
      loader.innerHTML = `
        <div class="spinner"></div>
        <p class="text-sm font-black text-primary uppercase tracking-widest animate-pulse">${message}</p>
      `;
      document.body.appendChild(loader);
    } else {
      loader.querySelector('p').textContent = message;
    }
  },
  stopLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.remove();
  },
  showQR(code, category) {
    const containerId = `qr-${Math.random().toString(36).substr(2, 9)}`;
    this.modal({
        title: 'Etiqueta de Identificación',
        size: 'lg',
        body: `
            <div class="flex flex-col md:flex-row items-center gap-12 p-4">
                <div class="flex-1 space-y-8 text-center md:text-left">
                    <div>
                        <div class="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-1">Categoría del Bien</div>
                        <div class="text-2xl font-black text-foreground leading-tight">${category}</div>
                    </div>
                    <div>
                        <div class="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-1">Código Patrimonial</div>
                        <div class="text-3xl font-black font-mono text-primary">${code}</div>
                    </div>
                    <div class="pt-6 flex flex-col gap-3">
                        <button class="btn btn-primary shadow-xl" onclick="UI.downloadQR('${containerId}', '${code}', '${category}')">
                            <i data-lucide="download" class="w-4 h-4 mr-2"></i> Descargar Imagen
                        </button>
                        <button class="btn btn-outline" onclick="UI.printQR('${containerId}', '${code}', '${category}')">
                            <i data-lucide="printer" class="w-4 h-4 mr-2"></i> Imprimir Etiqueta
                        </button>
                    </div>
                </div>
                <div class="shrink-0">
                    <div class="p-8 bg-white border-8 border-slate-50 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                        <div id="${containerId}" class="relative z-10"></div>
                    </div>
                </div>
            </div>
        `,
        confirmText: 'Entendido',
        hideCancel: true
    });

    setTimeout(() => {
        new QRCode(document.getElementById(containerId), {
            text: code,
            width: 200,
            height: 200,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        lucide.createIcons();
    }, 100);
  },
  downloadQR(divId, code, category, displayCode = null) {
    const qrCanvas = document.querySelector(`#${divId} canvas`);
    if (!qrCanvas) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const padding = 40;
    const qrSize = 200;
    const textWidth = 350;
    const width = qrSize + textWidth + (padding * 3);
    const height = qrSize + (padding * 2);

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(qrCanvas, padding, padding);

    ctx.textBaseline = 'top';
    const textX = qrSize + (padding * 2);

    ctx.fillStyle = '#1b5cff';
    ctx.font = '900 12px Inter, sans-serif';
    ctx.fillText(displayCode ? 'TIPO Y NOMBRE DEL ESPACIO:' : 'CATEGORÍA DEL BIEN:', textX, padding + 10);

    // Función auxiliar para dibujar texto multi-línea en canvas
    function wrapText(context, text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = context.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          context.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      context.fillText(line, x, currentY);
      return currentY + lineHeight;
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 18px Inter, sans-serif';
    const nextY = wrapText(ctx, category.toUpperCase(), textX, padding + 30, textWidth, 24);

    const labelTitle = displayCode ? 'CÓDIGO DE ESPACIO:' : 'CÓDIGO PATRIMONIAL:';
    ctx.fillStyle = '#64748b';
    ctx.font = '900 12px Inter, sans-serif';
    ctx.fillText(labelTitle, textX, nextY + 15);
    ctx.fillStyle = '#1b5cff';
    ctx.font = '900 32px Inter, sans-serif';
    ctx.fillText(displayCode || code, textX, nextY + 32);

    const link = document.createElement('a');
    link.download = `Etiqueta-${code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  },
  printQR(divId, code, category, displayCode = null) {
    const qrCanvas = document.querySelector(`#${divId} canvas`);
    if (!qrCanvas) return;

    const imgData = qrCanvas.toDataURL("image/png");
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Etiqueta - ${code}</title>
            <style>
                @page { margin: 0; }
                body { margin: 0; padding: 3mm; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .label { 
                    width: 80mm; 
                    height: 40mm; 
                    border: 1px dashed #cbd5e1; 
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                    box-sizing: border-box; 
                    padding: 4mm;
                    background: #ffffff;
                }
                .qr { width: 30mm; height: 30mm; }
                .info { 
                    flex: 1; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: center;
                    overflow: hidden;
                }
                .inst { font-size: 6.5pt; font-weight: 900; color: #1b5cff; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; }
                .cat { font-size: 8pt; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; line-height: 1.25; }
                .label-title { font-size: 6.5pt; font-weight: 900; color: #64748b; margin: 6px 0 1px 0; text-transform: uppercase; letter-spacing: 0.5px; }
                .code { font-size: 15pt; font-weight: 900; color: #1b5cff; margin: 0; font-family: monospace; letter-spacing: 0.5px; }
            </style>
        </head>
        <body>
            <div class="label">
                <img src="${imgData}" class="qr">
                <div class="info">
                    <p class="inst">I.E.P. LA CATOLICA</p>
                    <p class="cat">${category}</p>
                    <p class="label-title">${displayCode ? 'CÓDIGO ESPACIO' : 'CÓDIGO PATRIMONIAL'}</p>
                    <p class="code">${displayCode || code}</p>
                </div>
            </div>
            <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
        </html>
    `);
    printWindow.document.close();
  },
  openScanner(onScan) {
    let html5QrCode = null;
    let scannerWrap = null;

    this.modal({
        title: 'Escáner Inteligente',
        body: `
            <div class="space-y-6">
                <div class="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                        <i data-lucide="qr-code"></i>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-foreground">Detección Automática</div>
                        <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Enfoque el código con la cámara</p>
                    </div>
                </div>
                <div id="qr-reader" class="overflow-hidden rounded-3xl border-8 border-slate-50 bg-black aspect-square shadow-inner"></div>
                <div id="qr-msg" class="hidden p-4 rounded-2xl text-sm font-black text-center animate-pulse"></div>
            </div>
        `,
        hideConfirm: true,
        onClose: () => {
            if (html5QrCode) {
                html5QrCode.stop().catch(() => {});
            }
        }
    });

    const allBackdrops = document.querySelectorAll('.modal-backdrop');
    scannerWrap = allBackdrops[allBackdrops.length - 1];

    const msgDiv = scannerWrap.querySelector('#qr-msg');
    const showScannerMsg = (msg, type = 'error') => {
        msgDiv.textContent = msg;
        msgDiv.className = `p-4 rounded-2xl text-sm font-black text-center animate-pulse ${type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`;
        msgDiv.classList.remove('hidden');
        setTimeout(() => msgDiv.classList.add('hidden'), 3000);
    };

    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 20, qrbox: { width: 250, height: 250 } };

    html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
        const result = onScan ? onScan(decodedText, showScannerMsg) : true;
        if (result === true) {
            this.toast(`Código detectado: ${decodedText}`, 'success');
            if (scannerWrap) scannerWrap.remove();
            if (html5QrCode) html5QrCode.stop().catch(() => {});
        }
    }).catch(err => {
        this.toast('Error al iniciar cámara: ' + err, 'error');
        if (scannerWrap) scannerWrap.remove();
    });
  },
  makeSearchable(select) {
    if (select.dataset.searchableInitialized) return;
    select.dataset.searchableInitialized = 'true';

    // Hide original select
    select.style.display = 'none';

    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'relative w-full';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select); 

    // Create search input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = select.className.replace(/\bselect\b/g, 'input') + ' pr-10'; 
    
    // Set initial text or empty
    const updateInputFromSelect = () => {
        const selectedOpt = select.options[select.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
            input.value = selectedOpt.textContent.trim();
        } else {
            input.value = '';
        }
        input.placeholder = select.options[0] ? select.options[0].textContent : 'Buscar...';
    };
    updateInputFromSelect();
    
    wrapper.appendChild(input);

    // Create chevron icon absolute container
    const iconDiv = document.createElement('div');
    iconDiv.className = 'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 z-10';
    iconDiv.innerHTML = '<i data-lucide="chevron-down" class="w-4 h-4"></i>';
    wrapper.appendChild(iconDiv);
    lucide.createIcons();

    // ── PORTAL PATTERN ─────────────────────────────────────────────────────────
    // Render the menu in document.body with position:fixed so it is never
    // clipped by an ancestor's overflow:auto/hidden (e.g. the modal body).
    const menu = document.createElement('div');
    menu.className = 'bg-white border border-slate-200 rounded-xl shadow-2xl py-1 hidden';
    menu.style.cssText = 'position:fixed; z-index:99999; max-height:220px; overflow-y:auto; min-width:200px;';
    document.body.appendChild(menu);

    const positionMenu = () => {
        const rect = input.getBoundingClientRect();
        const menuH = Math.min(220, menu.scrollHeight || 220);
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        menu.style.width = rect.width + 'px';
        menu.style.left = rect.left + 'px';

        // Open upward if not enough room below but enough above
        if (spaceBelow < menuH + 8 && spaceAbove > spaceBelow) {
            menu.style.top = 'auto';
            menu.style.bottom = (window.innerHeight - rect.top + 2) + 'px';
        } else {
            menu.style.top = (rect.bottom + 2) + 'px';
            menu.style.bottom = 'auto';
        }
    };

    const renderOptions = (filterText = '') => {
        const query = filterText.toLowerCase().trim();
        const options = Array.from(select.options);
        
        let html = '';
        let count = 0;
        options.forEach((opt, idx) => {
            if (idx === 0 && !opt.value) return; // skip placeholder

            const text = opt.textContent.trim();
            if (!query || text.toLowerCase().includes(query)) {
                html += `<div class="px-4 py-2 hover:bg-primary/5 cursor-pointer text-sm text-slate-700 font-medium leading-snug"
                              data-value="${opt.value}" data-index="${idx}">${text}</div>`;
                count++;
            }
        });

        menu.innerHTML = count === 0
            ? '<div class="px-4 py-3 text-xs text-slate-400 italic text-center">Sin resultados</div>'
            : html;

        // Use mousedown (fires before blur) so the selection is registered
        menu.querySelectorAll('[data-value]').forEach(el => {
            el.onmousedown = (e) => {
                e.preventDefault(); // keep focus on input until after we set the value
                const idx = parseInt(el.dataset.index);
                select.selectedIndex = idx;
                input.value = select.options[idx].textContent.trim();
                closeMenu();
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input',  { bubbles: true }));
            };
        });

        positionMenu();
    };

    const openMenu = () => {
        renderOptions(input.value);
        menu.classList.remove('hidden');
        positionMenu();
    };

    const closeMenu = () => {
        menu.classList.add('hidden');
    };

    // ── Events ─────────────────────────────────────────────────────────────────
    input.addEventListener('focus', openMenu);

    input.addEventListener('input', () => {
        renderOptions(input.value);
        menu.classList.remove('hidden');
        positionMenu();
    });

    // Delay close so mousedown on an option fires first
    input.addEventListener('blur', () => {
        setTimeout(() => {
            closeMenu();
            updateInputFromSelect();
        }, 160);
    });

    // Reposition while the dropdown is open (modal scroll, window resize)
    const reposition = () => { if (!menu.classList.contains('hidden')) positionMenu(); };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    // Remove the portal menu from body when the select's wrapper leaves the DOM
    const cleanupObserver = new MutationObserver(() => {
        if (!document.body.contains(wrapper)) {
            menu.remove();
            cleanupObserver.disconnect();
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });

    // Sync visible text when options are dynamically added/removed
    const selectObserver = new MutationObserver(updateInputFromSelect);
    selectObserver.observe(select, { childList: true });

    // Sync on external 'change' events
    select.addEventListener('change', updateInputFromSelect);

    // ── Property intercepts ───────────────────────────────────────────────────
    // Override .value and .selectedIndex so programmatic assignments keep the
    // visible input text in sync with the hidden <select>.
    const descriptorVal = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(select, 'value', {
        get() { return descriptorVal.get.call(select); },
        set(val) { descriptorVal.set.call(select, val); updateInputFromSelect(); },
        configurable: true
    });

    const descriptorIdx = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
    Object.defineProperty(select, 'selectedIndex', {
        get() { return descriptorIdx.get.call(select); },
        set(idx) { descriptorIdx.set.call(select, idx); updateInputFromSelect(); },
        configurable: true
    });
  }
};

// MutationObserver global to automatically convert any select.select into searchable select
const searchableSelectObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.matches && node.matches('select.select')) {
                    window.UI.makeSearchable(node);
                }
                if (node.querySelectorAll) {
                    node.querySelectorAll('select.select').forEach(sel => {
                        window.UI.makeSearchable(sel);
                    });
                }
            }
        });
    });
});
searchableSelectObserver.observe(document.body, { childList: true, subtree: true });

// Run once on load to convert any existing selects
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('select.select').forEach(sel => {
        window.UI.makeSearchable(sel);
    });
});

