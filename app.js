/**
 * Antigravity Admin Portal - Multi-Role Engine (Super Admin & Shop Owner)
 * Supports Super Admin (Dashboard & Register Shops) and Store Owner (Merchant Backstage)
 * Fully connected to Supabase Cloud Authentication & PostgreSQL Database
 */

// =============================================================================
// 1. Initial State & Datasets
// =============================================================================

// Registered Shops (Synchronized with Supabase public.shops)
let savedShops = JSON.parse(localStorage.getItem('antigravity_platform_shops')) || [];
// Purge legacy mock shops so they never display when deleted from Supabase
savedShops = savedShops.filter(s => s && !['shop_bench_01', 'shop_zara_02', 'shop_uniqlo_03'].includes(s.id));
let shops = savedShops;

let currentUser = JSON.parse(localStorage.getItem('antigravity_current_user')) || {
  email: 'admin@antigravity.io',
  name: 'Super Administrator',
  role: 'admin',
  shopId: null
};

let isLoggedIn = localStorage.getItem('antigravity_admin_auth') === 'true';

// Products (live from Supabase public.products, scoped to the owner's shop)
let products = [];
let productsShopId = null;        // which shop the in-memory product catalog belongs to
let productsLoaded = false;
let productsLoading = false;
let productsError = null;

// Categories (live from Supabase public.categories, scoped to the owner's shop)
let categories = [];
let categoriesShopId = null;      // which shop the in-memory list belongs to
let categoriesLoaded = false;
let categoriesLoading = false;
let categoriesError = null;
let categoryFilter = 'active';    // 'active' | 'archived' | 'all'

// Dummy Orders
let orders = JSON.parse(localStorage.getItem('antigravity_admin_orders')) || [
  {
    id: 'ORD-9842',
    customer: 'Juan Dela Cruz',
    date: 'Today, 2:45 PM',
    item: 'Slim-Fit Oxford Button-Down Shirt',
    size: 'Size M',
    vtonRecommended: true,
    total: 58.00,
    payment: 'Credit Card',
    status: 'Delivered'
  },
  {
    id: 'ORD-9841',
    customer: 'Maria Santos',
    date: 'Today, 11:20 AM',
    item: 'Floral Tiered Midi Summer Dress',
    size: 'Size S',
    vtonRecommended: true,
    total: 89.00,
    payment: 'GCash',
    status: 'Processing'
  },
  {
    id: 'ORD-9840',
    customer: 'Liam Walker',
    date: 'Yesterday, 6:15 PM',
    item: 'Minimalist Heavyweight Zip Hoodie',
    size: 'Size L',
    vtonRecommended: true,
    total: 95.00,
    payment: 'Maya',
    status: 'Shipped'
  },
  {
    id: 'ORD-9839',
    customer: 'Sophia Reyes',
    date: 'Oct 15, 2026',
    item: 'High-Rise Straight Leg Denim Jeans',
    size: 'Size M',
    vtonRecommended: true,
    total: 79.50,
    payment: 'COD',
    status: 'Processing'
  },
  {
    id: 'ORD-9838',
    customer: 'Miguel Tan',
    date: 'Oct 14, 2026',
    item: 'Classic Oversized Heavyweight Tee',
    size: 'Size XL',
    vtonRecommended: false,
    total: 34.99,
    payment: 'Credit Card',
    status: 'Delivered'
  }
];

const liveFeedData = [
  { icon: 'fa-user-check', color: '#10b981', title: 'Fit Recommended: Size M', time: '2m ago', desc: 'Customer scanned Bench Slim Shirt (Confidence 98%)' },
  { icon: 'fa-camera-retro', color: '#06b6d4', title: 'Virtual Try-On Rendered', time: '6m ago', desc: 'Fashn AI generated preview for Floral Midi Dress' },
  { icon: 'fa-bag-shopping', color: '#6366f1', title: 'Item Added to Cart', time: '14m ago', desc: 'Added Size L Heavyweight Hoodie (VTON Verified)' },
  { icon: 'fa-ruler-combined', color: '#f59e0b', title: 'Body Scan Complete', time: '22m ago', desc: 'Extracted Chest 38in, Waist 32in, Inseam 30in' }
];

// =============================================================================
// 2. Initialization & Lifecycle
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  initAuthUI();
  applyRoleNavigation();
  renderProducts();
  renderCategories();
  renderOrders();
  renderLiveFeed();
  renderStats();
  updatePluginStateUI();

  // Load live data from Supabase Cloud
  await syncSupabaseShops();
});

// Sync registered shops from Supabase
async function syncSupabaseShops(showFeedback = false) {
  // Only the Super Admin works with the platform-wide shop list.
  // Store owners must never load other merchants' shops.
  if (currentUser.role !== 'admin') return;

  if (window.db && window.db.fetchShops) {
    const liveShops = await window.db.fetchShops();
    if (Array.isArray(liveShops)) {
      shops = liveShops;
      localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));
      renderSuperShops();
      if (showFeedback) {
        showToast(`Synced ${shops.length} store${shops.length === 1 ? '' : 's'} from Supabase.`, 'success');
      }
    } else {
      renderSuperShops();
    }
  } else {
    renderSuperShops();
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info')}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// =============================================================================
// 3. Multi-Role Authentication Flow (Super Admin vs Shop Owner)
// =============================================================================

function initAuthUI() {
  const authWrapper = document.getElementById('authWrapper');
  if (isLoggedIn) {
    authWrapper.classList.add('hidden');
  } else {
    authWrapper.classList.remove('hidden');
  }
}

// Quick 1-Click Login: Super Admin
function loginAsSuperAdmin() {
  currentUser = {
    email: 'admin@antigravity.io',
    name: 'Super Administrator',
    role: 'admin',
    shopId: null
  };
  completeLogin('Super Admin Console');
}

// Quick 1-Click Login: Store Owner
function loginAsStoreOwner() {
  currentUser = {
    email: 'owner@bench.com',
    name: 'Bench Store Owner',
    role: 'owner',
    shopId: 'shop_bench_01'
  };
  completeLogin('Bench Merchant Backstage');
}

// Live Supabase Authentication Form
async function handleLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('loginId');
  const passInput = document.getElementById('loginPassword');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  const email = emailInput.value.trim();
  const password = passInput.value;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying credentials...';

  // 1. Authenticate with Supabase Cloud
  if (window.db && window.db.login) {
    const res = await window.db.login(email, password);

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Dashboard';

    if (!res.success) {
      if (res.isCustomer) {
        // ⛔ Specific requirement: Customer accounts are banned from admin portal
        showToast('⛔ Access Denied: Customer accounts are prohibited from accessing this admin portal. Please use the customer mobile app.', 'error');
      } else {
        showToast(`Login failed: ${res.error}`, 'error');
      }
      return;
    }

    // Success: Populate authenticated session
    currentUser = {
      id: res.user.id,
      email: res.profile.email,
      name: res.profile.full_name || 'Authenticated User',
      role: res.role,
      shopId: res.shop?.id || null
    };

    if (res.shop) {
      // Map shop cleanly and store accurately
      const mappedShop = {
        id: res.shop.id,
        name: res.shop.name,
        code: (res.shop.store_code || '').toLowerCase(),
        ownerName: res.profile.full_name,
        ownerEmail: res.profile.email,
        category: res.shop.description ? res.shop.description.replace(' merchant store.', '') : 'Fashion & Apparel',
        vton_enabled: res.shop.vton_enabled === true,
        is_active: res.shop.is_active !== false
      };

      const existingIdx = shops.findIndex(s => s.id === res.shop.id);
      if (existingIdx !== -1) {
        shops[existingIdx] = mappedShop;
      } else {
        shops.push(mappedShop);
      }
      localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));
    }

    completeLogin(res.role === 'admin' ? 'Super Admin Console' : `${getCurrentShop().name} Merchant Portal`);

  } else {
    // Offline simulation fallback
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Dashboard';

    if (email.includes('admin')) {
      currentUser = { email, name: 'Super Administrator', role: 'admin', shopId: null };
    } else {
      const matched = shops.find(s => s.ownerEmail.toLowerCase() === email.toLowerCase()) || shops[0];
      currentUser = { email, name: matched.ownerName, role: 'owner', shopId: matched.id };
    }
    completeLogin(currentUser.role === 'admin' ? 'Super Admin Console' : `${getCurrentShop().name} Merchant Portal`);
  }
}

