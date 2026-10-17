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

// Dummy Garments Dataset (For Shop Owner)
let products = JSON.parse(localStorage.getItem('antigravity_admin_products')) || [
  {
    id: 'prod-001',
    title: 'Classic Oversized Heavyweight Tee',
    price: 34.99,
    category: 'tops',
    gender: 'unisex',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80',
    stock: { S: 18, M: 24, L: 19, XL: 8 },
    vton: true
  },
  {
    id: 'prod-002',
    title: 'Slim-Fit Oxford Button-Down Shirt',
    price: 58.00,
    category: 'tops',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=700&q=80',
    stock: { S: 10, M: 22, L: 15, XL: 6 },
    vton: true
  },
  {
    id: 'prod-003',
    title: 'High-Rise Straight Leg Denim Jeans',
    price: 79.50,
    category: 'bottoms',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80',
    stock: { S: 14, M: 18, L: 12, XL: 4 },
    vton: true
  },
  {
    id: 'prod-004',
    title: 'Pleated Wide-Leg Chino Trousers',
    price: 68.00,
    category: 'bottoms',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=700&q=80',
    stock: { S: 8, M: 16, L: 20, XL: 10 },
    vton: true
  },
  {
    id: 'prod-005',
    title: 'Floral Tiered Midi Summer Dress',
    price: 89.00,
    category: 'one-pieces',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=80',
    stock: { S: 12, M: 20, L: 8, XL: 2 },
    vton: true
  },
  {
    id: 'prod-006',
    title: 'Minimalist Heavyweight Zip Hoodie',
    price: 95.00,
    category: 'outerwear',
    gender: 'unisex',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=700&q=80',
    stock: { S: 15, M: 30, L: 25, XL: 12 },
    vton: true
  },
  {
    id: 'prod-007',
    title: 'Water-Resistant Technical Windbreaker',
    price: 120.00,
    category: 'outerwear',
    gender: 'unisex',
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=700&q=80',
    stock: { S: 6, M: 14, L: 18, XL: 7 },
    vton: true
  },
  {
    id: 'prod-008',
    title: 'Linen Relaxed Short Sleeve Shirt',
    price: 45.00,
    category: 'tops',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=80',
    stock: { S: 16, M: 22, L: 14, XL: 5 },
    vton: true
  }
];

// Dummy Categories
let categories = JSON.parse(localStorage.getItem('antigravity_admin_categories')) || [
  { id: 'cat-1', name: 'Tops & Shirts', icon: 'fa-shirt', count: 14, desc: 'T-shirts, polos, casual & formal shirts' },
  { id: 'cat-2', name: 'Bottoms & Pants', icon: 'fa-socks', count: 8, desc: 'Denim jeans, chinos, cargo & trousers' },
  { id: 'cat-3', name: 'One-Pieces & Dresses', icon: 'fa-vest', count: 6, desc: 'Dresses, rompers, jumpsuits and sets' },
  { id: 'cat-4', name: 'Outerwear & Jackets', icon: 'fa-mitten', count: 5, desc: 'Hoodies, windbreakers, coats and blazers' },
  { id: 'cat-5', name: 'Activewear & Gym', icon: 'fa-person-running', count: 7, desc: 'Performance wear, athletic tights & tops' }
];

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
      // Add or update shop in local list
      const existingIdx = shops.findIndex(s => s.id === res.shop.id);
      if (existingIdx !== -1) {
        shops[existingIdx] = { ...shops[existingIdx], ...res.shop };
      } else {
        shops.push({
          id: res.shop.id,
          name: res.shop.name,
          code: res.shop.store_code,
          ownerName: res.profile.full_name,
          ownerEmail: res.profile.email,
          category: res.shop.description || 'Fashion Store',
          vton_enabled: res.shop.vton_enabled === true,
          is_active: res.shop.is_active !== false
        });
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
  localStorage.removeItem('antigravity_admin_auth');
  document.getElementById('authWrapper').classList.remove('hidden');
  showToast('Logged out of session.', 'info');
}

