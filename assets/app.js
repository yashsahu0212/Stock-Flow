/* ============================================================
   WAREFLOW — App Controller (Mobile + Role Management)
   Handles: bottom nav, mobile header, role switching, search,
   accordion interactions, pick confirmations, and toast system.
   ============================================================ */

(function () {
  'use strict';

  // ── State ───────────────────────────────────────────────────
  const STORAGE_KEY = 'wareflow_role';
  const DEFAULT_ROLE = 'USER';

  function getRole() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_ROLE;
  }

  function setRole(role) {
    localStorage.setItem(STORAGE_KEY, role);
  }

  // ── Detect current page ─────────────────────────────────────
  function getCurrentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    if (path === '' || path === 'index.html') return 'home';
    if (path === 'products.html') return 'products';
    if (path === 'orders.html') return 'orders';
    if (path === 'smart-picking.html') return 'picking';
    if (path === 'admin.html') return 'admin';
    if (path === 'profile.html') return 'profile';
    if (path === 'movements.html') return 'movements';
    return 'home';
  }

  // ── Inject Mobile Header ────────────────────────────────────
  function injectMobileHeader() {
    if (document.querySelector('.wf-mobile-header')) return;

    const header = document.createElement('div');
    header.className = 'wf-mobile-header';
    header.innerHTML = `
      <div class="wf-logo-section">
        <img src="assets/logo.svg" alt="WAREFLOW">
        <span class="wf-brand-name">WAREFLOW</span>
      </div>
      <div class="wf-header-actions">
        <button class="wf-header-btn" aria-label="Notifications">
          <span class="material-symbols-outlined">notifications</span>
          <span class="wf-notif-badge">3</span>
        </button>
        <a href="profile.html" class="wf-avatar" aria-label="Profile">
          <span class="material-symbols-outlined" style="font-size:18px;">person</span>
        </a>
      </div>
    `;
    document.body.prepend(header);
  }

  // ── Inject Bottom Navigation ────────────────────────────────
  function injectBottomNav() {
    if (document.querySelector('.wf-bottom-nav')) return;

    const role = getRole();
    const currentPage = getCurrentPage();

    const userTabs = [
      { id: 'home', icon: 'home', label: 'Home', href: 'index.html' },
      { id: 'products', icon: 'inventory_2', label: 'Products', href: 'products.html' },
      { id: 'orders', icon: 'local_shipping', label: 'Orders', href: 'orders.html' },
      { id: 'picking', icon: 'barcode_scanner', label: 'Picking', href: 'smart-picking.html' },
      { id: 'profile', icon: 'person', label: 'Profile', href: 'profile.html' },
    ];

    const adminTabs = [
      { id: 'home', icon: 'home', label: 'Home', href: 'index.html' },
      { id: 'products', icon: 'inventory_2', label: 'Products', href: 'products.html' },
      { id: 'orders', icon: 'local_shipping', label: 'Orders', href: 'orders.html' },
      { id: 'admin', icon: 'admin_panel_settings', label: 'Admin', href: 'admin.html' },
      { id: 'profile', icon: 'person', label: 'Profile', href: 'profile.html' },
    ];

    const tabs = role === 'ADMIN' ? adminTabs : userTabs;

    const nav = document.createElement('nav');
    nav.className = 'wf-bottom-nav';
    nav.setAttribute('aria-label', 'Main Navigation');

    tabs.forEach(tab => {
      const isActive = tab.id === currentPage || 
        (tab.id === 'picking' && currentPage === 'picking') ||
        (tab.id === 'admin' && currentPage === 'admin');
      const a = document.createElement('a');
      a.href = tab.href;
      a.className = isActive ? 'active' : '';
      a.setAttribute('aria-label', tab.label);
      a.innerHTML = `
        <span class="material-symbols-outlined">${tab.icon}</span>
        <span>${tab.label}</span>
      `;
      nav.appendChild(a);
    });

    document.body.appendChild(nav);
  }

  // ── Mark desktop elements ───────────────────────────────────
  function markDesktopElements() {
    // Mark the desktop sidebar
    const sidebar = document.querySelector('body > aside');
    if (sidebar) {
      sidebar.classList.add('wf-sidebar');
    }

    // Mark the desktop header
    const mainWrapper = document.querySelector('.pl-72, div.pl-72');
    if (mainWrapper) {
      const header = mainWrapper.querySelector(':scope > header');
      if (header) {
        header.classList.add('wf-desktop-header');
      }
    }
  }

  // ── Role-Based Content Switching ────────────────────────────
  function applyRoleContent() {
    const role = getRole();
    const page = getCurrentPage();

    // Show/hide role-specific sections
    document.querySelectorAll('[data-role]').forEach(el => {
      const elRole = el.getAttribute('data-role');
      if (elRole === role || elRole === 'ALL') {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });

    // Update profile page role display
    const roleDisplay = document.getElementById('wf-current-role');
    if (roleDisplay) {
      roleDisplay.textContent = role;
    }

    // Update role radio buttons
    document.querySelectorAll('.wf-role-option').forEach(opt => {
      const optRole = opt.getAttribute('data-role-value');
      if (optRole === role) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    // Update greeting based on role
    const greetingEl = document.getElementById('wf-greeting');
    if (greetingEl) {
      if (role === 'ADMIN') {
        greetingEl.textContent = 'Warehouse Overview';
      } else {
        const hour = new Date().getHours();
        let greeting = 'Good Morning';
        if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
        else if (hour >= 17) greeting = 'Good Evening';
        greetingEl.textContent = `${greeting}, Alex`;
      }
    }
  }

  // ── Role Switch Handler ─────────────────────────────────────
  function initRoleSwitch() {
    document.querySelectorAll('.wf-role-option').forEach(opt => {
      opt.addEventListener('click', function () {
        const newRole = this.getAttribute('data-role-value');
        if (newRole && newRole !== getRole()) {
          setRole(newRole);
          showToast(`Switched to ${newRole} role`, 'success');
          
          // Rebuild bottom nav
          const existingNav = document.querySelector('.wf-bottom-nav');
          if (existingNav) existingNav.remove();
          injectBottomNav();

          applyRoleContent();
        }
      });
    });
  }

  // ── Accordion Handler ───────────────────────────────────────
  function initAccordions() {
    document.querySelectorAll('.wf-accordion-header').forEach(header => {
      header.addEventListener('click', function () {
        const accordion = this.closest('.wf-accordion');
        if (accordion) {
          accordion.classList.toggle('open');
        }
      });
    });
  }

  // ── Pick Confirm Handler ────────────────────────────────────
  function initPickConfirm() {
    const confirmBtn = document.getElementById('wf-confirm-pick-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        // Simulate pick confirmation
        this.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Confirmed!';
        this.style.background = '#10B981';
        showToast('Pick confirmed! Moving to next location...', 'success');
        
        setTimeout(() => {
          this.innerHTML = '<span class="material-symbols-outlined">check_circle</span> CONFIRM PICK';
          this.style.background = '#006948';
        }, 2000);
      });
    }
  }

  // ── Toast Notification System ───────────────────────────────
  function showToast(message, type = 'info') {
    let toast = document.getElementById('wf-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'wf-toast';
      toast.className = 'wf-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `wf-toast ${type}`;

    // Trigger show
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }
  
  // Expose showToast globally
  window.wfShowToast = showToast;

  // ── Mobile Search Overlay ───────────────────────────────────
  function initMobileSearch() {
    const searchInputs = document.querySelectorAll('.wf-quick-search input, .wf-mobile-search-input');
    searchInputs.forEach(input => {
      input.addEventListener('focus', function() {
        // Show recent searches container if exists
        const recents = this.closest('.wf-quick-search')?.querySelector('.wf-recent-searches');
        if (recents) recents.style.display = 'block';
      });

      input.addEventListener('blur', function() {
        setTimeout(() => {
          const recents = this.closest('.wf-quick-search')?.querySelector('.wf-recent-searches');
          if (recents) recents.style.display = 'none';
        }, 200);
      });
    });
  }

  // ── Filter Chip Handler ─────────────────────────────────────
  function initFilterChips() {
    document.querySelectorAll('.wf-filter-chips').forEach(container => {
      container.querySelectorAll('.wf-chip').forEach(chip => {
        chip.addEventListener('click', function () {
          container.querySelectorAll('.wf-chip').forEach(c => c.classList.remove('active'));
          this.classList.add('active');

          const filter = this.getAttribute('data-filter');
          const target = container.getAttribute('data-target');
          filterCards(target, filter);
        });
      });
    });
  }

  function filterCards(targetId, filter) {
    const container = document.getElementById(targetId);
    if (!container) return;

    container.querySelectorAll('[data-type]').forEach(card => {
      if (filter === 'ALL' || card.getAttribute('data-type') === filter) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // ── Adjust main content padding for mobile header ───────────
  function adjustMainPadding() {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      const main = document.querySelector('main');
      if (main) {
        main.style.paddingTop = '56px';
      }
    }
  }

  // ── Initialize Everything ───────────────────────────────────
  function init() {
    markDesktopElements();
    injectMobileHeader();
    injectBottomNav();
    applyRoleContent();
    initRoleSwitch();
    initAccordions();
    initPickConfirm();
    initMobileSearch();
    initFilterChips();
    adjustMainPadding();

    // Re-adjust on resize
    window.addEventListener('resize', () => {
      adjustMainPadding();
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