function completeLogin(title) {
  isLoggedIn = true;
  localStorage.setItem('antigravity_admin_auth', 'true');
  localStorage.setItem('antigravity_current_user', JSON.stringify(currentUser));

  document.getElementById('authWrapper').classList.add('hidden');
  showToast(`Welcome! Signed in to ${title}`, 'success');

  applyRoleNavigation();
  syncSupabaseShops();
}

async function handleLogout() {
  if (window.db && window.db.logout) {
    await window.db.logout();
  }
  isLoggedIn = false;
  currentUser = { email: '', name: '', role: '', shopId: null };
  localStorage.removeItem('antigravity_admin_auth');
  localStorage.removeItem('antigravity_current_user');
  resetCategoriesState();
  resetProductsState();
  isDownloading = false;
  document.getElementById('authWrapper').classList.remove('hidden');
  showToast('Logged out of session.', 'info');
}

function getCurrentShop() {
  const own = shops.find(s => s.id === currentUser.shopId);
  if (own) return own;
  // A store owner must never be handed another merchant's shop
  if (currentUser.role === 'owner') {
    return { id: null, name: 'Your Store', code: '', ownerName: currentUser.name || '', ownerEmail: currentUser.email || '', category: '', vton_enabled: false, is_active: true };
  }
  return shops[0];
}

// Pull the signed-in owner's live shop row (VTON flag, name, code) from Supabase
async function refreshOwnShopFromDb() {
  if (currentUser.role !== 'owner' || !UUID_RE.test(currentUser.shopId || '')) return;
  if (!window.db || !window.db.fetchShopState) return;

  const requestedShopId = currentUser.shopId;
  const live = await window.db.fetchShopState(requestedShopId);
  if (!live || currentUser.shopId !== requestedShopId) return; // missing, or a different user signed in meanwhile

  const idx = shops.findIndex(s => s.id === live.id);
  const merged = {
    ...(idx !== -1 ? shops[idx] : { ownerName: currentUser.name, ownerEmail: currentUser.email }),
    id: live.id,
    name: live.name,
    code: (live.store_code || '').toLowerCase(),
    category: live.description ? live.description.replace(' merchant store.', '') : 'Fashion & Apparel',
    vton_enabled: live.vton_enabled === true,
    is_active: live.is_active !== false
  };
  if (idx !== -1) shops[idx] = merged; else shops.push(merged);
  localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));

  updatePluginStateUI();
}

// =============================================================================
// 4. Role Navigation Configuration (Super Admin vs Store Owner)
// =============================================================================

function applyRoleNavigation() {
  const superNav = document.getElementById('superAdminNav');
  const ownerNav = document.getElementById('storeOwnerNav');
  const brandIcon = document.getElementById('sidebarBrandIcon');
  const title = document.getElementById('sidebarShopTitle');
  const roleSub = document.getElementById('sidebarRoleSubtitle');
  const topRoleBadge = document.getElementById('topRoleBadge');
  const topRoleText = document.getElementById('topRoleText');
  const userDisplayName = document.getElementById('userDisplayName');
  const userStoreCode = document.getElementById('userStoreCode');
  const avatarLetter = document.getElementById('avatarLetter');

  if (currentUser.role === 'admin') {
    // Super Admin View
    superNav.style.display = 'flex';
    ownerNav.style.display = 'none';

    brandIcon.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
    brandIcon.style.background = 'linear-gradient(135deg, #6366f1, #3b82f6)';
    title.textContent = 'Antigravity HQ';
    roleSub.textContent = 'Platform Governance';

    topRoleBadge.className = 'badge badge-indigo';
    topRoleBadge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> <span>Super Admin</span>';

    userDisplayName.textContent = currentUser.name || 'Super Administrator';
    userStoreCode.textContent = 'PLATFORM OWNER';
    avatarLetter.textContent = 'SA';

    switchTab('super-dashboard');
  } else {
    // Store Owner View
    superNav.style.display = 'none';
    ownerNav.style.display = 'flex';

    const shop = getCurrentShop();
    brandIcon.innerHTML = '<i class="fa-solid fa-vest-patches"></i>';
    brandIcon.style.background = 'linear-gradient(135deg, var(--primary), var(--accent-cyan))';
    title.textContent = shop.name;
    roleSub.textContent = 'Merchant Backstage';

    topRoleBadge.className = 'badge badge-cyan';
    topRoleBadge.innerHTML = '<i class="fa-solid fa-store"></i> <span>Store Owner</span>';

    userDisplayName.textContent = shop.name;
    userStoreCode.textContent = `CODE: ${shop.code}`;
    avatarLetter.textContent = (shop.name[0] || 'B').toUpperCase();

    // Fill settings inputs
    const nameInput = document.getElementById('settingStoreName');
    const codeInput = document.getElementById('settingStoreCode');
    const emailInput = document.getElementById('settingStoreEmail');
    if (nameInput) nameInput.value = shop.name;
    if (codeInput) codeInput.value = shop.code;
    if (emailInput) emailInput.value = shop.ownerEmail;

    // Load this shop's categories and products (sidebar badges + tabs)
    loadCategories();
    loadProducts();

    // Re-render the VTON plugin widget for THIS shop, then confirm it against the database
    updatePluginStateUI();
    refreshOwnShopFromDb();

    switchTab('dashboard');
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.remove('active');
  });

  const activeLinks = document.querySelectorAll(`a[onclick="switchTab('${tabName}')"]`);
  activeLinks.forEach(link => link.classList.add('active'));

  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`tab-${tabName}`);
  if (targetView) targetView.classList.add('active');

  const titles = {
    'super-dashboard': 'Super Admin | Platform Overview',
    'super-shops': 'Super Admin | Registered Shops Management',
    'dashboard': 'Store Dashboard Overview',
    'products': 'Garment Product Catalog',
    'categories': 'Apparel Categories',
    'orders': 'Customer Orders & Fit Breakdown',
    'settings': 'Store Settings & Plugin Deployment'
  };
  document.getElementById('pageTitle').textContent = titles[tabName] || 'Overview';

  // Automatically refresh live data from Supabase for Super Admin views
  if (tabName === 'super-dashboard' || tabName === 'super-shops') {
    syncSupabaseShops();
  }

  // Refresh this shop's products whenever the tab is opened
  if (tabName === 'products') {
    loadProducts(true);
  }

  // Refresh this shop's categories whenever the tab is opened
  if (tabName === 'categories') {
    loadCategories(true);
  }

  // Re-check the plugin state against the database when opening Settings
  if (tabName === 'settings') {
    refreshOwnShopFromDb();
  }
}

// =============================================================================
// 5. Super Admin Functions: Register New Merchant & Shop (LIVE SUPABASE SYNC)
// =============================================================================

// Auto-generate lowercase store code from shop name
function autoGenerateStoreCode(name) {
  const codeInput = document.getElementById('newShopCode');
  if (!codeInput) return;
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  codeInput.value = slug;
}

function autoGenerateEditStoreCode(name) {
  const codeInput = document.getElementById('editShopCode');
  if (!codeInput) return;
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  codeInput.value = slug;
}