function getCurrentShop() {
  return shops.find(s => s.id === currentUser.shopId) || shops[0];
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
    'categories': 'Apparel Categories & Rules',
    'orders': 'Customer Orders & Fit Breakdown',
    'settings': 'Store Settings & Plugin Deployment'
  };
  document.getElementById('pageTitle').textContent = titles[tabName] || 'Overview';

  // Automatically refresh live data from Supabase for Super Admin views
  if (tabName === 'super-dashboard' || tabName === 'super-shops') {
    syncSupabaseShops();
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
  s.vton_enabled = !s.vton_enabled;
  localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));

  if (window.db && window.db.updateVtonStatus) {
    await window.db.updateVtonStatus(shopId, s.vton_enabled);
  }
  showToast(`Updated Virtual Try-On for ${s.name}: ${s.vton_enabled ? 'Active' : 'Disabled'}`, 'info');
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
    { at: 35, label: 'Downloading Google ML Kit Pose Estimation weights (12.4 MB)...' },
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
  shop.vton_enabled = true;
  localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));

  if (window.db && window.db.updateVtonStatus) {
    await window.db.updateVtonStatus(shop.id, true);
  }

  showToast('🎉 Body Measurement & Virtual Try-On Plugin is now ACTIVE on Mobile!', 'success');
  updatePluginStateUI();
  renderSuperShops();
}

async function deactivatePlugin() {
  if (confirm('Are you sure you want to disable Virtual Try-On? Shoppers on your mobile app will no longer see the Try-On button.')) {
    const shop = getCurrentShop();
    shop.vton_enabled = false;
    localStorage.setItem('antigravity_platform_shops', JSON.stringify(shops));

    if (window.db && window.db.updateVtonStatus) {
      await window.db.updateVtonStatus(shop.id, false);
    }

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
// 7. Products CRUD & Rendering (For Shop Owners)
// =============================================================================

function renderProducts() {
  const container = document.getElementById('productsGridContainer');
  if (!container) return;

  const searchVal = (document.getElementById('productSearchInput')?.value || '').toLowerCase();
  const catFilter = document.getElementById('categoryFilter')?.value || 'all';
  const genderFilter = document.getElementById('genderFilter')?.value || 'all';

  const filtered = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchVal);
    const matchesCat = catFilter === 'all' || p.category === catFilter;
    const matchesGender = genderFilter === 'all' || p.gender === genderFilter;
    return matchesSearch && matchesCat && matchesGender;
  });

  const countBadge = document.getElementById('sidebarProductCount');
  const statBadge = document.getElementById('statProducts');
  if (countBadge) countBadge.textContent = products.length;
  if (statBadge) statBadge.textContent = products.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
        <i class="fa-solid fa-shirt" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 12px;"></i>
        <h4 style="font-size: 1.1rem; color: var(--text-muted);">No garment products found</h4>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="product-thumb">
        <img src="${p.imageUrl}" alt="${p.title}" loading="lazy">
        <span class="product-category-tag">${p.category.toUpperCase()}</span>
        ${p.vton ? `<span class="product-vton-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> VTON</span>` : ''}
      </div>
      <div class="product-info">
        <h4 class="product-title" title="${p.title}">${p.title}</h4>
        <div class="product-price">$${p.price.toFixed(2)}</div>
        <div class="product-sizes">
          ${Object.entries(p.stock).map(([size, count]) => `
            <span class="size-pill ${count > 0 ? 'has-stock' : ''}">
              ${size}: ${count}
            </span>
          `).join('')}
        </div>
        <div class="product-footer">
          <div class="stock-indicator">
            <i class="fa-solid fa-circle-check"></i>
            <span>${Object.values(p.stock).reduce((a, b) => a + b, 0)} Total Stock</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline btn-sm" onclick="editProduct('${p.id}')" title="Edit Product">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-outline btn-sm" style="color: var(--accent-rose);" onclick="deleteProduct('${p.id}')" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function filterProducts() {
  renderProducts();
}

