/**
 * Antigravity Admin Portal - Application Logic & Interactive Engine
 * Handles State, CRUD, Supabase Sync & Download Animation Switch
 */

// =============================================================================
// 1. Initial State & Rich Dummy Dataset
// =============================================================================

const DEFAULT_SHOP = {
  id: 'shop_bench_01',
  name: 'Bench Philippines',
  code: 'BENCH',
  email: 'merchant@bench.com',
  currency: 'PHP',
  vton_enabled: false // Default to uninstalled so user can experience the download animation!
};

let currentShop = JSON.parse(localStorage.getItem('antigravity_admin_shop')) || DEFAULT_SHOP;
let isLoggedIn = localStorage.getItem('antigravity_admin_auth') === 'true';

// Dummy Garments Dataset
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

// Dummy Live Customer Activity Feed
const liveFeedData = [
  { icon: 'fa-user-check', color: '#10b981', title: 'Fit Recommended: Size M', time: '2m ago', desc: 'Customer scanned Bench Slim Shirt (Confidence 98%)' },
  { icon: 'fa-camera-retro', color: '#06b6d4', title: 'Virtual Try-On Rendered', time: '6m ago', desc: 'Fashn AI generated preview for Floral Midi Dress' },
  { icon: 'fa-bag-shopping', color: '#6366f1', title: 'Item Added to Cart', time: '14m ago', desc: 'Added Size L Heavyweight Hoodie (VTON Verified)' },
  { icon: 'fa-ruler-combined', color: '#f59e0b', title: 'Body Scan Complete', time: '22m ago', desc: 'Extracted Chest 38in, Waist 32in, Inseam 30in' }
];

// =============================================================================
// 2. Initialization & Lifecycle
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  updateShopUI();
  renderProducts();
  renderCategories();
  renderOrders();
  renderLiveFeed();
  renderStats();
  updatePluginStateUI();
});

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// =============================================================================
// 3. Auth Flow (Login & Register Shop)
// =============================================================================

function initAuthUI() {
  const authWrapper = document.getElementById('authWrapper');
  if (isLoggedIn) {
    authWrapper.classList.add('hidden');
  } else {
    authWrapper.classList.remove('hidden');
  }
}

function switchAuthTab(mode) {
  const loginBtn = document.getElementById('tabBtnLogin');
  const regBtn = document.getElementById('tabBtnRegister');
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');

  if (mode === 'login') {
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
    loginForm.style.display = 'flex';
    regForm.style.display = 'none';
  } else {
    regBtn.classList.add('active');
    loginBtn.classList.remove('active');
    regForm.style.display = 'flex';
    loginForm.style.display = 'none';
  }
}

function handleLogin(e) {
  e.preventDefault();
  const idInput = document.getElementById('loginId').value.trim();
  
  isLoggedIn = true;
  localStorage.setItem('antigravity_admin_auth', 'true');
  
  document.getElementById('authWrapper').classList.add('hidden');
  showToast(`Welcome back, ${currentShop.name} Admin!`, 'success');
  updateShopUI();
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regShopName').value.trim();
  const code = document.getElementById('regShopCode').value.trim().toUpperCase();
  const email = document.getElementById('regEmail').value.trim();

  currentShop = {
    id: `shop_${code.toLowerCase()}_${Date.now()}`,
    name: name,
    code: code,
    email: email,
    currency: 'PHP',
    vton_enabled: false
  };

  localStorage.setItem('antigravity_admin_shop', JSON.stringify(currentShop));
  isLoggedIn = true;
  localStorage.setItem('antigravity_admin_auth', 'true');

  document.getElementById('authWrapper').classList.add('hidden');
  showToast(`Shop "${name}" registered and connected successfully!`, 'success');
  updateShopUI();
}

function demoLogin() {
  currentShop = DEFAULT_SHOP;
  localStorage.setItem('antigravity_admin_shop', JSON.stringify(currentShop));
  isLoggedIn = true;
  localStorage.setItem('antigravity_admin_auth', 'true');
  
  document.getElementById('authWrapper').classList.add('hidden');
  showToast('Instant demo session activated (Bench Store).', 'success');
  updateShopUI();
}

function handleLogout() {
  isLoggedIn = false;
  localStorage.removeItem('antigravity_admin_auth');
  document.getElementById('authWrapper').classList.remove('hidden');
  showToast('Logged out of merchant portal.', 'info');
}

function updateShopUI() {
  document.getElementById('sidebarShopTitle').textContent = currentShop.name;
  document.getElementById('userDisplayName').textContent = currentShop.name;
  document.getElementById('userStoreCode').textContent = `CODE: ${currentShop.code}`;
  document.getElementById('avatarLetter').textContent = (currentShop.name[0] || 'B').toUpperCase();
  
  // Settings tab form values
  const nameInput = document.getElementById('settingStoreName');
  const codeInput = document.getElementById('settingStoreCode');
  const emailInput = document.getElementById('settingStoreEmail');
  if (nameInput) nameInput.value = currentShop.name;
  if (codeInput) codeInput.value = currentShop.code;
  if (emailInput) emailInput.value = currentShop.email;
}

