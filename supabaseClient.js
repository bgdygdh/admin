// Supabase Client Configuration & Backend Integration
const SUPABASE_URL = 'https://iehnwpvxohddgkzkqzyd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1TDI3iodXlM4rOKSR_xZng_ShMXRDz1';

let supabaseClient = null;

if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase Client Initialized:', SUPABASE_URL);
  } catch (err) {
    console.warn('⚠️ Supabase initialization note:', err.message);
  }
} else {
  console.log('ℹ️ Running in standalone/offline mode with local storage simulation.');
}

window.db = {
  client: supabaseClient,
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,

  // Check connection status
  async isConnected() {
    if (!supabaseClient) return false;
    try {
      const { error } = await supabaseClient.from('shops').select('count', { count: 'exact', head: true });
      return !error;
    } catch {
      return false;
    }
  },

  // 1. Authenticate user, verify role, enforce customer ban & shop active status
  async login(email, password) {
    if (!supabaseClient) {
      return { success: false, error: 'Database client not connected.' };
    }

    try {
      const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authErr) {
        return { success: false, error: authErr.message };
      }

      const authUser = authData.user;
      if (!authUser) {
        return { success: false, error: 'User account not found.' };
      }

      // Fetch user profile from public.user_profiles
      let { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!profile) {
        const metadataRole = authUser.user_metadata?.role || (email.toLowerCase().includes('admin') ? 'admin' : 'customer');
        const fullName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
        
        const { data: newProf } = await supabaseClient
          .from('user_profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: fullName,
            role: metadataRole
          })
          .select()
          .single();
        profile = newProf || { id: authUser.id, email: authUser.email, role: metadataRole, full_name: fullName };
      }

      // ⛔ ENFORCE ACCESS RULE: Customer accounts are strictly prohibited from logging into Admin
      if (profile.role === 'customer') {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          isCustomer: true,
          error: 'Access Denied: Customer accounts cannot access the Merchant or Super Admin portal. Please use the mobile app.'
        };
      }

      // If user is a Store Owner, verify shop existence and active status
      let shop = null;
      if (profile.role === 'owner') {
        const { data: shopData } = await supabaseClient
          .from('shops')
          .select('*')
          .eq('owner_id', authUser.id)
          .maybeSingle();

        shop = shopData || {
          id: `shop_${authUser.id.substring(0, 8)}`,
          name: profile.full_name ? `${profile.full_name}'s Store` : 'Merchant Store',
          store_code: 'shop',
          vton_enabled: false,
          is_active: true,
          owner_id: authUser.id
        };

        // ⛔ Check if shop was deactivated by Super Admin
        if (shop.is_active === false) {
          await supabaseClient.auth.signOut();
          return {
            success: false,
            error: `Access Denied: "${shop.name}" has been deactivated by the Super Administrator. Please contact platform support.`
          };
        }
      }

      return {
        success: true,
        user: authUser,
        profile: profile,
        role: profile.role,
        shop: shop
      };

    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during login.' };
    }
  },

  // 2. Super Admin: Register a new Merchant and Shop (lowercase code, no logo_url, is_active=true)
  async registerMerchantShop({ name, code, category, ownerName, ownerEmail, ownerPassword }) {
    if (!supabaseClient) {
      return { success: false, error: 'Database client not connected.' };
    }

    try {
      const tempAuthClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      // A. Create the merchant in Supabase Auth
      const { data: authData, error: authErr } = await tempAuthClient.auth.signUp({
        email: ownerEmail.trim(),
        password: ownerPassword,
        options: {
          data: {
            full_name: ownerName.trim(),
            role: 'owner'
          }
        }
      });

      if (authErr) {
        throw new Error(authErr.message);
      }

      const merchantUser = authData.user;
      if (!merchantUser) {
        throw new Error('Could not create merchant user in authentication.');
      }

      const merchantId = merchantUser.id;

      // B. Insert into public.user_profiles (no phone_number)
      await supabaseClient
        .from('user_profiles')
        .upsert({
          id: merchantId,
          email: ownerEmail.trim(),
          full_name: ownerName.trim(),
          role: 'owner'
        });

      // C. Insert into public.shops (lowercase store_code, is_active=true, no logo_url)
      const sanitizedCode = code.trim().toLowerCase();
      const { data: newShop, error: shopErr } = await supabaseClient
        .from('shops')
        .insert({
          owner_id: merchantId,
          store_code: sanitizedCode,
          name: name.trim(),
          description: `${category} merchant store.`,
          vton_enabled: false,
          is_active: true
        })
        .select()
        .single();

      if (shopErr) {
        throw new Error(`Failed to create shop record: ${shopErr.message}`);
      }

      return {
        success: true,
        shop: newShop,
        owner: {
          id: merchantId,
          name: ownerName,
          email: ownerEmail
        }
      };

    } catch (err) {
      console.error('Shop registration error:', err);
      return { success: false, error: err.message };
    }
  },

  // 3. Super Admin: Update existing shop details (Edit Shop)
  async updateShop(shopId, { name, code, category }) {
    if (!supabaseClient) return { success: true };
    try {
      const { data, error } = await supabaseClient
        .from('shops')
        .update({
          name: name.trim(),
          store_code: code.trim().toLowerCase(),
          description: `${category} merchant store.`
        })
        .eq('id', shopId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error updating shop:', err);
      return { success: false, error: err.message };
    }
  },

  // 4. Super Admin: Activate / Deactivate a Shop
  async toggleShopActive(shopId, makeActive) {
    if (!supabaseClient) return { success: true };
    try {
      const { data, error } = await supabaseClient
        .from('shops')
        .update({ is_active: makeActive })
        .eq('id', shopId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error toggling shop status:', err);
      return { success: false, error: err.message };
    }
  },

  // 5. Super Admin: Delete a shop from Supabase
  async deleteShop(shopId) {
    if (!supabaseClient) return { success: true };
    try {
      const { error } = await supabaseClient
        .from('shops')
        .delete()
        .eq('id', shopId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error deleting shop:', err);
      return { success: false, error: err.message };
    }
  },

  // 6. Fetch all registered shops from Supabase
  async fetchShops() {
    if (!supabaseClient) return [];

    try {
      const { data: shopsData, error: shopsErr } = await supabaseClient
        .from('shops')
        .select('id, owner_id, store_code, name, description, vton_enabled, is_active, created_at')
        .order('created_at', { ascending: false });

      if (shopsErr) throw shopsErr;

      const { data: profilesData } = await supabaseClient
        .from('user_profiles')
        .select('id, full_name, email');

      const profilesMap = {};
      (profilesData || []).forEach(p => {
        profilesMap[p.id] = p;
      });

      return (shopsData || []).map(s => {
        const owner = profilesMap[s.owner_id] || {};
        return {
          id: s.id,
          name: s.name,
          code: (s.store_code || '').toLowerCase(),
          ownerName: owner.full_name || 'Merchant Owner',
          ownerEmail: owner.email || 'N/A',
          category: s.description ? s.description.replace(' merchant store.', '') : 'Fashion & Apparel',
          vton_enabled: s.vton_enabled === true,
          is_active: s.is_active !== false, // Defaults to true
          joinedDate: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Active'
        };
      });
    } catch (err) {
      console.warn('Could not fetch shops from Supabase:', err.message);
      return null;
    }
  },

  // 6. Update shop VTON status in Supabase (verifies a row was really changed)
  async updateVtonStatus(shopId, enabled) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const { data, error } = await supabaseClient
        .from('shops')
        .update({ vton_enabled: enabled })
        .eq('id', shopId)
        .select('id, vton_enabled');
      if (error) throw error;
      // An UPDATE blocked by RLS (or a wrong id) returns no error but zero rows
      if (!data || data.length === 0) {
        return { success: false, error: 'The shop was not updated (not found or not permitted).' };
      }
      return { success: true, data: data[0] };
    } catch (err) {
      console.warn('Could not update Supabase shops table:', err.message);
      return { success: false, error: err.message };
    }
  },

  // 6b. Read the live state of a single shop (source of truth for the owner dashboard)
  async fetchShopState(shopId) {
    if (!supabaseClient) return null;
    try {
      const { data, error } = await supabaseClient
        .from('shops')
        .select('id, name, store_code, description, vton_enabled, is_active')
        .eq('id', shopId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (err) {
      console.warn('Could not read shop state:', err.message);
      return null;
    }
  },

  // 7. Fetch platform stats
  async fetchPlatformStats() {
    if (!supabaseClient) return null;
    try {
      const { count: shopCount } = await supabaseClient
        .from('shops')
        .select('*', { count: 'exact', head: true });

      const { count: prodCount } = await supabaseClient
        .from('products')
        .select('*', { count: 'exact', head: true });

      return {
        shops: shopCount || 0,
        products: prodCount || 0
      };
    } catch {
      return null;
    }
  },

  // ---------------------------------------------------------------------------
  // 8. Categories (per shop) - every call is explicitly scoped by shop_id.
  //    Row Level Security enforces the same rule server-side.
  // ---------------------------------------------------------------------------
  CATEGORY_BUCKET: 'category-images',
  CATEGORY_IMAGE_MAX_BYTES: 2 * 1024 * 1024,
  CATEGORY_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/webp'],

  _categoryError(err) {
    if (err && err.code === '23505') {
      return 'A category with this name already exists in your shop.';
    }
    return (err && err.message) || 'Unexpected database error.';
  },

  async fetchCategories(shopId) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('id, shop_id, name, description, image_url, is_active, created_at, products(count)')
        .eq('shop_id', shopId)
        .order('name', { ascending: true });

      if (error) throw error;

      const categories = (data || []).map(c => ({
        id: c.id,
        shop_id: c.shop_id,
        name: c.name,
        description: c.description || '',
        image_url: c.image_url || null,
        is_active: c.is_active !== false,
        created_at: c.created_at,
        productCount: Array.isArray(c.products) && c.products[0] ? (c.products[0].count || 0) : 0
      }));
      return { success: true, categories };
    } catch (err) {
      console.error('Error fetching categories:', err);
      return { success: false, error: this._categoryError(err) };
    }
  },

  validateCategoryImage(file) {
    if (!file) return null;
    if (!this.CATEGORY_IMAGE_TYPES.includes(file.type)) {
      return 'Image must be a PNG, JPG or WebP file.';
    }
    if (file.size > this.CATEGORY_IMAGE_MAX_BYTES) {
      return 'Image must be 2 MB or smaller.';
    }
    return null;
  },

  // Uploads to category-images/{shop_id}/{uuid}.{ext} and returns the public URL
  async uploadCategoryImage(shopId, file) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    const invalid = this.validateCategoryImage(file);
    if (invalid) return { success: false, error: invalid };

    try {
      const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
      const uid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `${shopId}/${uid}.${extMap[file.type]}`;

      const { error: upErr } = await supabaseClient.storage
        .from(this.CATEGORY_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { data } = supabaseClient.storage.from(this.CATEGORY_BUCKET).getPublicUrl(path);
      return { success: true, url: data.publicUrl, path };
    } catch (err) {
      console.error('Error uploading category image:', err);
      return { success: false, error: `Image upload failed: ${err.message}` };
    }
  },

  // Best-effort cleanup of a replaced/removed image (only inside the shop's own folder)
  async deleteCategoryImageByUrl(shopId, url) {
    if (!supabaseClient || !url) return;
    try {
      const marker = `/${this.CATEGORY_BUCKET}/`;
      const idx = url.indexOf(marker);
      if (idx === -1) return;
      const path = decodeURIComponent(url.substring(idx + marker.length).split('?')[0]);
      if (!path.startsWith(`${shopId}/`)) return;
      await supabaseClient.storage.from(this.CATEGORY_BUCKET).remove([path]);
    } catch (err) {
      console.warn('Could not remove old category image:', err.message);
    }
  },

  async createCategory(shopId, { name, description, image_url }) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .insert({
          shop_id: shopId,
          name: name.trim(),
          description: description ? description.trim() : null,
          image_url: image_url || null,
          is_active: true
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error creating category:', err);
      return { success: false, error: this._categoryError(err) };
    }
  },

  async updateCategory(shopId, categoryId, { name, description, image_url }) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .update({
          name: name.trim(),
          description: description ? description.trim() : null,
          image_url: image_url || null
        })
        .eq('id', categoryId)
        .eq('shop_id', shopId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error updating category:', err);
      return { success: false, error: this._categoryError(err) };
    }
  },

  // Archive (isActive = false) or restore (isActive = true)
  async setCategoryActive(shopId, categoryId, isActive) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .update({ is_active: isActive })
        .eq('id', categoryId)
        .eq('shop_id', shopId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error changing category status:', err);
      return { success: false, error: this._categoryError(err) };
    }
  },

  // ---------------------------------------------------------------------------
  // 9. Products (per shop) - strictly scoped by shop_id.
  // ---------------------------------------------------------------------------
  PRODUCT_BUCKET: 'garment-images',
  PRODUCT_IMAGE_MAX_BYTES: 4 * 1024 * 1024,
  PRODUCT_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/webp'],

  _productError(err) {
    if (err && err.message) return err.message;
    return 'Unexpected database error while updating product.';
  },

  async fetchProducts(shopId) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('id, shop_id, title, description, price, garment_type, gender, garment_image_url, is_active, created_at, category_id')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const products = (data || []).map(p => ({
        id: p.id,
        shop_id: p.shop_id,
        title: p.title || '',
        description: p.description || '',
        price: Number(p.price) || 0,
        garment_type: p.garment_type || 'tops',
        gender: p.gender || 'unisex',
        garment_image_url: p.garment_image_url || null,
        is_active: p.is_active !== false,
        created_at: p.created_at,
        category_id: p.category_id || null
      }));

      return { success: true, products };
    } catch (err) {
      console.error('Error fetching products:', err);
      return { success: false, error: this._productError(err) };
    }
  },

  validateProductImage(file) {
    if (!file) return null;
    if (!this.PRODUCT_IMAGE_TYPES.includes(file.type)) {
      return 'Image must be a PNG, JPG or WebP file.';
    }
    if (file.size > this.PRODUCT_IMAGE_MAX_BYTES) {
      return 'Image must be 4 MB or smaller.';
    }
    return null;
  },

  // Uploads to storage bucket under the shop's authorized folder: {shop_id}/{uid}.{ext}
  async uploadProductImage(shopId, file) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    const invalid = this.validateProductImage(file);
    if (invalid) return { success: false, error: invalid };

    const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const uid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ext = extMap[file.type] || 'jpg';
    const path = `${shopId}/${uid}.${ext}`;

    // Target category-images bucket which has RLS policies configured for {shop_id}/*
    try {
      const { error: upErr } = await supabaseClient.storage
        .from(this.CATEGORY_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });

      if (!upErr) {
        const { data } = supabaseClient.storage.from(this.CATEGORY_BUCKET).getPublicUrl(path);
        return { success: true, url: data.publicUrl, path, bucket: this.CATEGORY_BUCKET };
      }

      // If category-images failed because the bucket is not found, try garment-images
      if (upErr.message && upErr.message.toLowerCase().includes('bucket not found')) {
        const { error: prodErr } = await supabaseClient.storage
          .from(this.PRODUCT_BUCKET)
          .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });

        if (!prodErr) {
          const { data } = supabaseClient.storage.from(this.PRODUCT_BUCKET).getPublicUrl(path);
          return { success: true, url: data.publicUrl, path, bucket: this.PRODUCT_BUCKET };
        }
        return { success: false, error: `Image upload failed: ${prodErr.message}` };
      }

      return { success: false, error: `Image upload failed: ${upErr.message}` };
    } catch (err) {
      console.error('Error uploading product image:', err);
      return { success: false, error: `Image upload failed: ${err.message}` };
    }
  },

  async deleteProductImageByUrl(shopId, url) {
    if (!supabaseClient || !url) return;
    try {
      const buckets = [this.CATEGORY_BUCKET, this.PRODUCT_BUCKET];
      for (const bucket of buckets) {
        const marker = `/${bucket}/`;
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(url.substring(idx + marker.length).split('?')[0]);
          if (path.startsWith(`${shopId}/`)) {
            await supabaseClient.storage.from(bucket).remove([path]);
          }
          break;
        }
      }
    } catch (err) {
      console.warn('Could not remove old product image:', err.message);
    }
  },

  async createProduct(shopId, { title, description, price, garment_type, gender, garment_image_url, category_id, is_active }) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const record = {
        shop_id: shopId,
        title: title.trim(),
        description: description ? description.trim() : null,
        price: Number(price) || 0,
        garment_type: garment_type || 'tops',
        gender: gender || 'unisex',
        garment_image_url: garment_image_url ? garment_image_url.trim() : null,
        category_id: category_id || null,
        is_active: is_active !== false
      };

      const { data, error } = await supabaseClient
        .from('products')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error creating product:', err);
      return { success: false, error: this._productError(err) };
    }
  },

  async updateProduct(shopId, productId, { title, description, price, garment_type, gender, garment_image_url, category_id, is_active }) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const updates = {
        title: title.trim(),
        description: description ? description.trim() : null,
        price: Number(price) || 0,
        garment_type: garment_type || 'tops',
        gender: gender || 'unisex',
        garment_image_url: garment_image_url ? garment_image_url.trim() : null,
        category_id: category_id || null
      };
      if (typeof is_active === 'boolean') {
        updates.is_active = is_active;
      }

      const { data, error } = await supabaseClient
        .from('products')
        .update(updates)
        .eq('id', productId)
        .eq('shop_id', shopId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error updating product:', err);
      return { success: false, error: this._productError(err) };
    }
  },

  async setProductActive(shopId, productId, isActive) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .update({ is_active: isActive })
        .eq('id', productId)
        .eq('shop_id', shopId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error updating product active status:', err);
      return { success: false, error: this._productError(err) };
    }
  },

  async deleteProduct(shopId, productId) {
    if (!supabaseClient) return { success: false, error: 'Database client not connected.' };
    try {
      const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('shop_id', shopId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error deleting product:', err);
      return { success: false, error: this._productError(err) };
    }
  },

  async logout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  }
};
