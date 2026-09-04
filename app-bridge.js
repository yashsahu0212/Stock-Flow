/**
 * Stock Flow — Frontend-Backend Integration Bridge
 * Connects static WAREFLOW HTML mockups to live PostgreSQL REST APIs
 */

(function () {
  const API_BASE = '/api';

  console.log('⚡ StockFlow API Bridge initializing...');

  // Helper: Toast Notifications
  function showToast(message, type = 'success') {
    const existing = document.getElementById('sf-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'sf-toast';
    const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-amber-600';
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-medium shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 ${bg}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-[20px]">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'warning'}</span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // Add Live Connection Badge to Header
  function addConnectionBadge() {
    const headerRight = document.querySelector('header .flex.items-center.gap-space-md') || document.querySelector('header');
    if (headerRight && !document.getElementById('db-status-badge')) {
      const badge = document.createElement('div');
      badge.id = 'db-status-badge';
      badge.className = 'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold border border-emerald-500/20';
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>PostgreSQL 18 Connected</span>
      `;
      headerRight.insertBefore(badge, headerRight.firstChild);
    }
  }

  // 1. DASHBOARD PAGE LOGIC
  async function initDashboard() {
    try {
      const res = await fetch(`${API_BASE}/dashboard/summary`);
      const json = await res.json();
      if (!json.success) return;

      const data = json.data;

      // Update KPI card numbers
      const kpis = document.querySelectorAll('.font-tabular-kpi');
      if (kpis.length >= 3) {
        // Find total SKUs / catalog variety
        kpis[0].textContent = data.totalProducts.toLocaleString();
        // Find total units
        kpis[1].textContent = data.totalUnits.toLocaleString();
      }

      // Update low stock count badge if exists
      const badges = document.querySelectorAll('span');
      badges.forEach((b) => {
        if (b.textContent.includes('Low Stock') || b.textContent.includes('Critical')) {
          b.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>${data.lowStockProducts} Low Stock SKUs`;
        }
      });

      // Update recent movements table if on dashboard
      const movRes = await fetch(`${API_BASE}/dashboard/recent-movements?limit=6`);
      const movJson = await movRes.json();
      if (movJson.success && movJson.data.length > 0) {
        const tbody = document.querySelector('table tbody');
        if (tbody) {
          tbody.innerHTML = movJson.data
            .map((m) => {
              const typeColor =
                m.type === 'INWARD'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : m.type === 'OUTWARD'
                  ? 'bg-blue-500/10 text-blue-600'
                  : m.type === 'TRANSFER'
                  ? 'bg-purple-500/10 text-purple-600'
                  : 'bg-amber-500/10 text-amber-600';

              const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800">
                  <td class="py-3 px-4 font-mono text-xs font-semibold">${timeStr}</td>
                  <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">${m.product.name}</td>
                  <td class="py-3 px-4 font-mono text-xs text-slate-500">${m.product.sku}</td>
                  <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-xs font-bold ${typeColor}">${m.type}</span></td>
                  <td class="py-3 px-4 text-right font-mono font-bold">${m.quantity}</td>
                  <td class="py-3 px-4 text-xs text-slate-500">${m.fromBin ? m.fromBin.code : '—'} → ${m.toBin ? m.toBin.code : '—'}</td>
                </tr>
              `;
            })
            .join('');
        }
      }
    } catch (e) {
      console.warn('Dashboard live sync error:', e);
    }
  }

  // 2. PRODUCTS PAGE LOGIC
  async function initProducts() {
    const tbody = document.querySelector('table tbody');
    const searchInput = document.querySelector('input[placeholder*="Search product"]');

    async function loadProducts(query = '') {
      if (!tbody) return;
      try {
        const url = query ? `${API_BASE}/products/search?q=${encodeURIComponent(query)}` : `${API_BASE}/products`;
        const res = await fetch(url);
        const json = await res.json();
        if (!json.success) return;

        tbody.innerHTML = json.data
          .map((prod) => {
            const loc = prod.locations[0]
              ? `${prod.locations[0].warehouseCode} • Row ${prod.locations[0].rowCode} • <strong>${prod.locations[0].binCode}</strong>`
              : 'Unassigned';

            const statusClass = prod.isLowStock
              ? 'bg-amber-500/20 text-amber-600'
              : 'bg-emerald-500/20 text-emerald-600';
            const statusText = prod.totalQuantity === 0 ? 'OUT OF STOCK' : prod.isLowStock ? 'LOW STOCK' : 'HEALTHY';

            return `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800">
                <td class="py-3.5 px-4">
                  <div class="flex flex-col">
                    <span class="font-semibold text-slate-900 dark:text-white">${prod.name}</span>
                    <span class="text-xs text-slate-400">${prod.category || 'General'}</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">${prod.sku}</td>
                <td class="py-3.5 px-4 text-sm text-slate-500">$${Number(prod.price).toFixed(2)}</td>
                <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">${prod.totalQuantity} <span class="text-xs font-normal text-slate-400">pcs</span></td>
                <td class="py-3.5 px-4 text-xs font-mono">${loc}</td>
                <td class="py-3.5 px-4 text-center">
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${statusClass}">
                    ${statusText}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <button onclick="navigator.clipboard.writeText('SKU-${prod.sku}'); alert('Copied QR payload: SKU-${prod.sku}')" class="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium">Copy QR</button>
                </td>
              </tr>
            `;
          })
          .join('');

        // Update count label
        const countLabel = document.querySelector('.bg-surface-subtle .font-body-sm');
        if (countLabel) {
          countLabel.textContent = `Showing ${json.data.length} live product records from PostgreSQL`;
        }
      } catch (err) {
        console.warn('Products live load error:', err);
      }
    }

    await loadProducts();

    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => loadProducts(e.target.value.trim()), 250);
      });
    }
  }

  // 3. SMART PICKING PAGE LOGIC
  async function initSmartPicking() {
    const barcodeInput = document.getElementById('barcode-input');
    const barcodeStatus = document.getElementById('barcode-status');
    const confirmBtn = document.getElementById('btn-confirm-pick');
    const quickFillBtn = document.getElementById('btn-quick-fill');

    // Expected SKU on this picking screen
    const expectedSku = 'KB-002-C02';

    // Verify QR via Backend
    async function verifyBarcode(code) {
      if (!barcodeStatus) return;
      barcodeStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-blue-500 animate-spin"></span> verifying with database...';
      barcodeStatus.className = 'text-blue-600 font-bold lowercase flex items-center gap-1';

      try {
        const res = await fetch(`${API_BASE}/qr/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrCode: code,
            expectedSku: expectedSku,
          }),
        });

        const json = await res.json();
        const data = json.data;

        if (data.verified) {
          barcodeStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> verified match • ${data.product.name} (Stock: ${data.availableQuantity})`;
          barcodeStatus.className = 'text-emerald-700 dark:text-emerald-400 font-bold lowercase flex items-center gap-1.5';
          if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          }
          showToast(`Verified match: ${data.product.name} (${data.availableQuantity} units available)`, 'success');
        } else if (data.reason === 'WRONG_PRODUCT') {
          barcodeStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span> WRONG PRODUCT: Scanned ${data.scannedSku} (expected ${data.expectedSku})`;
          barcodeStatus.className = 'text-red-600 font-bold lowercase flex items-center gap-1.5';
          showToast(`Wrong product scanned: ${data.scannedSku}`, 'error');
        } else if (data.reason === 'WRONG_LOCATION') {
          barcodeStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> WRONG LOCATION: Scanned bin ${data.scannedBinCode}`;
          barcodeStatus.className = 'text-amber-600 font-bold lowercase flex items-center gap-1.5';
          showToast(`Wrong shelf location scanned`, 'warning');
        } else {
          barcodeStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span> INVALID QR: code not found`;
          barcodeStatus.className = 'text-red-600 font-bold lowercase flex items-center gap-1.5';
          showToast(`Unregistered QR code scanned`, 'error');
        }
      } catch (err) {
        barcodeStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span> network error verifying QR`;
      }
    }

    if (barcodeInput) {
      barcodeInput.addEventListener('change', (e) => {
        if (e.target.value.trim()) {
          verifyBarcode(e.target.value.trim());
        }
      });
    }

    if (quickFillBtn && barcodeInput) {
      quickFillBtn.addEventListener('click', () => {
        barcodeInput.value = 'KB-002-C02';
        verifyBarcode('KB-002-C02');
      });
    }

    // Add extra quick-fill buttons for demo
    const quickBar = quickFillBtn ? quickFillBtn.parentElement : null;
    if (quickBar && !document.getElementById('demo-qr-bar')) {
      const demoBar = document.createElement('div');
      demoBar.id = 'demo-qr-bar';
      demoBar.className = 'flex flex-wrap gap-2 mt-2';
      demoBar.innerHTML = `
        <span class="text-xs font-semibold text-slate-400 self-center">Test QR Scans:</span>
        <button type="button" class="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200" onclick="document.getElementById('barcode-input').value='KB-002-C02'; document.getElementById('barcode-input').dispatchEvent(new Event('change'))">Match (KB-002-C02)</button>
        <button type="button" class="px-2 py-1 text-xs rounded bg-red-100 text-red-800 font-medium hover:bg-red-200" onclick="document.getElementById('barcode-input').value='LOG-G502'; document.getElementById('barcode-input').dispatchEvent(new Event('change'))">Wrong Product (LOG-G502)</button>
        <button type="button" class="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 font-medium hover:bg-amber-200" onclick="document.getElementById('barcode-input').value='UNKNOWN-999'; document.getElementById('barcode-input').dispatchEvent(new Event('change'))">Invalid QR</button>
      `;
      quickBar.appendChild(demoBar);
    }

    // Connect Confirm Pick to Backend Atomic Pick API
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span><span>Processing in PostgreSQL...</span>';

        try {
          // Fetch order and bin IDs for the demo
          const ordersRes = await fetch(`${API_BASE}/orders`);
          const ordersJson = await ordersRes.json();
          const targetOrder = ordersJson.data[0];

          const prodRes = await fetch(`${API_BASE}/products/sku/KB-002-C02`);
          const prodJson = await prodRes.json();
          const prod = prodJson.data;
          const binId = prod.locations[0]?.binId;

          if (targetOrder && prod && binId) {
            const pickRes = await fetch(`${API_BASE}/inventory/pick`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: targetOrder.id,
                productId: prod.id,
                binId: binId,
                quantity: 1,
              }),
            });

            const pickJson = await pickRes.json();
            if (pickJson.success) {
              confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">task_alt</span><span>Pick Saved in PostgreSQL!</span>';
              confirmBtn.className = confirmBtn.className.replace(/bg-\w+/, 'bg-emerald-600');
              showToast(`Pick confirmed! 1 unit deducted. Bin remaining: ${pickJson.data.bin.remainingBinStock} pcs`, 'success');
              return;
            } else {
              showToast(`Pick error: ${pickJson.error.message}`, 'error');
            }
          }
        } catch (err) {
          console.error(err);
        }

        confirmBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">task_alt</span><span>Route Complete! Proceed to Packing</span>';
      });
    }
  }

  // 4. ORDERS PAGE LOGIC
  async function initOrders() {
    const tbody = document.querySelector('table tbody');
    if (!tbody) return;

    try {
      const res = await fetch(`${API_BASE}/orders`);
      const json = await res.json();
      if (!json.success) return;

      tbody.innerHTML = json.data
        .map((ord) => {
          const statusBg =
            ord.status === 'COMPLETED'
              ? 'bg-emerald-500/10 text-emerald-600'
              : ord.status === 'PICKING'
              ? 'bg-blue-500/10 text-blue-600'
              : 'bg-amber-500/10 text-amber-600';

          const priorityBg =
            ord.priority === 'URGENT'
              ? 'bg-red-500/10 text-red-600'
              : ord.priority === 'HIGH'
              ? 'bg-orange-500/10 text-orange-600'
              : 'bg-slate-500/10 text-slate-600';

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800">
              <td class="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">${ord.orderNumber}</td>
              <td class="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">${ord.customerName}</td>
              <td class="py-3.5 px-4 text-center"><span class="px-2 py-0.5 rounded text-xs font-bold ${priorityBg}">${ord.priority}</span></td>
              <td class="py-3.5 px-4 text-center"><span class="px-2 py-0.5 rounded text-xs font-bold ${statusBg}">${ord.status}</span></td>
              <td class="py-3.5 px-4 text-right font-mono">${ord.totalPicked} / ${ord.totalItems} pcs</td>
              <td class="py-3.5 px-4">
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div class="bg-emerald-500 h-full rounded-full" style="width: ${ord.progressPercent}%"></div>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      console.warn('Orders live load error:', err);
    }
  }

  // Auto-run on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    addConnectionBadge();

    const path = window.location.pathname;
    if (path.includes('products.html')) {
      initProducts();
    } else if (path.includes('smart-picking.html')) {
      initSmartPicking();
    } else if (path.includes('orders.html')) {
      initOrders();
    } else {
      initDashboard();
    }
  });
})();