// =============================================================================
// 4. Tab Navigation
// =============================================================================

function switchTab(tabName) {
  // Update sidebar active classes
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const navMap = {
    'dashboard': 0,
    'products': 1,
    'categories': 2,
    'orders': 3,
    'settings': 4
  };
  const items = document.querySelectorAll('.sidebar-nav .nav-item');
  if (items[navMap[tabName]]) {
    items[navMap[tabName]].classList.add('active');
  }

  // Update main content views
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`tab-${tabName}`);
  if (targetView) targetView.classList.add('active');

  // Update Page Title
  const titles = {
    'dashboard': 'Dashboard Overview',
    'products': 'Garment Product Catalog',
    'categories': 'Apparel Categories & Rules',
    'orders': 'Customer Orders & Fit Breakdown',
    'settings': 'Store Settings & Plugin Deployment'
  };
  document.getElementById('pageTitle').textContent = titles[tabName] || 'Overview';
}

// =============================================================================
// 5. THE STAR FEATURE: Interactive Download Animation Toggle
// =============================================================================

let isDownloading = false;

function triggerPluginDownloadAnimation() {
  if (isDownloading) return;
  if (currentShop.vton_enabled) return;

  isDownloading = true;

  const container = document.getElementById('downloadToggleContainer');
  const downloadBtn = document.getElementById('btnStartDownload');
  const progressTrack = document.getElementById('downloadProgressTrack');
  const progressFill = document.getElementById('downloadProgressFill');
  const percentText = document.getElementById('downloadPercentText');
  const stepsLog = document.getElementById('downloadStepsLog');
  const stateLabel = document.getElementById('downloadStateLabel');

  // Enter Downloading State UI
  container.classList.add('is-downloading');
  downloadBtn.disabled = true;
  downloadBtn.style.opacity = '0.7';
  downloadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down download-arrow-icon"></i> <span>Downloading AI Package...</span>';
  progressTrack.style.display = 'block';
  progressFill.style.width = '0%';

  const steps = [
    { at: 10, label: 'Resolving dependency: body_measurement_plugin v1.2.0...' },
    { at: 35, label: 'Downloading Google ML Kit Pose Estimation neural weights (12.4 MB)...' },
    { at: 65, label: 'Compiling circumference calculation & size matching matrices...' },
    { at: 88, label: 'Connecting to Supabase Cloud & configuring shops.vton_enabled...' },
    { at: 100, label: 'Finalizing installation & starting real-time mobile sync...' }
  ];

  let currentPercent = 0;
  const durationMs = 3200; // 3.2 seconds total animation
  const intervalMs = 40;
  const stepIncrement = 100 / (durationMs / intervalMs);

  const downloadTimer = setInterval(() => {
    currentPercent += stepIncrement;
    if (currentPercent > 100) currentPercent = 100;

    progressFill.style.width = `${Math.floor(currentPercent)}%`;
    percentText.textContent = `${Math.floor(currentPercent)}%`;

    // Update step message
    for (let s of steps) {
      if (currentPercent >= s.at) {
        stepsLog.innerHTML = `<i class="fa-solid fa-gear fa-spin" style="color: var(--accent-cyan);"></i> <span>${s.label}</span>`;
      }
    }

    // Completion
    if (currentPercent >= 100) {
      clearInterval(downloadTimer);
      setTimeout(() => {
        finishDownloadAnimation();
      }, 400);
    }
  }, intervalMs);
}

function finishDownloadAnimation() {
  isDownloading = false;
  currentShop.vton_enabled = true;
  localStorage.setItem('antigravity_admin_shop', JSON.stringify(currentShop));

  // Sync to Supabase
  if (window.db && window.db.updateVtonStatus) {
    window.db.updateVtonStatus(currentShop.id, true);
  }

  showToast('🎉 Body Measurement & Virtual Try-On Plugin is now ACTIVE on Mobile!', 'success');
  updatePluginStateUI();
}

function deactivatePlugin() {
  if (confirm('Are you sure you want to disable Virtual Try-On? Shoppers on your mobile app will no longer see the 1-Click Try-On button.')) {
    currentShop.vton_enabled = false;
    localStorage.setItem('antigravity_admin_shop', JSON.stringify(currentShop));

    if (window.db && window.db.updateVtonStatus) {
      window.db.updateVtonStatus(currentShop.id, false);
    }

    showToast('Virtual Try-On plugin disabled.', 'info');
    updatePluginStateUI();
  }
}