function openAddProductModal() {
  document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-shirt"></i> Add New Garment Product';
  document.getElementById('prodEditId').value = '';
  document.getElementById('prodTitle').value = '';
  document.getElementById('prodPrice').value = '';
  document.getElementById('prodCategory').value = 'tops';
  document.getElementById('prodGender').value = 'unisex';
  document.getElementById('prodImageUrl').value = '';
  document.getElementById('stockS').value = 15;
  document.getElementById('stockM').value = 25;
  document.getElementById('stockL').value = 20;
  document.getElementById('stockXL').value = 10;
  openModal('addProductModal');
}

function editProduct(prodId) {
  const p = products.find(item => item.id === prodId);
  if (!p) return;

  document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Garment Product';
  document.getElementById('prodEditId').value = p.id;
  document.getElementById('prodTitle').value = p.title;
  document.getElementById('prodPrice').value = p.price;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodGender').value = p.gender;
  document.getElementById('prodImageUrl').value = p.imageUrl;
  document.getElementById('stockS').value = p.stock.S || 0;
  document.getElementById('stockM').value = p.stock.M || 0;
  document.getElementById('stockL').value = p.stock.L || 0;
  document.getElementById('stockXL').value = p.stock.XL || 0;

  openModal('addProductModal');
}

function handleSaveProduct(e) {
  e.preventDefault();
  const editId = document.getElementById('prodEditId').value;
  const title = document.getElementById('prodTitle').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const category = document.getElementById('prodCategory').value;
  const gender = document.getElementById('prodGender').value;
  const imageUrl = document.getElementById('prodImageUrl').value.trim();
  const stock = {
    S: parseInt(document.getElementById('stockS').value) || 0,
    M: parseInt(document.getElementById('stockM').value) || 0,
    L: parseInt(document.getElementById('stockL').value) || 0,
    XL: parseInt(document.getElementById('stockXL').value) || 0,
  };

  if (editId) {
    const idx = products.findIndex(p => p.id === editId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], title, price, category, gender, imageUrl, stock };
      showToast('Product updated successfully!', 'success');
    }
  } else {
    const newProduct = {
      id: `prod-${Date.now()}`,
      title,
      price,
      category,
      gender,
      imageUrl,
      stock,
      vton: true
    };
    products.unshift(newProduct);
    showToast('New garment added to catalog!', 'success');
  }

  localStorage.setItem('antigravity_admin_products', JSON.stringify(products));
  closeModal('addProductModal');
  renderProducts();
}

function deleteProduct(prodId) {
  if (confirm('Are you sure you want to delete this garment?')) {
    products = products.filter(p => p.id !== prodId);
    localStorage.setItem('antigravity_admin_products', JSON.stringify(products));
    showToast('Product deleted.', 'info');
    renderProducts();
  }
}

// =============================================================================
// 8. Categories & Orders
// =============================================================================

function renderCategories() {
  const container = document.getElementById('categoriesGridContainer');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <div class="category-card">
      <div class="category-icon-box">
        <i class="fa-solid ${cat.icon}"></i>
      </div>
      <div class="category-details">
        <h4>${cat.name}</h4>
        <p>${cat.desc}</p>
        <span class="badge badge-indigo" style="margin-top: 10px;">${cat.count} Garment Models</span>
      </div>
    </div>
  `).join('');
}

function openAddCategoryModal() {
  document.getElementById('catName').value = '';
  document.getElementById('catDesc').value = '';
  openModal('addCategoryModal');
}

function handleSaveCategory(e) {
  e.preventDefault();
  const name = document.getElementById('catName').value.trim();
  const icon = document.getElementById('catIcon').value.trim();
  const desc = document.getElementById('catDesc').value.trim();

  categories.push({
    id: `cat-${Date.now()}`,
    name,
    icon: icon.startsWith('fa-') ? icon : `fa-${icon}`,
    count: 0,
    desc
  });

  localStorage.setItem('antigravity_admin_categories', JSON.stringify(categories));
  closeModal('addCategoryModal');
  showToast(`Category "${name}" added!`, 'success');
  renderCategories();
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
  shop.code = document.getElementById('settingStoreCode').value.trim().toUpperCase();
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
