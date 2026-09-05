/**
 * StockFlow — App Bridge
 * Client-side interface connecting web UI to REST API services
 */
(function () {
  const API = '/api';

  // ─── Helpers ───────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const old = document.getElementById('sf-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'sf-toast';
    const bg = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#d97706';
    Object.assign(t.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      padding: '12px 22px', borderRadius: '10px', color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '13px', fontWeight: 600, background: bg, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      transition: 'opacity 0.3s', opacity: 1
    });
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3000);
  }

  async function api(path, opts = {}) {
    const token = sessionStorage.getItem('sf_admin_token') || localStorage.getItem('sf_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...opts.headers },
      ...opts
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'API error');
    return json.data;
  }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }
  function fmtTime(iso) { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  const typeBadge = { INWARD: 'badge-green', OUTWARD: 'badge-blue', TRANSFER: 'badge-purple', ADJUSTMENT: 'badge-amber' };
  const statusBadge = { PENDING: 'badge-amber', PICKING: 'badge-blue', PICKED: 'badge-blue', COMPLETED: 'badge-green', CANCELLED: 'badge-gray' };
  const priorityBadge = { LOW: 'badge-gray', NORMAL: 'badge-blue', HIGH: 'badge-amber', URGENT: 'badge-red' };

  // ─── 1. DASHBOARD ──────────────────────────────────────────
  async function initDashboard() {
    try {
      const d = await api('/dashboard/summary');
      const el = (id) => document.getElementById(id);
      if (el('kpi-products')) el('kpi-products').textContent = d.totalProducts;
      if (el('kpi-units')) el('kpi-units').textContent = d.totalUnits.toLocaleString();
      if (el('kpi-low')) el('kpi-low').textContent = d.lowStockProducts;
      if (el('kpi-orders')) el('kpi-orders').textContent = d.pendingOrders;
      if (el('kpi-movements')) el('kpi-movements').textContent = d.todayMovements;
    } catch (e) { console.warn('Dashboard KPI error:', e); }

    try {
      const moves = await api('/dashboard/recent-movements?limit=10');
      const tb = $('#movements-body');
      if (!tb) return;
      if (moves.length === 0) { tb.innerHTML = '<tr><td colspan="6" class="empty-state">No recent movements</td></tr>'; return; }
      tb.innerHTML = moves.map(m => `
        <tr>
          <td>${fmtTime(m.timestamp)}</td>
          <td>${m.product.name}</td>
          <td><span class="sku">${m.product.sku}</span></td>
          <td><span class="badge ${typeBadge[m.type] || 'badge-gray'}">${m.type}</span></td>
          <td class="right" style="font-weight:700">${m.quantity}</td>
          <td class="location">${m.fromBin ? m.fromBin.code : '—'} → ${m.toBin ? m.toBin.code : '—'}</td>
        </tr>
      `).join('');
    } catch (e) { console.warn('Movements error:', e); }

    try {
      const low = await api('/dashboard/low-stock');
      const ul = $('#low-stock-list');
      if (!ul) return;
      if (low.length === 0) { ul.innerHTML = '<li class="empty-state">All stock levels healthy</li>'; return; }
      ul.innerHTML = low.map(p => `
        <li>
          <span>${p.name} <span style="color:#94a3b8;font-size:11px">(${p.sku})</span></span>
          <span class="low-stock-qty">${p.currentQuantity} / ${p.minStockLevel} min</span>
        </li>
      `).join('');
    } catch (e) { console.warn('Low stock error:', e); }
  }

  // ─── 2. PRODUCTS ───────────────────────────────────────────
  let allProducts = [];

  async function initProducts() {
    allProducts = await api('/products');
    renderProducts(allProducts);

    const searchInput = $('#search-input');
    const filterStatus = $('#filter-status');
    const btnViewGrid = $('#btn-view-grid');
    const btnViewTable = $('#btn-view-table');

    if (btnViewGrid && btnViewTable) {
      btnViewGrid.addEventListener('click', () => {
        btnViewGrid.classList.add('active');
        btnViewTable.classList.remove('active');
        $('#products-grid').style.display = 'grid';
        $('#products-table-wrap').style.display = 'none';
      });

      btnViewTable.addEventListener('click', () => {
        btnViewTable.classList.add('active');
        btnViewGrid.classList.remove('active');
        $('#products-grid').style.display = 'none';
        $('#products-table-wrap').style.display = 'block';
      });
    }

    // Modal close listeners
    $('#btn-close-prod-modal')?.addEventListener('click', () => $('#modal-product-details')?.classList.remove('open'));
    $('#modal-product-details')?.addEventListener('click', (e) => {
      if (e.target === $('#modal-product-details')) $('#modal-product-details').classList.remove('open');
    });

    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => filterProducts(), 200);
      });
    }
    if (filterStatus) {
      filterStatus.addEventListener('change', () => filterProducts());
    }
  }

  async function filterProducts() {
    const q = ($('#search-input')?.value || '').trim().toLowerCase();
    const status = $('#filter-status')?.value || '';

    let filtered = allProducts;
    if (q.length > 0) {
      try {
        const searchResults = await api(`/products/search?q=${encodeURIComponent(q)}`);
        filtered = searchResults;
      } catch {
        filtered = allProducts.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        );
      }
    }

    if (status === 'low') filtered = filtered.filter(p => p.isLowStock && p.totalQuantity > 0);
    else if (status === 'out') filtered = filtered.filter(p => p.totalQuantity === 0);
    else if (status === 'healthy') filtered = filtered.filter(p => !p.isLowStock && p.totalQuantity > 0);

    renderProducts(filtered);
  }

  function renderProducts(list) {
    const grid = $('#products-grid');
    const tb = $('#products-body');
    const cl = $('#count-label');
    if (cl) cl.textContent = `${list.length} products`;

    if (list.length === 0) {
      if (grid) grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No products found</div>';
      if (tb) tb.innerHTML = '<tr><td colspan="7" class="empty-state">No products found</td></tr>';
      return;
    }

    // 1. Render Interactive Shelf Box Grid
    if (grid) {
      grid.innerHTML = list.map(p => {
        const loc = p.locations && p.locations[0]
          ? `${p.locations[0].warehouseCode} · ${p.locations[0].rowCode} · ${p.locations[0].binCode}`
          : 'Unassigned Shelf';
        const st = p.totalQuantity === 0 ? ['OUT OF STOCK', 'badge-red']
          : p.isLowStock ? ['LOW STOCK', 'badge-amber']
          : ['HEALTHY', 'badge-green'];
        
        return `
          <div class="product-box-card" onclick="window.openProductDetail('${p.id}')">
            <div>
              <div class="product-box-header">
                <span class="sku">${p.sku}</span>
                <span class="badge ${st[1]}">${st[0]}</span>
              </div>
              <div class="product-box-title">${p.name}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">${p.category || 'General'}</div>
              <div class="product-box-price">$${Number(p.price).toFixed(2)}</div>
            </div>

            <div class="product-box-meta">
              <div class="product-box-location">
                <span class="material-symbols-outlined">warehouse</span>
                <span>${loc}</span>
              </div>
              <div class="product-box-stock-row">
                <span style="color:var(--text-muted);font-weight:600;">On-Hand Stock</span>
                <span class="product-box-stock-val" style="color:${p.isLowStock ? 'var(--amber-text)' : 'var(--primary-text)'};">${p.totalQuantity} units</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${Math.min(100, (p.totalQuantity / Math.max(1, p.minStockLevel * 2)) * 100)}%;"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Render Table View
    if (tb) {
      tb.innerHTML = list.map(p => {
        const loc = p.locations && p.locations[0]
          ? `${p.locations[0].warehouseCode} · ${p.locations[0].rowCode} · ${p.locations[0].binCode}`
          : '—';
        const st = p.totalQuantity === 0 ? ['OUT OF STOCK', 'badge-red']
          : p.isLowStock ? ['LOW STOCK', 'badge-amber']
          : ['HEALTHY', 'badge-green'];
        return `
          <tr style="cursor:pointer;" onclick="window.openProductDetail('${p.id}')">
            <td style="font-weight:600">${p.name}</td>
            <td><span class="sku">${p.sku}</span></td>
            <td>${p.category || '—'}</td>
            <td>$${Number(p.price).toFixed(2)}</td>
            <td class="right" style="font-weight:700">${p.totalQuantity}</td>
            <td class="location">${loc}</td>
            <td><span class="badge ${st[1]}">${st[0]}</span></td>
          </tr>`;
      }).join('');
    }
  }

  window.openProductDetail = function(productId) {
    const p = allProducts.find(x => x.id === productId);
    if (!p) return;

    const modal = $('#modal-product-details');
    if (!modal) return;

    const st = p.totalQuantity === 0 ? ['OUT OF STOCK', 'badge-red']
      : p.isLowStock ? ['LOW STOCK', 'badge-amber']
      : ['HEALTHY', 'badge-green'];

    const loc = p.locations && p.locations[0]
      ? `${p.locations[0].warehouseCode} · Row ${p.locations[0].rowCode}`
      : 'No Warehouse Assigned';
    const shelfCode = p.locations && p.locations[0] ? `Shelf ${p.locations[0].binCode}` : '—';

    $('#modal-prod-status').textContent = st[0];
    $('#modal-prod-status').className = `badge ${st[1]}`;
    $('#modal-prod-name').textContent = p.name;
    $('#modal-prod-category').textContent = `Category: ${p.category || 'General'} · Barcode: ${p.barcode || 'N/A'}`;
    $('#modal-prod-sku').textContent = p.sku;
    $('#modal-prod-price').textContent = `$${Number(p.price).toFixed(2)}`;
    $('#modal-prod-stock').textContent = `${p.totalQuantity} ${p.unit || 'pcs'}`;
    $('#modal-prod-min-stock').textContent = `${p.minStockLevel || 10} ${p.unit || 'pcs'}`;
    $('#modal-prod-location').textContent = loc;
    $('#modal-prod-shelf-code').textContent = shelfCode;

    modal.classList.add('open');
  };

  // ─── 3. ORDERS ─────────────────────────────────────────────
  let productsForOrders = [];

  async function initOrders() {
    productsForOrders = await api('/products');
    await loadOrders();

    const filterStatus = $('#filter-status');
    const filterPriority = $('#filter-priority');
    if (filterStatus) filterStatus.addEventListener('change', loadOrders);
    if (filterPriority) filterPriority.addEventListener('change', loadOrders);

    const modal = $('#order-modal');
    const btnNew = $('#btn-new-order');
    const btnCancel = $('#btn-cancel-order');
    const btnAddItem = $('#btn-add-item');
    const form = $('#order-form');

    if (btnNew) btnNew.addEventListener('click', () => {
      populateProductSelects();
      modal.classList.add('open');
    });
    if (btnCancel) btnCancel.addEventListener('click', () => modal.classList.remove('open'));
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

    if (btnAddItem) btnAddItem.addEventListener('click', () => addOrderItemRow());

    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customer = $('#order-customer').value.trim();
      const priority = $('#order-priority').value;
      const rows = $$('#order-items-list .order-item-row');
      const items = [];
      rows.forEach(row => {
        const productId = row.querySelector('.item-product').value;
        const qty = parseInt(row.querySelector('.item-qty').value, 10);
        if (productId && qty > 0) items.push({ productId, quantity: qty });
      });

      if (!customer) { showToast('Customer name is required', 'error'); return; }
      if (items.length === 0) { showToast('Add at least one item', 'error'); return; }

      try {
        await api('/orders', { method: 'POST', body: JSON.stringify({ customerName: customer, priority, items }) });
        showToast('Order created successfully!');
        modal.classList.remove('open');
        form.reset();
        await loadOrders();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  function populateProductSelects() {
    $$('.item-product').forEach(sel => {
      const val = sel.value;
      sel.innerHTML = '<option value="">Select product…</option>' +
        productsForOrders.map(p => `<option value="${p.id}">${p.name} (${p.sku}) — ${p.totalQuantity} in stock</option>`).join('');
      sel.value = val;
    });
  }

  function addOrderItemRow() {
    const list = $('#order-items-list');
    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.innerHTML = `
      <select class="item-product" required><option value="">Select product…</option></select>
      <input type="number" class="item-qty" min="1" value="1" placeholder="Qty" required>
      <button type="button" class="btn-remove-item" title="Remove">×</button>
    `;
    list.appendChild(row);
    populateProductSelects();
    row.querySelector('.btn-remove-item').addEventListener('click', () => row.remove());
  }

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-item')) {
      const rows = $$('#order-items-list .order-item-row');
      if (rows.length > 1) e.target.closest('.order-item-row').remove();
    }
  });

  async function loadOrders() {
    const tb = $('#orders-body');
    if (!tb) return;

    try {
      const orders = await api('/orders');
      const statusFilter = $('#filter-status')?.value || '';
      const priorityFilter = $('#filter-priority')?.value || '';

      let list = orders;
      if (statusFilter) list = list.filter(o => o.status === statusFilter);
      if (priorityFilter) list = list.filter(o => o.priority === priorityFilter);

      if (list.length === 0) { tb.innerHTML = '<tr><td colspan="6" class="empty-state">No orders found</td></tr>'; return; }

      tb.innerHTML = list.map(o => {
        const totalItems = o.items ? o.items.length : 0;
        const pickedItems = o.items ? o.items.filter(i => i.status === 'PICKED').length : 0;
        const pct = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : (o.status === 'COMPLETED' ? 100 : 0);

        return `
          <tr>
            <td><span class="sku">${o.orderNumber}</span></td>
            <td style="font-weight:600">${o.customerName}</td>
            <td><span class="badge ${priorityBadge[o.priority] || 'badge-gray'}">${o.priority}</span></td>
            <td><span class="badge ${statusBadge[o.status] || 'badge-gray'}">${o.status}</span></td>
            <td style="width:160px">
              <div style="display:flex;align-items:center;gap:8px">
                <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                <span style="font-size:11px;color:#64748b;font-weight:600">${pickedItems}/${totalItems}</span>
              </div>
            </td>
            <td class="right">
              <select class="filter" style="padding:4px 8px;font-size:11px" onchange="window.updateOrderStatus('${o.id}', this.value)">
                <option value="" disabled selected>Change…</option>
                <option value="PENDING" ${o.status === 'PENDING' ? 'disabled' : ''}>Pending</option>
                <option value="PICKING" ${o.status === 'PICKING' ? 'disabled' : ''}>Picking</option>
                <option value="COMPLETED" ${o.status === 'COMPLETED' ? 'disabled' : ''}>Completed</option>
                <option value="CANCELLED" ${o.status === 'CANCELLED' ? 'disabled' : ''}>Cancelled</option>
              </select>
            </td>
          </tr>`;
      }).join('');
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="6" class="empty-state">Error loading orders</td></tr>';
      console.warn('Orders error:', e);
    }
  }

  window.updateOrderStatus = async function (id, status) {
    if (!status) return;
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showToast(`Order updated to ${status}`);
      loadOrders();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // ─── 4. MOVEMENTS ──────────────────────────────────────────
  let allBins = [];

  async function initMovements() {
    loadMovements();

    try {
      const [prods, whs] = await Promise.all([api('/products'), api('/warehouses')]);
      const pSel = $('#mv-product');
      if (pSel) {
        pSel.innerHTML = '<option value="">Select product…</option>' +
          prods.map(p => `<option value="${p.id}">${p.name} (${p.sku}) — ${p.totalQuantity} in stock</option>`).join('');
      }

      allBins = [];
      for (const wh of whs) {
        try {
          const hierarchy = await api(`/warehouses/${wh.id}/rows`);
          for (const row of (hierarchy.rows || [])) {
            for (const bin of (row.bins || [])) {
              allBins.push({ id: bin.id, code: bin.code, label: `${wh.code} → ${row.code} → ${bin.code} (${bin.code})` });
            }
          }
        } catch { }
      }
      populateBinSelects();
    } catch (e) { console.warn('Movement init error:', e); }

    const modal = $('#movement-modal');
    const btnNew = $('#btn-new-movement');
    const btnCancel = $('#btn-cancel-movement');
    const form = $('#movement-form');
    const tabs = $$('#movement-tabs .tab');

    let currentType = 'inward';

    if (btnNew) btnNew.addEventListener('click', () => modal.classList.add('open'));
    if (btnCancel) btnCancel.addEventListener('click', () => modal.classList.remove('open'));
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentType = tab.dataset.type;
        updateMovementFormUI(currentType);
      });
    });

    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const productId = $('#mv-product').value;
      const quantity = parseInt($('#mv-quantity').value, 10);
      const reason = $('#mv-reason').value.trim() || undefined;

      if (!productId || !quantity) { showToast('Product and quantity are required', 'error'); return; }

      try {
        if (currentType === 'inward') {
          const binId = $('#mv-to-bin').value;
          if (!binId) { showToast('Destination bin is required', 'error'); return; }
          await api('/inventory/inward', { method: 'POST', body: JSON.stringify({ productId, binId, quantity, reason }) });
          showToast(`Inward: ${quantity} units added successfully`);
        } else if (currentType === 'transfer') {
          const fromBinId = $('#mv-from-bin').value;
          const toBinId = $('#mv-to-bin').value;
          if (!fromBinId || !toBinId) { showToast('Both From and To bins are required', 'error'); return; }
          if (fromBinId === toBinId) { showToast('Source and destination bins must be different', 'error'); return; }
          await api('/inventory/transfer', { method: 'POST', body: JSON.stringify({ productId, fromBinId, toBinId, quantity, reason }) });
          showToast(`Transfer: ${quantity} units relocated successfully`);
        } else if (currentType === 'adjust') {
          const binId = $('#mv-to-bin').value;
          if (!binId) { showToast('Bin is required for adjustment', 'error'); return; }
          await api('/inventory/adjust', { method: 'POST', body: JSON.stringify({ productId, binId, quantity, reason: reason || 'Audit adjustment' }) });
          showToast(`Adjustment: set to ${quantity} units`);
        }

        modal.classList.remove('open');
        form.reset();
        loadMovements();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  function updateMovementFormUI(type) {
    const fromGroup = $('#mv-from-group');
    const toLabel = $('#mv-to-label');
    if (type === 'transfer') {
      if (fromGroup) fromGroup.style.display = 'block';
      if (toLabel) toLabel.textContent = 'To Bin (Destination)';
    } else if (type === 'adjust') {
      if (fromGroup) fromGroup.style.display = 'none';
      if (toLabel) toLabel.textContent = 'Bin Location';
    } else {
      if (fromGroup) fromGroup.style.display = 'none';
      if (toLabel) toLabel.textContent = 'To Bin (Destination)';
    }
  }

  function populateBinSelects() {
    const opts = '<option value="">Select bin…</option>' +
      allBins.map(b => `<option value="${b.id}">${b.label}</option>`).join('');
    const toBin = $('#mv-to-bin');
    const fromBin = $('#mv-from-bin');
    if (toBin) toBin.innerHTML = opts;
    if (fromBin) fromBin.innerHTML = opts;
  }

  async function loadMovements() {
    const tb = $('#movements-body');
    if (!tb) return;

    try {
      const moves = await api('/dashboard/recent-movements?limit=50');
      if (moves.length === 0) { tb.innerHTML = '<tr><td colspan="7" class="empty-state">No movements recorded</td></tr>'; return; }

      tb.innerHTML = moves.map(m => `
        <tr>
          <td>${fmtTime(m.timestamp)}</td>
          <td style="font-weight:600">${m.product.name}</td>
          <td><span class="sku">${m.product.sku}</span></td>
          <td><span class="badge ${typeBadge[m.type] || 'badge-gray'}">${m.type}</span></td>
          <td class="right" style="font-weight:700">${m.quantity}</td>
          <td class="location">${m.fromBin ? m.fromBin.code : '—'} → ${m.toBin ? m.toBin.code : '—'}</td>
          <td style="font-size:12px;color:#64748b">${m.reason || '—'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="7" class="empty-state">Error loading movements</td></tr>';
      console.warn('Movements error:', e);
    }
  }

  // ─── 5. WAREHOUSES ─────────────────────────────────────────
  let allBinMap = new Map();

  async function initWarehouses() {
    const grid = $('#wh-grid');
    if (!grid) return;

    // Modal close listeners for shelf modal
    $('#btn-close-shelf-modal')?.addEventListener('click', () => $('#modal-shelf-details')?.classList.remove('open'));
    $('#btn-cancel-shelf-modal')?.addEventListener('click', () => $('#modal-shelf-details')?.classList.remove('open'));
    $('#modal-shelf-details')?.addEventListener('click', (e) => {
      if (e.target === $('#modal-shelf-details')) $('#modal-shelf-details').classList.remove('open');
    });

    try {
      const warehouses = await api('/warehouses');
      if (warehouses.length === 0) { grid.innerHTML = '<div class="empty-state">No warehouses found</div>'; return; }

      allBinMap.clear();
      let html = '';
      for (const wh of warehouses) {
        let hierarchy;
        try { hierarchy = await api(`/warehouses/${wh.id}/rows`); } catch { hierarchy = { rows: [] }; }
        const rows = hierarchy.rows || [];

        html += `<div class="wh-card">
          <h2>${hierarchy.name || wh.name}</h2>
          <div class="wh-code">${hierarchy.code || wh.code}</div>
          ${(hierarchy.address || wh.address) ? `<div class="wh-addr">${hierarchy.address || wh.address}</div>` : ''}
          <div class="row-grid">
            ${rows.length === 0 ? '<div class="empty-state">No rows</div>' : rows.map(r => `
              <div class="row-card">
                <h3><span class="material-symbols-outlined">view_column</span> ${r.code}</h3>
                <div class="bin-list">
                  ${(r.bins || []).map(b => {
                    const totalQty = b.totalUnits != null ? b.totalUnits : (b.products || []).reduce((s, p) => s + p.quantity, 0);
                    allBinMap.set(b.id, {
                      bin: b,
                      warehouseName: hierarchy.name || wh.name,
                      rowCode: r.code,
                    });
                    return `<div class="bin-chip" style="cursor:pointer;" onclick="window.openShelfDetail('${b.id}')" title="Click to inspect shelf details">${b.code}<span class="bin-qty">${totalQty}</span></div>`;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
      }
      grid.innerHTML = html;
    } catch (e) {
      grid.innerHTML = '<div class="empty-state">Error loading warehouses</div>';
      console.warn('Warehouse error:', e);
    }
  }

  window.openShelfDetail = async function(binId) {
    const data = allBinMap.get(binId);
    const modal = $('#modal-shelf-details');
    if (!modal) return;

    const shelfTitle = $('#modal-shelf-title');
    const shelfSub = $('#modal-shelf-sub');
    const productsList = $('#modal-shelf-products-list');
    const btnScan = $('#modal-shelf-btn-scan');

    const binCode = data ? data.bin.code : 'Shelf';
    const whName = data ? data.warehouseName : 'Warehouse';
    const rowCode = data ? data.rowCode : 'Row';

    if (shelfTitle) shelfTitle.textContent = `Shelf ${binCode}`;
    if (shelfSub) shelfSub.textContent = `${whName} · Row ${rowCode} · Bin ID: ${binId.slice(0, 8)}...`;
    if (btnScan) btnScan.href = `/scanner.html?qr=${encodeURIComponent(binCode)}`;

    if (productsList) productsList.innerHTML = '<div class="empty-state">Loading shelf contents...</div>';
    modal.classList.add('open');

    try {
      const invData = await api(`/bins/${binId}/inventory`);
      const items = invData.inventories || invData || [];

      if (!items || items.length === 0) {
        productsList.innerHTML = '<div class="empty-state">No products currently stored on this shelf bin.</div>';
        return;
      }

      productsList.innerHTML = items.map(item => {
        const p = item.product || item;
        const qty = item.quantity != null ? item.quantity : (p.quantity || 0);
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); margin-bottom:8px;">
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:14px;">${p.name || 'Product'}</div>
              <div style="font-size:12px; color:var(--text-muted); display:flex; gap:8px; margin-top:2px;">
                <span class="sku">${p.sku || 'SKU'}</span>
                <span>${p.category || 'General'}</span>
                <span>$${p.price ? Number(p.price).toFixed(2) : '—'}</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-mono); font-weight:700; font-size:16px; color:var(--primary-text);">${qty} units</div>
              <div style="font-size:11px; color:var(--text-muted);">on shelf</div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.warn('Failed to load shelf inventory:', err);
      // Fallback to local products list
      if (data && data.bin && data.bin.products && data.bin.products.length > 0) {
        productsList.innerHTML = data.bin.products.map(p => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); margin-bottom:8px;">
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:14px;">${p.name || 'Product'}</div>
              <div style="font-size:12px; color:var(--text-muted); display:flex; gap:8px; margin-top:2px;">
                <span class="sku">${p.sku || 'SKU'}</span>
                <span>${p.category || 'General'}</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-mono); font-weight:700; font-size:16px; color:var(--primary-text);">${p.quantity} units</div>
              <div style="font-size:11px; color:var(--text-muted);">on shelf</div>
            </div>
          </div>
        `).join('');
      } else {
        productsList.innerHTML = '<div class="empty-state">No products currently stored on this shelf bin.</div>';
      }
    }
  };

  // ─── 6. SCANNER (Camera QR + Shelf Verification + Adjuster) ──
  let cameraStream = null;
  let scanningActive = false;
  let currentScannedShelf = null;
  let currentScannedProduct = null;

  async function initScanner() {
    const video = $('#camera-video');
    const canvas = $('#camera-canvas');
    const btnToggle = $('#btn-toggle-camera');
    const btnPreset = $('#btn-load-preset');
    const btnManual = $('#btn-manual-scan');

    // Stepper buttons
    $('#step-minus-10')?.addEventListener('click', () => adjustQtyInput(-10));
    $('#step-minus-1')?.addEventListener('click', () => adjustQtyInput(-1));
    $('#step-plus-1')?.addEventListener('click', () => adjustQtyInput(1));
    $('#step-plus-10')?.addEventListener('click', () => adjustQtyInput(10));

    // Preset scan
    if (btnPreset) {
      btnPreset.addEventListener('click', () => {
        const val = $('#preset-qr-select')?.value;
        if (!val) { showToast('Please select a preset QR code', 'error'); return; }
        handleQrScan(val);
      });
    }

    // Manual scan
    if (btnManual) {
      btnManual.addEventListener('click', () => {
        const val = $('#manual-qr-input')?.value.trim();
        if (!val) { showToast('Please enter a QR code to verify', 'error'); return; }
        handleQrScan(val);
      });
    }

    // Camera Toggle
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        if (scanningActive) stopCamera();
        else startCamera();
      });
    }

    // Product selection on shelf change
    $('#shelf-product-select')?.addEventListener('change', (e) => {
      const prodId = e.target.value;
      if (!currentScannedShelf || !currentScannedShelf.products) return;
      const p = currentScannedShelf.products.find(x => x.id === prodId);
      if (p) {
        currentScannedProduct = p;
        $('#shelf-current-qty').textContent = p.quantity;
        $('#shelf-new-qty').value = p.quantity;
      }
    });

    // Confirm Quantity Update
    $('#btn-submit-adjust')?.addEventListener('click', async () => {
      if (!currentScannedShelf || !currentScannedProduct) {
        showToast('No shelf product selected', 'error');
        return;
      }
      const newQty = parseInt($('#shelf-new-qty').value, 10);
      const reason = $('#shelf-adjust-reason').value || 'Cycle count recount';

      if (isNaN(newQty) || newQty < 0) {
        showToast('Please enter a valid positive quantity', 'error');
        return;
      }

      try {
        await api('/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({
            productId: currentScannedProduct.id,
            binId: currentScannedShelf.id,
            quantity: newQty,
            reason
          })
        });

        showToast(`✅ Updated quantity on Shelf ${currentScannedShelf.code} to ${newQty} units!`);
        currentScannedProduct.quantity = newQty;
        $('#shelf-current-qty').textContent = newQty;
        $('#scan-status-badge').textContent = 'UPDATED & SYNCED';
        $('#scan-status-badge').className = 'badge badge-green';
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  function adjustQtyInput(delta) {
    const input = $('#shelf-new-qty');
    if (!input) return;
    const current = parseInt(input.value, 10) || 0;
    input.value = Math.max(0, current + delta);
  }

  async function startCamera() {
    const video = $('#camera-video');
    const btnToggle = $('#btn-toggle-camera');

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = cameraStream;
      video.setAttribute('playsinline', true);
      video.play();
      scanningActive = true;
      btnToggle.innerHTML = '<span class="material-symbols-outlined">videocam_off</span> Stop Camera';
      btnToggle.className = 'btn btn-outline';
      requestAnimationFrame(scanVideoFrame);
      showToast('Camera active — scan shelf QR code');
    } catch (err) {
      console.warn('Camera access error:', err);
      showToast('Camera unavailable. Use Quick Presets or manual input.', 'error');
    }
  }

  function stopCamera() {
    const video = $('#camera-video');
    const btnToggle = $('#btn-toggle-camera');
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    scanningActive = false;
    btnToggle.innerHTML = '<span class="material-symbols-outlined">videocam</span> Start Camera';
    btnToggle.className = 'btn btn-green';
  }

  function scanVideoFrame() {
    if (!scanningActive) return;
    const video = $('#camera-video');
    const canvas = $('#camera-canvas');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (window.jsQR) {
        const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert'
        });
        if (code && code.data) {
          handleQrScan(code.data);
          stopCamera();
          return;
        }
      }
    }
    requestAnimationFrame(scanVideoFrame);
  }

  async function handleQrScan(qrString) {
    try {
      const result = await api('/qr/verify', {
        method: 'POST',
        body: JSON.stringify({ qrCode: qrString })
      });

      if (!result.verified) {
        showToast(result.message || 'QR code is not registered', 'error');
        $('#scan-status-badge').textContent = 'INVALID QR';
        $('#scan-status-badge').className = 'badge badge-red';
        return;
      }

      $('#scan-empty-state').style.display = 'none';
      $('#scan-verified-panel').style.display = 'block';

      if (result.shelfBin) {
        // Shelf QR Scanned
        currentScannedShelf = result.shelfBin;
        $('#loc-title').textContent = `Shelf ${result.shelfBin.code} (${result.shelfBin.warehouse || 'WH01'} · ${result.shelfBin.row || 'R01'})`;
        $('#loc-subtitle').textContent = `${result.shelfBin.warehouseName || 'Warehouse Facility'} — Spatial Node ID: ${result.shelfBin.id}`;
        $('#loc-qr-code').textContent = result.shelfBin.qrCode || qrString;
        $('#scan-status-badge').textContent = 'VERIFIED SHELF';
        $('#scan-status-badge').className = 'badge badge-green';

        // Populate products on this shelf
        const pSelect = $('#shelf-product-select');
        const prods = result.shelfBin.products || [];
        if (prods.length === 0) {
          // If no products on shelf, fetch global product catalog so user can place product
          const allP = await api('/products');
          pSelect.innerHTML = '<option value="">Select product to assign to this shelf…</option>' +
            allP.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');
          currentScannedShelf.products = allP.map(p => ({ id: p.id, name: p.name, sku: p.sku, quantity: 0 }));
          $('#shelf-current-qty').textContent = '0';
          $('#shelf-new-qty').value = '0';
        } else {
          pSelect.innerHTML = prods.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');
          currentScannedProduct = prods[0];
          $('#shelf-current-qty').textContent = currentScannedProduct.quantity;
          $('#shelf-new-qty').value = currentScannedProduct.quantity;
        }

        showToast(`Verified Shelf ${result.shelfBin.code}!`);
      } else if (result.product) {
        // Product QR Scanned
        const prod = result.product;
        const loc = result.location;
        $('#loc-title').textContent = `${prod.name} (${prod.sku})`;
        $('#loc-subtitle').textContent = `Category: ${prod.category || 'General'} · System Total Stock: ${result.availableQuantity} units`;
        $('#loc-qr-code').textContent = qrString;
        $('#scan-status-badge').textContent = 'VERIFIED PRODUCT';
        $('#scan-status-badge').className = 'badge badge-blue';

        if (loc) {
          currentScannedShelf = { id: loc.binId, code: loc.shelf, warehouse: loc.warehouse, row: loc.row };
          currentScannedProduct = { id: prod.id, name: prod.name, sku: prod.sku, quantity: loc.quantity };
          $('#shelf-product-select').innerHTML = `<option value="${prod.id}">${prod.name} (${prod.sku}) — Shelf ${loc.shelf}</option>`;
          $('#shelf-current-qty').textContent = loc.quantity;
          $('#shelf-new-qty').value = loc.quantity;
        } else {
          showToast(`Product verified! No shelf assigned yet.`, 'error');
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ─── 7. ADMIN PANEL (Protected Operations & Management) ───
  async function initAdmin() {
    // ALWAYS clear auth tokens on entering admin panel so it ALWAYS asks for username & password
    try {
      sessionStorage.removeItem('sf_admin_token');
      localStorage.removeItem('sf_token');
    } catch {}

    checkAdminAuth();

    // Tab switching
    $$('.admin-nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.admin-nav-tab').forEach(t => t.classList.remove('active'));
        $$('.admin-tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = $(`#${tab.dataset.tab}`);
        if (target) target.classList.add('active');

        if (tab.dataset.tab === 'tab-thresholds') loadAdminThresholds();
        if (tab.dataset.tab === 'tab-audit-logs') loadAdminAuditLogs();
      });
    });

    // Form login
    $('#admin-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawUser = ($('#admin-username')?.value || '').trim();
      const password = $('#admin-password')?.value || '';

      if (!rawUser || !password) {
        showToast('Please enter both username and password', 'error');
        return;
      }

      // If user typed username without domain (e.g. "admin"), map to "admin@stockflow.internal"
      const email = rawUser.includes('@') ? rawUser : `${rawUser}@stockflow.internal`;
      await performAdminLogin(email, password);
    });

    // Logout
    $('#btn-admin-logout')?.addEventListener('click', () => {
      sessionStorage.removeItem('sf_admin_token');
      localStorage.removeItem('sf_token');
      showToast('Signed out of admin session');
      checkAdminAuth();
    });

    // Shortcut to Add Product from Thresholds tab
    $('#btn-goto-add-product')?.addEventListener('click', () => {
      const tab = $('[data-tab="tab-add-product"]');
      if (tab) tab.click();
    });

    // Create Product Form
    $('#form-create-product')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sku = $('#prod-sku').value.trim().toUpperCase();
      const name = $('#prod-name').value.trim();
      const category = $('#prod-category').value.trim();
      const price = parseFloat($('#prod-price').value) || 0;
      const minStockLevel = parseInt($('#prod-min-stock').value, 10) || 10;
      const unit = $('#prod-unit').value.trim() || 'pcs';
      const barcode = $('#prod-barcode').value.trim() || undefined;

      try {
        await api('/products', {
          method: 'POST',
          body: JSON.stringify({ sku, name, category, price, minStockLevel, unit, barcode })
        });
        showToast(`✅ Product ${sku} registered successfully!`);
        $('#form-create-product').reset();
        loadAdminThresholds();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Create Warehouse Form
    $('#form-create-warehouse')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = $('#wh-code').value.trim().toUpperCase();
      const name = $('#wh-name').value.trim();
      const address = $('#wh-address').value.trim();
      const totalCapacity = parseInt($('#wh-capacity').value, 10) || 500;

      try {
        await api('/warehouses', {
          method: 'POST',
          body: JSON.stringify({ code, name, address, totalCapacity })
        });
        showToast(`✅ Warehouse ${code} provisioned successfully!`);
        $('#form-create-warehouse').reset();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  async function performAdminLogin(email, password) {
    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      sessionStorage.setItem('sf_admin_token', res.token);
      showToast(`Welcome back, ${res.user?.name || 'Administrator'}!`);
      checkAdminAuth();
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'error');
    }
  }

  async function checkAdminAuth() {
    const loginView = $('#admin-login-view');
    const panelView = $('#admin-panel-view');
    const userBadge = $('#admin-user-badge');
    const userName = $('#admin-user-name');

    const token = sessionStorage.getItem('sf_admin_token');
    if (!token) {
      if (loginView) loginView.style.display = 'block';
      if (panelView) panelView.style.display = 'none';
      if (userBadge) userBadge.style.display = 'none';
      return;
    }

    try {
      const user = await api('/auth/me');
      if (user && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
        if (loginView) loginView.style.display = 'none';
        if (panelView) panelView.style.display = 'block';
        if (userBadge) userBadge.style.display = 'flex';
        if (userName) userName.textContent = `${user.name} (${user.role})`;
        loadAdminThresholds();
      } else {
        throw new Error('Unauthorized role');
      }
    } catch {
      sessionStorage.removeItem('sf_admin_token');
      localStorage.removeItem('sf_token');
      if (loginView) loginView.style.display = 'block';
      if (panelView) panelView.style.display = 'none';
      if (userBadge) userBadge.style.display = 'none';
    }
  }

  async function loadAdminThresholds() {
    const tb = $('#admin-thresholds-body');
    if (!tb) return;

    try {
      const products = await api('/products');
      if (products.length === 0) { tb.innerHTML = '<tr><td colspan="5" class="empty-state">No products found</td></tr>'; return; }

      tb.innerHTML = products.map(p => `
        <tr>
          <td style="font-weight:600; color:var(--text-main);">${p.name}</td>
          <td><span class="sku">${p.sku}</span></td>
          <td class="right" style="font-weight:700; font-family:var(--font-mono);">${p.totalQuantity} units</td>
          <td>
            <div class="threshold-stepper">
              <input type="number" min="0" value="${p.minStockLevel}" id="thresh-${p.id}">
              <button type="button" class="btn btn-green btn-sm" onclick="window.saveThreshold('${p.id}')">
                <span class="material-symbols-outlined" style="font-size:15px">check</span> Update
              </button>
            </div>
          </td>
          <td class="right">
            <button type="button" class="btn btn-outline btn-sm" style="color:var(--red-text);" onclick="window.deleteSku('${p.id}', '${p.sku}')">
              <span class="material-symbols-outlined" style="font-size:15px">delete</span> Delete
            </button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="5" class="empty-state">Error loading products</td></tr>';
    }
  }

  window.saveThreshold = async function (id) {
    const input = $(`#thresh-${id}`);
    if (!input) return;
    const minStockLevel = parseInt(input.value, 10);
    if (isNaN(minStockLevel) || minStockLevel < 0) {
      showToast('Please enter a valid non-negative threshold number', 'error');
      return;
    }
    try {
      await api(`/products/${id}`, { method: 'PATCH', body: JSON.stringify({ minStockLevel }) });
      showToast(`✅ Safety threshold updated to ${minStockLevel} units!`);
      loadAdminThresholds();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.deleteSku = async function (id, sku) {
    if (!confirm(`Are you sure you want to decommission and delete SKU: ${sku}?`)) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      showToast(`✅ SKU ${sku} deleted successfully!`);
      loadAdminThresholds();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  async function loadAdminAuditLogs() {
    const tb = $('#admin-audit-body');
    if (!tb) return;

    try {
      const moves = await api('/dashboard/recent-movements?limit=30');
      tb.innerHTML = moves.map(m => `
        <tr>
          <td>${fmtTime(m.timestamp)}</td>
          <td><span class="badge ${typeBadge[m.type] || 'badge-gray'}">${m.type}</span></td>
          <td><span class="sku">${m.product.sku}</span> (${m.toBin ? m.toBin.code : '—'})</td>
          <td><span class="badge badge-green">VERIFIED</span></td>
          <td style="font-size:12px;color:#64748b">${m.userId ? 'System Admin' : 'Autonomous Operator'}</td>
        </tr>
      `).join('');
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="5" class="empty-state">Error loading audit log</td></tr>';
    }
  }

  // ─── Router ────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('products.html')) initProducts();
    else if (path.includes('orders.html')) initOrders();
    else if (path.includes('movements.html')) initMovements();
    else if (path.includes('warehouses.html')) initWarehouses();
    else if (path.includes('scanner.html')) initScanner();
    else if (path.includes('admin.html')) initAdmin();
    else initDashboard();
  });
})();