function renderSuperShops() {
  const allTbody = document.getElementById('superAllShopsTbody');
  const recentTbody = document.getElementById('superRecentShopsTbody');
  const countBadge = document.getElementById('sidebarSuperShopsCount');
  const statBadge = document.getElementById('superStatShops');

  if (countBadge) countBadge.textContent = shops.length;
  if (statBadge) statBadge.textContent = shops.length;

  const searchVal = (document.getElementById('shopSearchInput')?.value || '').toLowerCase();
  const filtered = shops.filter(s => 
    s.name.toLowerCase().includes(searchVal) || 
    (s.code || '').toLowerCase().includes(searchVal) || 
    s.ownerEmail.toLowerCase().includes(searchVal) ||
    s.ownerName.toLowerCase().includes(searchVal)
  );

  const renderRow = (s, isRecent = false) => {
    const active = s.is_active !== false;
    const initial = (s.name || '?').trim().charAt(0).toUpperCase();
    return `
    <tr>
      <td>
        <div class="cell-store">
          <div class="cell-avatar">${initial}</div>
          <div class="cell-stack">
            <span class="cell-title">${s.name}</span>
            <span class="code-chip">${(s.code || '').toLowerCase()}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="cell-stack">
          <span class="cell-title">${s.ownerName}</span>
          <span class="cell-sub">${s.ownerEmail}</span>
        </div>
      </td>
      <td><span class="badge badge-indigo badge-nowrap">${s.category}</span></td>
      <td>
        <span class="badge badge-nowrap ${active ? 'badge-emerald' : 'badge-rose'}">
          <i class="fa-solid ${active ? 'fa-circle-check' : 'fa-ban'}"></i>
          ${active ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td>
        <span class="badge badge-nowrap ${s.vton_enabled ? 'badge-cyan' : 'badge-amber'}">
          <i class="fa-solid ${s.vton_enabled ? 'fa-wand-magic-sparkles' : 'fa-clock'}"></i>
          ${s.vton_enabled ? 'VTON Live' : 'VTON Off'}
        </span>
      </td>
      ${!isRecent ? `
        <td class="col-actions">
          <div class="row-actions">
            <button class="icon-btn" onclick="openEditShopModal('${s.id}')" title="Edit store details" aria-label="Edit store">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="icon-btn ${active ? 'icon-btn-warn' : 'icon-btn-success'}" onclick="toggleShopActive('${s.id}')" title="${active ? 'Deactivate store' : 'Activate store'}" aria-label="${active ? 'Deactivate store' : 'Activate store'}">
              <i class="fa-solid ${active ? 'fa-ban' : 'fa-circle-check'}"></i>
            </button>
            <button class="icon-btn icon-btn-cyan" onclick="toggleShopVton('${s.id}')" title="Toggle Virtual Try-On engine" aria-label="Toggle VTON">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </button>
            <span class="row-actions-divider"></span>
            <button class="icon-btn icon-btn-danger" onclick="handleDeleteShop('${s.id}')" title="Permanently delete shop" aria-label="Delete store">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      ` : ''}
    </tr>
  `;
  };

  // 1. Registered Shops Tab Table (All shops)
  if (allTbody) {
    if (filtered.length === 0) {
      allTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 56px 24px; color: var(--text-muted);">
            <i class="fa-solid fa-store" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 12px; display: block;"></i>
            <strong>No Registered Merchant Stores Found</strong>
            <div style="font-size: 0.8rem; color: var(--text-dim); margin-top: 6px;">Click the "+ Register New Shop" button above to add your first store into Supabase.</div>
          </td>
        </tr>
      `;
    } else {
      allTbody.innerHTML = filtered.map(s => renderRow(s, false)).join('');
    }
  }

  // 2. Super Admin Dashboard Tab Table (Recent shops overview)
  if (recentTbody) {
    if (shops.length === 0) {
      recentTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px 24px; color: var(--text-muted);">
            <i class="fa-solid fa-store-slash" style="color: var(--text-dim); margin-bottom: 8px; display: block;"></i>
            No merchant stores registered yet. Provision a new shop to see it here.
          </td>
        </tr>
      `;
    } else {
      recentTbody.innerHTML = shops.slice(0, 5).map(s => renderRow(s, true)).join('');
    }
  }
}

function filterShops() {
  renderSuperShops();
}

function openRegisterShopModal() {
  document.getElementById('newShopName').value = '';
  document.getElementById('newShopCode').value = '';
  document.getElementById('newOwnerName').value = '';
  document.getElementById('newOwnerEmail').value = '';
  document.getElementById('newOwnerPassword').value = 'password123';
  openModal('registerShopModal');
}

// Super Admin: Open Edit Shop Modal
function openEditShopModal(shopId) {
  const shop = shops.find(s => s.id === shopId);
  if (!shop) return;

  document.getElementById('editShopId').value = shop.id;
  document.getElementById('editShopName').value = shop.name;
  document.getElementById('editShopCode').value = (shop.code || '').toLowerCase();
  
  const catSelect = document.getElementById('editShopCategory');
  if (catSelect) {
    for (let opt of catSelect.options) {
      if (opt.value === shop.category) {
        opt.selected = true;
        break;
      }
    }
  }

  openModal('editShopModal');
}

// Super Admin: Save Edited Shop
async function handleSaveEditShop(e) {
  e.preventDefault();
  const shopId = document.getElementById('editShopId').value;
  const name = document.getElementById('editShopName').value.trim();
  const code = document.getElementById('editShopCode').value.trim().toLowerCase();
  const category = document.getElementById('editShopCategory').value;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving changes...';

  // Update in Supabase
  if (window.db && window.db.updateShop) {
    const res = await window.db.updateShop(shopId, { name, code, category });
    if (!res.success) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Shop Changes';
      showToast(`Failed to update shop: ${res.error}`, 'error');
      return;
    }
  }

  // Update in local state
  const idx = shops.findIndex(s => s.id === shopId);
  if (idx !== -1) {
    shops[idx].name = name;
    shops[idx].code = code;
    shops[idx].category = category;
    localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Shop Changes';
  closeModal('editShopModal');
  showToast(`Store "${name}" updated successfully!`, 'success');
  renderSuperShops();
}

// Super Admin: Activate / Deactivate Shop
async function toggleShopActive(shopId) {
  const shop = shops.find(s => s.id === shopId);
  if (!shop) return;

  const nextState = shop.is_active === false; // If currently false, make true; else false
  const actionName = nextState ? 'activate' : 'deactivate';

  if (confirm(`Are you sure you want to ${actionName} "${shop.name}"? ${!nextState ? 'The merchant will be prevented from accessing the portal.' : ''}`)) {
    shop.is_active = nextState;
    localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));

    if (window.db && window.db.toggleShopActive) {
      await window.db.toggleShopActive(shopId, nextState);
    }

    showToast(`Store "${shop.name}" has been ${nextState ? 'Activated' : 'Deactivated'}.`, nextState ? 'success' : 'info');
    renderSuperShops();
  }
}

// Super Admin: Delete Shop
async function handleDeleteShop(shopId) {
  const target = shops.find(s => s.id === shopId);
  const shopName = target ? target.name : 'this shop';
  if (!confirm(`Are you sure you want to permanently delete "${shopName}" from Supabase? This action cannot be undone.`)) {
    return;
  }

  if (window.db && window.db.deleteShop) {
    const res = await window.db.deleteShop(shopId);
    if (!res.success) {
      showToast(`Failed to delete shop from Supabase: ${res.error}`, 'error');
      return;
    }
  }

  shops = shops.filter(s => s.id !== shopId);
  localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));
  showToast(`Shop "${shopName}" has been deleted.`, 'info');
  renderSuperShops();
}

// Live Super Admin Provisioning Function (lowercase store code)
async function handleSuperRegisterShop(e) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');

  const name = document.getElementById('newShopName').value.trim();
  const code = document.getElementById('newShopCode').value.trim().toLowerCase();
  const category = document.getElementById('newShopCategory').value;
  const ownerName = document.getElementById('newOwnerName').value.trim();
  const ownerEmail = document.getElementById('newOwnerEmail').value.trim();
  const ownerPassword = document.getElementById('newOwnerPassword').value;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Provisioning in Supabase...';

  // 1. Call Supabase backend helper
  if (window.db && window.db.registerMerchantShop) {
    const result = await window.db.registerMerchantShop({
      name,
      code,
      category,
      ownerName,
      ownerEmail,
      ownerPassword
    });

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Register Shop & Provision';

    if (!result.success) {
      showToast(`Registration failed: ${result.error}`, 'error');
      return;
    }

    // Success: Add to local state
    const newShop = {
      id: result.shop.id,
      name: result.shop.name,
      code: (result.shop.store_code || code).toLowerCase(),
      ownerName: ownerName,
      ownerEmail: ownerEmail,
      category: category,
      vton_enabled: false,
      is_active: true,
      joinedDate: 'Just now'
    };

    shops.unshift(newShop);
    localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));

    closeModal('registerShopModal');
    showToast(`🎉 Shop "${name}" (${newShop.code}) provisioned in Supabase! Owner login: ${ownerEmail}`, 'success');
    renderSuperShops();

  } else {
    // Fallback simulation
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Register Shop & Provision';

    const newShop = {
      id: `shop_${code.toLowerCase()}_${Date.now()}`,
      name,
      code: code.toLowerCase(),
      ownerName,
      ownerEmail,
      category,
      vton_enabled: false,
      is_active: true,
      joinedDate: 'Today'
    };
    shops.unshift(newShop);
    localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));
    closeModal('registerShopModal');
    showToast(`🎉 Shop "${name}" (${newShop.code}) created!`, 'success');
    renderSuperShops();
  }
}