function updatePluginStateUI() {
  const container = document.getElementById('downloadToggleContainer');
  const downloadBtn = document.getElementById('btnStartDownload');
  const progressTrack = document.getElementById('downloadProgressTrack');
  const progressFill = document.getElementById('downloadProgressFill');
  const percentText = document.getElementById('downloadPercentText');
  const stepsLog = document.getElementById('downloadStepsLog');
  const installedView = document.getElementById('installedSwitchView');
  const sidebarBadge = document.getElementById('sidebarPluginBadge');
  const bannerStatus = document.getElementById('bannerPluginStatus');

  if (currentShop.vton_enabled) {
    // Installed & Active State
    container.classList.add('active-mode');
    container.classList.remove('is-downloading');
    downloadBtn.style.display = 'none';
    progressTrack.style.display = 'none';
    installedView.style.display = 'flex';
    percentText.textContent = 'Installed (v1.2.0)';
    percentText.style.color = '#10b981';
    stepsLog.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> <span>Synchronized with customer mobile app & Fashn AI API.</span>';
    
    sidebarBadge.textContent = 'VTON Active';
    sidebarBadge.classList.add('plugin-live');
    if (bannerStatus) {
      bannerStatus.textContent = 'Active on Mobile App';
      bannerStatus.style.color = '#10b981';
    }
  } else {
    // Uninstalled / Ready to download State
    container.classList.remove('active-mode', 'is-downloading');
    downloadBtn.style.display = 'flex';
    downloadBtn.disabled = false;
    downloadBtn.style.opacity = '1';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download download-arrow-icon"></i> <span id="btnDownloadText">Install & Activate Plugin</span>';
    progressTrack.style.display = 'none';
    progressFill.style.width = '0%';
    installedView.style.display = 'none';
    percentText.textContent = 'Ready to Install';
    percentText.style.color = 'var(--accent-cyan)';
    stepsLog.innerHTML = '<span>Click to install neural weights & size matching engine.</span>';
    
    sidebarBadge.textContent = 'VTON Inactive';
    sidebarBadge.classList.remove('plugin-live');
    if (bannerStatus) {
      bannerStatus.textContent = 'Not Installed';
      bannerStatus.style.color = '#f59e0b';
    }
  }
}

// =============================================================================
// 6. Products CRUD & Rendering
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

  document.getElementById('sidebarProductCount').textContent = products.length;
  document.getElementById('statProducts').textContent = products.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
        <i class="fa-solid fa-shirt" style="font-size: 2.5rem; color: var(--text-dim); margin-bottom: 12px;"></i>
        <h4 style="font-size: 1.1rem; color: var(--text-muted);">No garment products found</h4>
        <p style="font-size: 0.82rem; color: var(--text-dim); margin-top: 4px;">Try adjusting your filters or add a new product.</p>
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
            <span class="size-pill ${count > 0 ? 'has-stock' : ''}" title="${count} in stock">
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
      showToast('Garment product updated successfully!', 'success');
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
// 7. Categories CRUD & Rendering
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

  const newCat = {
    id: `cat-${Date.now()}`,
    name,
    icon: icon.startsWith('fa-') ? icon : `fa-${icon}`,
    count: 0,
    desc
  };

  categories.push(newCat);
  localStorage.setItem('antigravity_admin_categories', JSON.stringify(categories));
  closeModal('addCategoryModal');
  showToast(`Category "${name}" created!`, 'success');
  renderCategories();
}

// =============================================================================
// 8. Orders Management & Details Modal
// =============================================================================

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

  document.getElementById('sidebarOrderCount').textContent = orders.length;

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
        <span style="color: var(--text-muted);">Order Date:</span>
        <span>${o.date}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <span style="color: var(--text-muted);">Garment Item:</span>
        <span>${o.item}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <span style="color: var(--text-muted);">Selected Size:</span>
        <span class="badge badge-emerald"><i class="fa-solid fa-check"></i> ${o.size} (Recommended by Body Scan)</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <span style="color: var(--text-muted);">Payment Method:</span>
        <span>${o.payment}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <span style="color: var(--text-muted);">Status:</span>
        <span class="badge badge-emerald">${o.status}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 6px; font-size: 1.1rem;">
        <span style="font-weight: 700;">Total Charged:</span>
        <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">$${o.total.toFixed(2)}</strong>
      </div>
    </div>
  `;

  openModal('orderDetailsModal');
}

// =============================================================================
// 9. Dashboard Analytics & Feed
// =============================================================================

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
  document.getElementById('statRevenue').textContent = `$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('statOrders').textContent = (orders.length + 1477).toLocaleString();
}

function saveStoreSettings(e) {
  e.preventDefault();
  const name = document.getElementById('settingStoreName').value.trim();
  const code = document.getElementById('settingStoreCode').value.trim().toUpperCase();
  const email = document.getElementById('settingStoreEmail').value.trim();
  const currency = document.getElementById('settingCurrency').value;

  currentShop = {
    ...currentShop,
    name,
    code,
    email,
    currency
  };

  localStorage.setItem('antigravity_admin_shop', JSON.stringify(currentShop));
  updateShopUI();
  showToast('Store settings saved successfully!', 'success');
}

// =============================================================================
// 10. Modal Utilities
// =============================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }
});
