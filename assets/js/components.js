// Helpers de UI reutilizables
window.UI = {
  toast(message, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''} fade-in`;
    t.textContent = message;
    document.getElementById('toast').appendChild(t);
    setTimeout(() => t.remove(), 2800);
  },
  modal(opts) {
    const { title, body, onConfirm, confirmText = 'Guardar', extraButtons = [], hideCancel, hideConfirm, onClose, size } = opts;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop fade-in';
    wrap.innerHTML = `
      <div class="modal ${size === 'lg' ? 'max-w-4xl' : ''}">
        <div class="flex items-center justify-between p-5 border-b border-border">
          <h3 class="text-lg font-bold">${title}</h3>
          <button class="btn btn-ghost" data-close><i data-lucide="x"></i></button>
        </div>
        <div class="p-5">${body}</div>
        <div class="flex justify-end gap-2 p-4 border-t border-border bg-muted/40">
          <div class="flex-1 flex gap-2">
            ${extraButtons.map((b, i) => `<button class="btn ${b.class || 'btn-outline'}" data-extra="${i}">${b.icon ? `<i data-lucide="${b.icon}"></i>` : ''}${b.text}</button>`).join('')}
          </div>
          ${!hideCancel ? '<button class="btn btn-outline" data-close>Cancelar</button>' : ''}
          ${!hideConfirm ? `<button class="btn ${opts.confirmClass || 'btn-primary'}" data-confirm>${confirmText}</button>` : ''}
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
            if (res === false) return; // No cerrar si retorna false (error de validación)
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
        body: `<p class="text-sm">${message}</p>`,
        confirmText: 'Sí, continuar',
        onConfirm
    });
  },
  pageHeader(title, subtitle, actionsHTML = '') {
    return `
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">${title}</h1>
          ${subtitle ? `<p class="text-sm text-muted-foreground mt-1">${subtitle}</p>` : ''}
        </div>
        <div class="flex flex-wrap gap-2">${actionsHTML}</div>
      </div>`;
  },
  emptyState(text = 'Sin datos disponibles') {
    return `<div class="card p-10 text-center text-muted-foreground"><i data-lucide="inbox" class="mx-auto mb-2"></i><div>${text}</div></div>`;
  },
  loading(message = 'Procesando...') {
    let loader = document.getElementById('global-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.className = 'loading-overlay fade-in';
      loader.innerHTML = `
        <div class="spinner"></div>
        <p class="text-sm font-bold text-primary animate-pulse">${message}</p>
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
            <div class="flex flex-col md:flex-row items-center gap-8 p-4">
                <div class="flex-1 space-y-6 text-center md:text-left">
                    <div>
                        <div class="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">Categoría del Bien</div>
                        <div class="text-xl font-bold text-foreground leading-tight">${category}</div>
                    </div>
                    <div>
                        <div class="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Código Único</div>
                        <div class="text-2xl font-black font-mono text-primary">${code}</div>
                    </div>
                    <div class="pt-4 flex flex-col gap-2">
                        <button class="btn btn-outline w-full" onclick="UI.downloadQR('${containerId}', '${code}', '${category}')">
                            <i data-lucide="download" class="w-4 h-4 mr-2"></i> Descargar Imagen
                        </button>
                        <button class="btn btn-primary w-full" onclick="UI.printQR('${containerId}', '${code}', '${category}')">
                            <i data-lucide="printer" class="w-4 h-4 mr-2"></i> Imprimir en Ticketera
                        </button>
                    </div>
                </div>
                <div class="shrink-0">
                    <div class="p-5 bg-white border-4 border-muted rounded-[2rem] shadow-xl relative overflow-hidden group">
                        <div id="${containerId}" class="relative z-10"></div>
                    </div>
                </div>
            </div>
        `,
        confirmText: 'Cerrar',
        hideCancel: true
    });

    setTimeout(() => {
        new QRCode(document.getElementById(containerId), {
            text: code,
            width: 160,
            height: 160,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        lucide.createIcons();
    }, 100);
  },
  downloadQR(divId, code, category) {
    const qrCanvas = document.querySelector(`#${divId} canvas`);
    if (!qrCanvas) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const padding = 30;
    const qrSize = 160;
    const textWidth = 300;
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
    ctx.font = '800 12px Inter, sans-serif';
    ctx.fillText('CATEGORÍA:', textX, padding + 25);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 20px Inter, sans-serif';
    ctx.fillText(category.toUpperCase(), textX, padding + 40);

    ctx.fillStyle = '#64748b';
    ctx.font = '800 12px Inter, sans-serif';
    ctx.fillText('CÓDIGO ÚNICO:', textX, padding + 85);
    ctx.fillStyle = '#1b5cff';
    ctx.font = '900 26px Inter, sans-serif';
    ctx.fillText(code, textX, padding + 100);

    const link = document.createElement('a');
    link.download = `Etiqueta-${code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  },
  printQR(divId, code, category) {
    const qrCanvas = document.querySelector(`#${divId} canvas`);
    if (!qrCanvas) return;

    const imgData = qrCanvas.toDataURL("image/png");
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Imprimir Etiqueta - ${code}</title>
            <style>
                @page { margin: 0; size: auto; }
                body { 
                    margin: 0; 
                    padding: 10px; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    justify-content: center; 
                    font-family: 'Inter', sans-serif;
                    background: white;
                }
                .label-container {
                    width: 50mm;
                    height: 25mm;
                    border: 0.5px solid #eee;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 2px;
                }
                .qr-img { width: 22mm; height: 22mm; }
                .info { display: flex; flex-direction: column; justify-content: center; flex: 1; }
                .cat { font-size: 6pt; font-weight: bold; color: #666; margin: 0; text-transform: uppercase; }
                .name { font-size: 8pt; font-weight: 900; margin: 0; line-height: 1; }
                .code { font-size: 10pt; font-weight: 900; color: #1b5cff; margin-top: 3px; }
            </style>
        </head>
        <body>
            <div class="label-container">
                <img src="${imgData}" class="qr-img">
                <div class="info">
                    <p class="cat">${category}</p>
                    <p class="code">${code}</p>
                    <p style="font-size: 5pt; color: #999; margin-top: 2px;">I.E.P. LA CATOLICA</p>
                </div>
            </div>
            <script>
                window.onload = () => {
                    window.print();
                    setTimeout(() => window.close(), 500);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
  },
  openScanner(onScan) {
    let html5QrCode = null;
    let scannerWrap = null;

    this.modal({
        title: 'Escáner de Inventario',
        body: `
            <div class="space-y-4">
                <p class="text-xs text-muted-foreground">Enfoque el código QR con la cámara para identificarlo automáticamente.</p>
                <div id="qr-reader" class="overflow-hidden rounded-xl border-4 border-primary/20 bg-black aspect-video"></div>
                <div id="qr-msg" class="hidden p-3 rounded-lg text-sm font-bold text-center animate-pulse"></div>
            </div>
        `,
        hideConfirm: true,
        onClose: () => {
            if (html5QrCode) {
                html5QrCode.stop().catch(() => {});
            }
        }
    });

    // Encontrar el wrap de este modal específico
    const allBackdrops = document.querySelectorAll('.modal-backdrop');
    scannerWrap = allBackdrops[allBackdrops.length - 1];

    const msgDiv = scannerWrap.querySelector('#qr-msg');
    const showScannerMsg = (msg, type = 'error') => {
        msgDiv.textContent = msg;
        msgDiv.className = `p-3 rounded-lg text-sm font-bold text-center animate-pulse \${type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`;
        msgDiv.classList.remove('hidden');
        setTimeout(() => msgDiv.classList.add('hidden'), 3000);
    };

    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };

    html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
        const result = onScan ? onScan(decodedText, showScannerMsg) : true;
        
        if (result === true) {
            this.toast(`Código detectado: \${decodedText}`, 'success');
            if (scannerWrap) scannerWrap.remove();
            if (html5QrCode) html5QrCode.stop().catch(() => {});
        }
    }).catch(err => {
        console.error(err);
        this.toast('Error al iniciar cámara: ' + err, 'error');
        if (scannerWrap) scannerWrap.remove();
    });
  }
};