async function toggleShopVton(shopId) {
  const s = shops.find(item => item.id === shopId);
  if (!s) return;
  const previous = s.vton_enabled === true;
  const next = !previous;

  if (window.db && window.db.updateVtonStatus) {
    const res = await window.db.updateVtonStatus(shopId, next);
    if (!res.success) {
      showToast(`Could not update Virtual Try-On: ${escapeHtml(res.error)}`, 'error');
      return;
    }
  }

  s.vton_enabled = next;
  localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));
  showToast(`Updated Virtual Try-On for ${escapeHtml(s.name)}: ${s.vton_enabled ? 'Active' : 'Disabled'}`, 'info');
  renderSuperShops();
}

// =============================================================================
// 6. Shop Owner: Interactive Download Animation Toggle
// =============================================================================

let isDownloading = false;

function triggerPluginDownloadAnimation() {
  if (isDownloading) return;
  const shop = getCurrentShop();
  if (shop.vton_enabled) return;

  isDownloading = true;

  const container = document.getElementById('downloadToggleContainer');
  const downloadBtn = document.getElementById('btnStartDownload');
  const progressTrack = document.getElementById('downloadProgressTrack');
  const progressFill = document.getElementById('downloadProgressFill');
  const percentText = document.getElementById('downloadPercentText');
  const stepsLog = document.getElementById('downloadStepsLog');

  container.classList.add('is-downloading');
  downloadBtn.disabled = true;
  downloadBtn.style.opacity = '0.7';
  downloadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down download-arrow-icon"></i> <span>Downloading AI Package...</span>';
  progressTrack.style.display = 'block';
  progressFill.style.width = '0%';

  const steps = [
    { at: 10, label: 'Resolving dependency: body_measurement_plugin v1.2.0...' },
    { at: 35, label: 'Downloading YOLO-seg & Keypoint weights (12.4 MB)...' },
    { at: 65, label: 'Compiling circumference calculation & size matching matrices...' },
    { at: 88, label: 'Connecting to Supabase Cloud & configuring shops.vton_enabled...' },
    { at: 100, label: 'Finalizing installation & starting real-time mobile sync...' }
  ];

  let currentPercent = 0;
  const durationMs = 3000;
  const intervalMs = 40;
  const stepIncrement = 100 / (durationMs / intervalMs);

  const downloadTimer = setInterval(() => {
    currentPercent += stepIncrement;
    if (currentPercent > 100) currentPercent = 100;

    progressFill.style.width = `${Math.floor(currentPercent)}%`;
    percentText.textContent = `${Math.floor(currentPercent)}%`;

    for (let s of steps) {
      if (currentPercent >= s.at) {
        stepsLog.innerHTML = `<i class="fa-solid fa-gear fa-spin" style="color: var(--accent-cyan);"></i> <span>${s.label}</span>`;
      }
    }

    if (currentPercent >= 100) {
      clearInterval(downloadTimer);
      setTimeout(() => {
        finishDownloadAnimation();
      }, 400);
    }
  }, intervalMs);
}

async function finishDownloadAnimation() {
  isDownloading = false;
  const shop = getCurrentShop();

  if (window.db && window.db.updateVtonStatus) {
    const res = await window.db.updateVtonStatus(shop.id, true);
    if (!res.success) {
      showToast(`Could not activate VTON: ${escapeHtml(res.error)}`, 'error');
      updatePluginStateUI();
      return;
    }
  }

  shop.vton_enabled = true;
  localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));

  showToast('🎉 Body Measurement & Virtual Try-On Plugin is now ACTIVE on Mobile!', 'success');
  updatePluginStateUI();
  renderSuperShops();
}

async function deactivatePlugin() {
  if (confirm('Are you sure you want to disable Virtual Try-On? Shoppers on your mobile app will no longer see the Try-On button.')) {
    const shop = getCurrentShop();

    if (window.db && window.db.updateVtonStatus) {
      const res = await window.db.updateVtonStatus(shop.id, false);
      if (!res.success) {
        showToast(`Could not disable VTON: ${escapeHtml(res.error)}`, 'error');
        return;
      }
    }

    shop.vton_enabled = false;
    localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));

    showToast('Virtual Try-On plugin disabled.', 'info');
    updatePluginStateUI();
    renderSuperShops();
  }
}

function updatePluginStateUI() {
  const shop = getCurrentShop();
  const container = document.getElementById('downloadToggleContainer');
  const downloadBtn = document.getElementById('btnStartDownload');
  const progressTrack = document.getElementById('downloadProgressTrack');
  const progressFill = document.getElementById('downloadProgressFill');
  const percentText = document.getElementById('downloadPercentText');
  const stepsLog = document.getElementById('downloadStepsLog');
  const installedView = document.getElementById('installedSwitchView');
  const sidebarBadge = document.getElementById('sidebarPluginBadge');
  const bannerStatus = document.getElementById('bannerPluginStatus');

  if (!container) return;

  if (shop.vton_enabled) {
    container.classList.add('active-mode');
    container.classList.remove('is-downloading');
    downloadBtn.style.display = 'none';
    progressTrack.style.display = 'none';
    installedView.style.display = 'flex';
    percentText.textContent = 'Installed (v1.2.0)';
    percentText.style.color = '#10b981';
    stepsLog.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> <span>Synchronized with customer mobile app & Fashn AI API.</span>';
    
    if (sidebarBadge) {
      sidebarBadge.textContent = 'VTON Active';
      sidebarBadge.classList.add('plugin-live');
    }
    if (bannerStatus) {
      bannerStatus.textContent = 'Active on Mobile App';
      bannerStatus.style.color = '#10b981';
    }
  } else {
    container.classList.remove('active-mode', 'is-downloading');
    downloadBtn.style.display = 'flex';
    downloadBtn.disabled = false;
    downloadBtn.style.opacity = '1';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download download-arrow-icon"></i> <span>Install & Activate Plugin</span>';
    progressTrack.style.display = 'none';
    progressFill.style.width = '0%';
    installedView.style.display = 'none';
    percentText.textContent = 'Ready to Install';
    percentText.style.color = 'var(--accent-cyan)';
    stepsLog.innerHTML = '<span>Click to install neural weights & size matching engine.</span>';
    
    if (sidebarBadge) {
      sidebarBadge.textContent = 'VTON Inactive';
      sidebarBadge.classList.remove('plugin-live');
    }
    if (bannerStatus) {
      bannerStatus.textContent = 'Not Installed';
      bannerStatus.style.color = '#f59e0b';
    }
  }
}

// =============================================================================
// 7. Products CRUD & Rendering (LIVE SUPABASE SYNC FOR STORE OWNERS)
// =============================================================================

function resetProductsState() {
  products = [];
  productsShopId = null;
  productsLoaded = false;
  productsLoading = false;
  productsError = null;
  resetProductImageState(null);
}

