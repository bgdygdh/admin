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

  // 6. Update shop VTON status in Supabase
  async updateVtonStatus(shopId, enabled) {
    if (!supabaseClient) return { success: true, offline: true };
    try {
      const { data, error } = await supabaseClient
        .from('shops')
        .update({ vton_enabled: enabled })
        .eq('id', shopId);
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.warn('Could not update Supabase shops table:', err.message);
      return { success: false, error: err.message };
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

  async logout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  }
};