function formatRelativeDate(dateString) {
  if (!dateString) return 'Just now';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// ---- Product image state & dropzone handling ---------------------------------
const productImageState = { file: null, existingUrl: null, removed: false, objectUrl: null };

function resetProductImageState(existingUrl = null) {
  if (productImageState.objectUrl) URL.revokeObjectURL(productImageState.objectUrl);
  productImageState.file = null;
  productImageState.existingUrl = existingUrl;
  productImageState.removed = false;
  productImageState.objectUrl = null;

  const input = document.getElementById('prodImageInput');
  if (input) input.value = '';
  const urlInput = document.getElementById('prodImageUrl');
  if (urlInput) urlInput.value = existingUrl || '';

  setProductPreview(existingUrl);
}

function setProductPreview(src) {
  const empty = document.getElementById('prodDropzoneEmpty');
  const preview = document.getElementById('prodDropzonePreview');
  const img = document.getElementById('prodImagePreviewImg');
  if (!empty || !preview || !img) return;

  if (src) {
    img.src = src;
    empty.style.display = 'none';
    preview.style.display = 'block';
  } else {
    img.src = '';
    empty.style.display = 'block';
    preview.style.display = 'none';
  }
}

function acceptProductImageFile(file) {
  if (!file) return;
  const problem = window.db.validateProductImage(file);
  if (problem) {
    showToast(problem, 'error');
    return;
  }
  if (productImageState.objectUrl) URL.revokeObjectURL(productImageState.objectUrl);
  productImageState.file = file;
  productImageState.removed = false;
  productImageState.objectUrl = URL.createObjectURL(file);
  setProductPreview(productImageState.objectUrl);
  const urlInput = document.getElementById('prodImageUrl');
  if (urlInput) urlInput.value = '';
}

function handleProductImageChosen(e) {
  acceptProductImageFile(e.target.files && e.target.files[0]);
}

function handleProductImageDrop(e) {
  e.preventDefault();
  const dz = document.getElementById('prodDropzone');
  if (dz) dz.classList.remove('dragover');
  acceptProductImageFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
}

function removeProductImage(e) {
  if (e) e.stopPropagation();
  if (productImageState.objectUrl) URL.revokeObjectURL(productImageState.objectUrl);
  productImageState.file = null;
  productImageState.objectUrl = null;
  productImageState.removed = !!productImageState.existingUrl;
  const input = document.getElementById('prodImageInput');
  if (input) input.value = '';
  const urlInput = document.getElementById('prodImageUrl');
  if (urlInput) urlInput.value = '';
  setProductPreview(null);
}

function handleProductImageUrlInput(url) {
  const trimmed = (url || '').trim();
  if (trimmed) {
    if (productImageState.objectUrl) URL.revokeObjectURL(productImageState.objectUrl);
    productImageState.file = null;
    setProductPreview(trimmed);
  } else {
    setProductPreview(null);
  }
}

function updateProdDescCounter() {
  const desc = document.getElementById('prodDescription');
  const counter = document.getElementById('prodDescCounter');
  if (desc && counter) {
    counter.textContent = `${desc.value.length} / 500`;
  }
}

// Populates category dropdowns dynamically from shop's active categories
function updateProductCategoryDropdowns() {
  // 1. Toolbar filter (#productCategoryFilter)
  const filterSelect = document.getElementById('productCategoryFilter');
  if (filterSelect) {
    const curVal = filterSelect.value;
    const activeCats = categories.filter(c => c.is_active);
    const opts = [
      '<option value="all">All Categories</option>',
      ...activeCats.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`),
      '<option value="unassigned">No Category (General)</option>'
    ];
    filterSelect.innerHTML = opts.join('');
    if (curVal && filterSelect.querySelector(`option[value="${curVal}"]`)) {
      filterSelect.value = curVal;
    }
  }

  // 2. Modal category select (#prodCategory)
  const modalSelect = document.getElementById('prodCategory');
  if (modalSelect) {
    const curVal = modalSelect.value;
    const activeCats = categories.filter(c => c.is_active);
    const opts = [
      '<option value="">No Category (General)</option>',
      ...activeCats.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`)
    ];
    modalSelect.innerHTML = opts.join('');
    if (curVal && modalSelect.querySelector(`option[value="${curVal}"]`)) {
      modalSelect.value = curVal;
    }
  }
}

// ---- Data fetching & rendering ----------------------------------------------
async function loadProducts(force = false) {
  const shop = getCurrentShop();
  if (!shop || !shop.id) {
    products = [];
    productsLoaded = true;
    renderProducts();
    return;
  }

  // If already loaded for this shop and not forcing refresh, just render
  if (!force && productsLoaded && productsShopId === shop.id) {
    renderProducts();
    return;
  }

  if (productsLoading) return;
  productsLoading = true;
  productsError = null;
  renderProductsSkeleton();

  // Ensure categories are loaded so category names & filter dropdowns work
  if (!categoriesLoaded || categoriesShopId !== shop.id) {
    loadCategories().catch(() => {});
  }

  const res = await window.db.fetchProducts(shop.id);
  productsLoading = false;

  if (res.success) {
    products = res.products || [];
    productsShopId = shop.id;
    productsLoaded = true;
    productsError = null;
    updateProductCategoryDropdowns();
    renderProducts();
  } else {
    productsError = res.error || 'Failed to load products.';
    renderProductsError();
  }
}

function renderProductsSkeleton() {
  const container = document.getElementById('productsGridContainer');
  if (!container) return;
  container.innerHTML = Array.from({ length: 4 }).map(() => `
    <div class="product-card" style="pointer-events: none; opacity: 0.65;">
      <div class="product-thumb skeleton-block" style="height: 240px; background: rgba(30, 41, 59, 0.4);"></div>
      <div class="product-info">
        <div class="skeleton-block" style="height: 18px; width: 75%; margin-bottom: 8px; background: rgba(255,255,255,0.06); border-radius: 4px;"></div>
        <div class="skeleton-block" style="height: 14px; width: 45%; margin-bottom: 12px; background: rgba(255,255,255,0.06); border-radius: 4px;"></div>
        <div class="skeleton-block" style="height: 12px; width: 90%; margin-bottom: 6px; background: rgba(255,255,255,0.04); border-radius: 4px;"></div>
      </div>
    </div>
  `).join('');
}

function renderProductsError() {
  const container = document.getElementById('productsGridContainer');
  if (!container) return;
  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
      <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; color: var(--accent-rose); margin-bottom: 12px;"></i>
      <h4 style="font-size: 1.1rem; color: #fff; margin-bottom: 6px;">Failed to load products</h4>
      <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px;">${escapeHtml(productsError || 'Network or database error.')}</p>
      <button class="btn btn-outline" onclick="loadProducts(true)"><i class="fa-solid fa-arrows-rotate"></i> Try Again</button>
    </div>
  `;
}

function renderProducts() {
  const container = document.getElementById('productsGridContainer');
  if (!container) return;

  if (productsLoading) return;
  if (productsError) {
    renderProductsError();
    return;
  }

  const searchVal = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('productCategoryFilter')?.value || 'all';
  const garmentTypeFilter = document.getElementById('productGarmentTypeFilter')?.value || 'all';
  const genderFilter = document.getElementById('productGenderFilter')?.value || 'all';
  const statusFilter = document.getElementById('productStatusFilter')?.value || 'all';

  const filtered = products.filter(p => {
    const matchesSearch = !searchVal || p.title.toLowerCase().includes(searchVal) || (p.description && p.description.toLowerCase().includes(searchVal));
    const matchesCat = catFilter === 'all'
      ? true
      : catFilter === 'unassigned'
        ? !p.category_id
        : p.category_id === catFilter;
    const matchesGarmentType = garmentTypeFilter === 'all' || p.garment_type === garmentTypeFilter;
    const matchesGender = genderFilter === 'all' || p.gender === genderFilter;
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'active'
        ? p.is_active
        : !p.is_active;

    return matchesSearch && matchesCat && matchesGarmentType && matchesGender && matchesStatus;
  });

  const countBadge = document.getElementById('sidebarProductCount');
  const statBadge = document.getElementById('statProducts');
  const activeCount = products.filter(p => p.is_active).length;
  if (countBadge) countBadge.textContent = products.length;
  if (statBadge) statBadge.textContent = activeCount;

  if (filtered.length === 0) {
    const isSearching = searchVal || catFilter !== 'all' || garmentTypeFilter !== 'all' || genderFilter !== 'all' || statusFilter !== 'all';
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 56px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
        <i class="fa-solid fa-shirt" style="font-size: 2.6rem; color: var(--text-dim); margin-bottom: 14px;"></i>
        <h4 style="font-size: 1.15rem; color: #fff; margin-bottom: 6px;">${isSearching ? 'No garments match your filters' : 'No garments in your catalog yet'}</h4>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 18px;">
          ${isSearching ? 'Try clearing the search or changing filter criteria.' : 'Add your first apparel product to start sizing and virtual try-ons.'}
        </p>
        ${!isSearching ? `<button class="btn btn-primary" onclick="openAddProductModal()"><i class="fa-solid fa-plus"></i> Add First Garment</button>` : ''}
      </div>
    `;
    return;
  }

  // Build category lookup map
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c.name; });

  container.innerHTML = filtered.map(p => {
    const categoryName = p.category_id && catMap[p.category_id] ? catMap[p.category_id] : 'General';
    const typeLabel = {
      'tops': 'Tops',
      'bottoms': 'Bottoms',
      'one-pieces': 'One-Piece',
      'outerwear': 'Outerwear'
    }[p.garment_type] || (p.garment_type ? p.garment_type.toUpperCase() : 'Tops');

    const genderLabel = {
      'unisex': 'Unisex',
      'male': 'Men',
      'female': 'Women'
    }[p.gender] || 'Unisex';

    return `
      <div class="product-card ${p.is_active ? '' : 'is-archived'}">
        <div class="product-thumb">
          ${p.garment_image_url
            ? `<img src="${escapeHtml(p.garment_image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'product-thumb-placeholder\\'><i class=\\'fa-solid fa-shirt\\'></i></div>';">`
            : `<div class="product-thumb-placeholder"><i class="fa-solid fa-shirt"></i></div>`
          }
          <span class="product-category-tag">${escapeHtml(categoryName.toUpperCase())}</span>
          <span class="product-vton-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> VTON</span>
        </div>
        <div class="product-info">
          <div class="product-meta-row">
            <span class="product-badge-pill type-pill"><i class="fa-solid fa-tag"></i> ${escapeHtml(typeLabel)}</span>
            <span class="product-badge-pill gender-pill"><i class="fa-solid fa-user"></i> ${escapeHtml(genderLabel)}</span>
            <span class="product-badge-pill ${p.is_active ? 'status-pill-active' : 'status-pill-archived'}">
              <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i> ${p.is_active ? 'Active' : 'Archived'}
            </span>
          </div>
          <h4 class="product-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h4>
          <div class="product-price">₱${p.price.toFixed(2)}</div>
          <div class="product-description-snippet">${escapeHtml(p.description || 'No detailed description added yet.')}</div>
          <div class="product-footer">
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              <i class="fa-regular fa-clock"></i> ${formatRelativeDate(p.created_at)}
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')" title="Edit Product">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-outline btn-sm" onclick="toggleProductActive('${p.id}')" title="${p.is_active ? 'Archive Product' : 'Restore Product'}">
                <i class="fa-solid ${p.is_active ? 'fa-box-archive' : 'fa-box-open'}"></i>
              </button>
              <button class="btn btn-outline btn-sm" style="color: var(--accent-rose); border-color: rgba(244,63,94,0.3);" onclick="deleteProduct('${p.id}')" title="Delete Product">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterProducts() {
  renderProducts();
}

function openAddProductModal() {
  const shop = getCurrentShop();
  if (!shop || !shop.id) {
    showToast('Please sign in to a registered shop.', 'error');
    return;
  }

  document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-shirt"></i> Add New Garment Product';
  document.getElementById('prodEditId').value = '';
  document.getElementById('prodTitle').value = '';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodGarmentType').value = 'tops';
  document.getElementById('prodGender').value = 'unisex';
  document.getElementById('prodDescription').value = '';
  updateProdDescCounter();
  document.getElementById('prodIsActive').checked = true;
  document.getElementById('saveProductBtnText').textContent = 'Save Product';

  updateProductCategoryDropdowns();
  document.getElementById('prodCategory').value = '';

  resetProductImageState(null);
  openModal('addProductModal');
  document.getElementById('prodTitle').focus();
}

function editProduct(prodId) {
  const p = products.find(item => item.id === prodId);
  if (!p) return;

  document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Garment Product';
  document.getElementById('prodEditId').value = p.id;
  document.getElementById('prodTitle').value = p.title || '';
  document.getElementById('prodPrice').value = p.price || '';
  document.getElementById('prodGarmentType').value = p.garment_type || 'tops';
  document.getElementById('prodGender').value = p.gender || 'unisex';
  document.getElementById('prodDescription').value = p.description || '';
  updateProdDescCounter();
  document.getElementById('prodIsActive').checked = p.is_active !== false;
  document.getElementById('saveProductBtnText').textContent = 'Update Product';

  updateProductCategoryDropdowns();
  document.getElementById('prodCategory').value = p.category_id || '';

  resetProductImageState(p.garment_image_url || null);
  openModal('addProductModal');
}

function closeProductModal() {
  closeModal('addProductModal');
  resetProductImageState(null);
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const shop = getCurrentShop();
  if (!shop || !shop.id) {
    showToast('No active shop found.', 'error');
    return;
  }

  const editId = document.getElementById('prodEditId').value.trim();
  const title = document.getElementById('prodTitle').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const garment_type = document.getElementById('prodGarmentType').value;
  const gender = document.getElementById('prodGender').value;
  const category_id = document.getElementById('prodCategory').value || null;
  const description = document.getElementById('prodDescription').value.trim();
  const is_active = document.getElementById('prodIsActive').checked;

  if (!title) {
    showToast('Product title is required.', 'error');
    return;
  }
  if (isNaN(price) || price < 0) {
    showToast('Please enter a valid price.', 'error');
    return;
  }

  const saveBtn = document.getElementById('btnSaveProduct');
  const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  }

  try {
    let finalImageUrl = productImageState.existingUrl;

    // If user provided a new file to upload
    if (productImageState.file) {
      const up = await window.db.uploadProductImage(shop.id, productImageState.file);
      if (!up.success) {
        showToast(up.error, 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
        return;
      }
      finalImageUrl = up.url;
    } else if (productImageState.removed) {
      finalImageUrl = null;
    } else {
      // Check if user manually typed a URL in the text box
      const manualUrl = (document.getElementById('prodImageUrl')?.value || '').trim();
      if (manualUrl) finalImageUrl = manualUrl;
    }

    const payload = {
      title,
      description,
      price,
      garment_type,
      gender,
      garment_image_url: finalImageUrl,
      category_id,
      is_active
    };

    if (editId) {
      const res = await window.db.updateProduct(shop.id, editId, payload);
      if (!res.success) {
        showToast(res.error, 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
        return;
      }
      showToast('Product updated successfully!', 'success');
    } else {
      const res = await window.db.createProduct(shop.id, payload);
      if (!res.success) {
        showToast(res.error, 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
        return;
      }
      showToast('New garment added to catalog!', 'success');
    }

    closeProductModal();
    await loadProducts(true);
  } catch (err) {
    console.error('Save product error:', err);
    showToast(err.message || 'Failed to save product.', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }
  }
}

async function toggleProductActive(prodId) {
  const shop = getCurrentShop();
  if (!shop || !shop.id) return;

  const p = products.find(item => item.id === prodId);
  if (!p) return;

  const newStatus = !p.is_active;
  const res = await window.db.setProductActive(shop.id, prodId, newStatus);
  if (res.success) {
    p.is_active = newStatus;
    showToast(`Product ${newStatus ? 'restored to active' : 'archived'}.`, 'info');
    renderProducts();
  } else {
    showToast(res.error || 'Failed to update product status.', 'error');
  }
}

async function deleteProduct(prodId) {
  const shop = getCurrentShop();
  if (!shop || !shop.id) return;

  const p = products.find(item => item.id === prodId);
  const title = p ? p.title : 'this garment';

  if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

  const res = await window.db.deleteProduct(shop.id, prodId);
  if (res.success) {
    if (p && p.garment_image_url) {
      window.db.deleteProductImageByUrl(shop.id, p.garment_image_url);
    }
    showToast('Product deleted from catalog.', 'info');
    await loadProducts(true);
  } else {
    showToast(res.error || 'Failed to delete product.', 'error');
  }
}

// =============================================================================
// 8. Categories & Orders
// =============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// The shop the signed-in owner belongs to. Every category query is scoped to this id.
function getOwnerShopId() {
  if (currentUser.role !== 'owner') return null;
  return UUID_RE.test(currentUser.shopId || '') ? currentUser.shopId : null;
}

function resetCategoriesState() {
  categories = [];
  categoriesShopId = null;
  categoriesLoaded = false;
  categoriesLoading = false;
  categoriesError = null;
  categoryFilter = 'active';
  syncCategoryFilterButtons();
  renderCategories();
}

async function loadCategories(force = false) {
  const shopId = getOwnerShopId();

  if (!shopId) {
    categories = [];
    categoriesShopId = null;
    categoriesLoaded = true;
    renderCategories();
    return;
  }

  // Never show another shop's data if the account changed
  if (categoriesShopId !== shopId) {
    categories = [];
    categoriesLoaded = false;
    categoriesError = null;
    categoriesShopId = shopId;
  }

  if (categoriesLoading) return;
  if (categoriesLoaded && !force) {
    renderCategories();
    return;
  }

  categoriesLoading = true;
  categoriesError = null;
  renderCategories();

  const res = await window.db.fetchCategories(shopId);
  categoriesLoading = false;

  // Session/shop changed while the request was in flight - discard the result
  if (getOwnerShopId() !== shopId) return;

  if (res.success) {
    categories = res.categories;
    categoriesLoaded = true;
    updateProductCategoryDropdowns();
  } else {
    categoriesError = res.error;
  }
  renderCategories();
}

function updateCategoryCounts() {
  const activeCount = categories.filter(c => c.is_active).length;
  const archivedCount = categories.length - activeCount;

  const sidebar = document.getElementById('sidebarCategoryCount');
  const activeEl = document.getElementById('catCountActive');
  const archivedEl = document.getElementById('catCountArchived');
  if (sidebar) sidebar.textContent = activeCount;
  if (activeEl) activeEl.textContent = activeCount;
  if (archivedEl) archivedEl.textContent = archivedCount;
}

function syncCategoryFilterButtons() {
  [['active', 'catFilterActive'], ['archived', 'catFilterArchived'], ['all', 'catFilterAll']].forEach(([key, id]) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', categoryFilter === key);
  });
}

function setCategoryFilter(filter) {
  categoryFilter = filter;
  syncCategoryFilterButtons();
  renderCategories();
}

function categoryImageFallback(img) {
  img.outerHTML = '<i class="fa-solid fa-image category-cover-placeholder"></i>';
}

function renderCategories() {
  const container = document.getElementById('categoriesGridContainer');
  if (!container) return;

  updateCategoryCounts();

  const shopId = getOwnerShopId();
  const addBtn = document.getElementById('addCategoryBtn');
  if (addBtn) addBtn.disabled = !shopId;

  if (!shopId) {
    container.innerHTML = `
      <div class="grid-state">
        <i class="fa-solid fa-store-slash"></i>
        <strong>No shop is linked to this account</strong>
        Ask the Super Admin to provision your store before managing categories.
      </div>`;
    return;
  }

  if (categoriesError && !categoriesLoaded) {
    container.innerHTML = `
      <div class="grid-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <strong>Couldn't load your categories</strong>
        ${escapeHtml(categoriesError)}
        <div><button class="btn btn-outline" onclick="loadCategories(true)"><i class="fa-solid fa-arrows-rotate"></i> Try again</button></div>
      </div>`;
    return;
  }

  if (!categoriesLoaded) {
    container.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
    return;
  }

  const visible = categories.filter(c =>
    categoryFilter === 'all' ? true : (categoryFilter === 'active' ? c.is_active : !c.is_active)
  );

  if (visible.length === 0) {
    if (categories.length === 0) {
      container.innerHTML = `
        <div class="grid-state">
          <i class="fa-solid fa-layer-group"></i>
          <strong>No categories yet</strong>
          Create your first category to start organizing your garments.
          <div><button class="btn btn-primary" onclick="openAddCategoryModal()"><i class="fa-solid fa-plus"></i> Add Category</button></div>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="grid-state">
          <i class="fa-solid ${categoryFilter === 'archived' ? 'fa-box-archive' : 'fa-layer-group'}"></i>
          <strong>${categoryFilter === 'archived' ? 'No archived categories' : 'No active categories'}</strong>
          ${categoryFilter === 'archived' ? 'Categories you archive will appear here.' : 'Restore an archived category or add a new one.'}
        </div>`;
    }
    return;
  }

  container.innerHTML = visible.map(cat => {
    const archived = !cat.is_active;
    const count = cat.productCount || 0;
    return `
    <article class="category-card ${archived ? 'is-archived' : ''}">
      <div class="category-cover">
        ${cat.image_url
          ? `<img src="${escapeHtml(cat.image_url)}" alt="${escapeHtml(cat.name)}" loading="lazy" onerror="categoryImageFallback(this)">`
          : '<i class="fa-solid fa-image category-cover-placeholder"></i>'}
        <span class="badge category-status ${archived ? 'badge-amber' : 'badge-emerald'}">
          <i class="fa-solid ${archived ? 'fa-box-archive' : 'fa-circle-check'}"></i> ${archived ? 'Archived' : 'Active'}
        </span>
      </div>
      <div class="category-body">
        <h4>${escapeHtml(cat.name)}</h4>
        <p class="${cat.description ? '' : 'is-empty'}">${cat.description ? escapeHtml(cat.description) : 'No description'}</p>
      </div>
      <div class="category-footer">
        <span class="badge badge-indigo badge-nowrap"><i class="fa-solid fa-shirt"></i> ${count} ${count === 1 ? 'Product' : 'Products'}</span>
        <div class="row-actions">
          <button class="icon-btn" onclick="openEditCategoryModal('${cat.id}')" title="Edit category" aria-label="Edit category">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="icon-btn ${archived ? 'icon-btn-success' : 'icon-btn-warn'}" onclick="toggleCategoryArchive('${cat.id}')" title="${archived ? 'Restore category' : 'Archive category'}" aria-label="${archived ? 'Restore category' : 'Archive category'}">
            <i class="fa-solid ${archived ? 'fa-box-open' : 'fa-box-archive'}"></i>
          </button>
        </div>
      </div>
    </article>`;
  }).join('');
}

// ---- Category modal (add / edit) with image upload ---------------------------

const categoryImageState = { file: null, existingUrl: null, removed: false, objectUrl: null };

function setCategoryPreview(src) {
  const preview = document.getElementById('catImagePreview');
  const empty = document.getElementById('catUploadEmpty');
  const actions = document.getElementById('catUploadActions');
  if (src) {
    preview.src = src;
    preview.hidden = false;
    empty.hidden = true;
    actions.hidden = false;
  } else {
    preview.removeAttribute('src');
    preview.hidden = true;
    empty.hidden = false;
    actions.hidden = true;
  }
}

function resetCategoryImageState(existingUrl = null) {
  if (categoryImageState.objectUrl) URL.revokeObjectURL(categoryImageState.objectUrl);
  categoryImageState.file = null;
  categoryImageState.existingUrl = existingUrl;
  categoryImageState.removed = false;
  categoryImageState.objectUrl = null;
  const input = document.getElementById('catImageInput');
  if (input) input.value = '';
  setCategoryPreview(existingUrl);
}

function updateCategoryDescCount() {
  const area = document.getElementById('catDesc');
  const counter = document.getElementById('catDescCount');
  if (area && counter) counter.textContent = area.value.length;
}

document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'catDesc') updateCategoryDescCount();
});

function setCategorySubmitting(isSubmitting, label) {
  const btn = document.getElementById('categorySubmitBtn');
  if (!btn) return;
  btn.disabled = isSubmitting;
  btn.innerHTML = isSubmitting
    ? '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'
    : label;
}

function openAddCategoryModal() {
  if (!getOwnerShopId()) {
    showToast('No shop is linked to this account.', 'error');
    return;
  }
  document.getElementById('categoryModalTitle').innerHTML = '<i class="fa-solid fa-layer-group"></i> Add Garment Category';
  document.getElementById('catEditId').value = '';
  document.getElementById('catName').value = '';
  document.getElementById('catDesc').value = '';
  updateCategoryDescCount();
  resetCategoryImageState(null);
  setCategorySubmitting(false, '<i class="fa-solid fa-check"></i> Add Category');
  openModal('categoryModal');
  document.getElementById('catName').focus();
}

function openEditCategoryModal(categoryId) {
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return;

  document.getElementById('categoryModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Category';
  document.getElementById('catEditId').value = cat.id;
  document.getElementById('catName').value = cat.name;
  document.getElementById('catDesc').value = cat.description || '';
  updateCategoryDescCount();
  resetCategoryImageState(cat.image_url);
  setCategorySubmitting(false, '<i class="fa-solid fa-floppy-disk"></i> Save Changes');
  openModal('categoryModal');
}

function closeCategoryModal() {
  resetCategoryImageState(null);
  closeModal('categoryModal');
}

function acceptCategoryImageFile(file) {
  if (!file) return;
  const problem = window.db.validateCategoryImage(file);
  if (problem) {
    showToast(problem, 'error');
    return;
  }
  if (categoryImageState.objectUrl) URL.revokeObjectURL(categoryImageState.objectUrl);
  categoryImageState.file = file;
  categoryImageState.removed = false;
  categoryImageState.objectUrl = URL.createObjectURL(file);
  setCategoryPreview(categoryImageState.objectUrl);
}

function handleCategoryImageChosen(e) {
  acceptCategoryImageFile(e.target.files && e.target.files[0]);
  e.target.value = ''; // allow re-selecting the same file
}

function handleCategoryImageDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  acceptCategoryImageFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
}

function removeCategoryImage() {
  if (categoryImageState.objectUrl) URL.revokeObjectURL(categoryImageState.objectUrl);
  categoryImageState.file = null;
  categoryImageState.objectUrl = null;
  categoryImageState.removed = !!categoryImageState.existingUrl;
  setCategoryPreview(null);
}

async function handleSaveCategory(e) {
  e.preventDefault();

  const shopId = getOwnerShopId();
  if (!shopId) {
    showToast('No shop is linked to this account.', 'error');
    return;
  }

  const editId = document.getElementById('catEditId').value;
  const name = document.getElementById('catName').value.trim();
  const description = document.getElementById('catDesc').value.trim();
  const submitLabel = editId
    ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes'
    : '<i class="fa-solid fa-check"></i> Add Category';

  if (!name) {
    showToast('Category name is required.', 'error');
    return;
  }

  const duplicate = categories.find(c => c.id !== editId && c.name.trim().toLowerCase() === name.toLowerCase());
  if (duplicate) {
    showToast(`A category named "${escapeHtml(duplicate.name)}" already exists${duplicate.is_active ? '' : ' (archived)'}.`, 'error');
    return;
  }

  setCategorySubmitting(true);

  const existing = editId ? categories.find(c => c.id === editId) : null;
  let imageUrl = existing ? existing.image_url : null;
  let uploadedUrl = null;

  if (categoryImageState.file) {
    const up = await window.db.uploadCategoryImage(shopId, categoryImageState.file);
    if (!up.success) {
      setCategorySubmitting(false, submitLabel);
      showToast(escapeHtml(up.error), 'error');
      return;
    }
    uploadedUrl = up.url;
    imageUrl = up.url;
  } else if (categoryImageState.removed) {
    imageUrl = null;
  }

  const payload = { name, description, image_url: imageUrl };
  const res = editId
    ? await window.db.updateCategory(shopId, editId, payload)
    : await window.db.createCategory(shopId, payload);

  if (!res.success) {
    // Don't leave an orphaned upload behind when the save failed
    if (uploadedUrl) await window.db.deleteCategoryImageByUrl(shopId, uploadedUrl);
    setCategorySubmitting(false, submitLabel);
    showToast(escapeHtml(res.error), 'error');
    return;
  }

  // Remove the previous image once it has been replaced or removed
  if (existing && existing.image_url && existing.image_url !== imageUrl) {
    await window.db.deleteCategoryImageByUrl(shopId, existing.image_url);
  }

  closeCategoryModal();
  showToast(`Category "${escapeHtml(name)}" ${editId ? 'updated' : 'added'}!`, 'success');
  await loadCategories(true);
}

async function toggleCategoryArchive(categoryId) {
  const shopId = getOwnerShopId();
  const cat = categories.find(c => c.id === categoryId);
  if (!shopId || !cat) return;

  const makeActive = !cat.is_active;

  if (!makeActive) {
    const n = cat.productCount || 0;
    const note = n > 0
      ? ` Its ${n} product${n === 1 ? '' : 's'} will stay in your catalog, but the category will be hidden from shoppers.`
      : ' It will be hidden from shoppers.';
    if (!confirm(`Archive "${cat.name}"?${note} You can restore it at any time.`)) return;
  }

  const res = await window.db.setCategoryActive(shopId, categoryId, makeActive);
  if (!res.success) {
    showToast(escapeHtml(res.error), 'error');
    return;
  }

  showToast(`Category "${escapeHtml(cat.name)}" ${makeActive ? 'restored' : 'archived'}.`, makeActive ? 'success' : 'info');
  await loadCategories(true);
}

function renderOrders() {
  const tbody = document.getElementById('allOrdersTbody');
  const recentTbody = document.getElementById('recentOrdersTbody');
  if (!tbody) return;

  const searchVal = (document.getElementById('orderSearchInput')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';

  const filtered = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(searchVal) || o.customer.toLowerCase().includes(searchVal);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const countBadge = document.getElementById('sidebarOrderCount');
  if (countBadge) countBadge.textContent = orders.length;

  const renderRow = (o, isRecent = false) => `
    <tr>
      <td><span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">${o.id}</span></td>
      <td><strong>${o.customer}</strong></td>
      ${!isRecent ? `<td><span style="color: var(--text-muted); font-size: 0.8rem;">${o.date}</span></td>` : ''}
      <td>
        <div style="font-weight: 600;">${o.item}</div>
        <div style="font-size: 0.74rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-top: 2px;">
          <span>${o.size}</span>
          ${o.vtonRecommended ? `<span class="badge badge-emerald" style="padding: 2px 6px; font-size: 0.65rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> AI Match</span>` : ''}
        </div>
      </td>
      ${isRecent ? `<td><span class="badge ${o.vtonRecommended ? 'badge-emerald' : 'badge-indigo'}">${o.size}</span></td>` : ''}
      <td><strong style="font-family: var(--font-mono);">$${o.total.toFixed(2)}</strong></td>
      ${!isRecent ? `<td><span style="font-size: 0.8rem; color: var(--text-muted);">${o.payment}</span></td>` : ''}
      <td>
        <span class="badge ${o.status === 'Delivered' ? 'badge-emerald' : (o.status === 'Shipped' ? 'badge-cyan' : 'badge-amber')}">
          ${o.status}
        </span>
      </td>
      ${!isRecent ? `
        <td>
          <button class="btn btn-outline btn-sm" onclick="viewOrderDetails('${o.id}')">
            <i class="fa-solid fa-eye"></i> Details
          </button>
        </td>
      ` : ''}
    </tr>
  `;

  tbody.innerHTML = filtered.map(o => renderRow(o, false)).join('');
  if (recentTbody) {
    recentTbody.innerHTML = orders.slice(0, 4).map(o => renderRow(o, true)).join('');
  }
}

function filterOrders() {
  renderOrders();
}

function viewOrderDetails(orderId) {
  const o = orders.find(item => item.id === orderId);
  if (!o) return;

  document.getElementById('orderModalTitle').textContent = `Order Details: ${o.id}`;
  document.getElementById('orderModalBody').innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <span style="color: var(--text-muted);">Customer:</span>
        <strong>${o.customer}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <span style="color: var(--text-muted);">Garment Item:</span>
        <span>${o.item}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <span style="color: var(--text-muted);">Selected Size:</span>
        <span class="badge badge-emerald"><i class="fa-solid fa-check"></i> ${o.size} (AI Body Scan Recommended)</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 6px; font-size: 1.1rem;">
        <span style="font-weight: 700;">Total Charged:</span>
        <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">$${o.total.toFixed(2)}</strong>
      </div>
    </div>
  `;

  openModal('orderDetailsModal');
}

function renderLiveFeed() {
  const container = document.getElementById('liveFeedContainer');
  if (!container) return;

  container.innerHTML = liveFeedData.map(feed => `
    <div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px; border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle);">
      <div style="width: 34px; height: 34px; border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center; color: ${feed.color}; font-size: 0.95rem;">
        <i class="fa-solid ${feed.icon}"></i>
      </div>
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between;">
          <strong style="font-size: 0.84rem;">${feed.title}</strong>
          <span style="font-size: 0.72rem; color: var(--text-dim);">${feed.time}</span>
        </div>
        <p style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">${feed.desc}</p>
      </div>
    </div>
  `).join('');
}

function renderStats() {
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0) + 148000;
  const revElem = document.getElementById('statRevenue');
  const ordElem = document.getElementById('statOrders');
  if (revElem) revElem.textContent = `$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (ordElem) ordElem.textContent = (orders.length + 1477).toLocaleString();
}

function saveStoreSettings(e) {
  e.preventDefault();
  const shop = getCurrentShop();
  shop.name = document.getElementById('settingStoreName').value.trim();
  shop.code = document.getElementById('settingStoreCode').value.trim().toLowerCase();
  shop.ownerEmail = document.getElementById('settingStoreEmail').value.trim();

  localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));
  applyRoleNavigation();
  showToast('Store settings saved successfully!', 'success');
}

// =============================================================================
// 9. Modal Helpers
// =============================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }
});
