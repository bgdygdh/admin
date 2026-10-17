// Supabase Client Configuration
const SUPABASE_URL = 'https://iehnwpvxohddgkzkqzyd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1TDI3iodXlM4rOKSR_xZng_ShMXRDz1';

let supabaseClient = null;

// Initialize Supabase client if SDK is loaded
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase Client Initialized:', SUPABASE_URL);
  } catch (err) {
    console.warn('⚠️ Supabase initialization note:', err.message);
  }
} else {
  console.log('ℹ️ Running in standalone/offline mode with simulated backend.');
}

window.db = {
  client: supabaseClient,
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,

  // Helper to check if online Supabase is reachable
  async isConnected() {
    if (!supabaseClient) return false;
    try {
      const { data, error } = await supabaseClient.from('shops').select('count', { count: 'exact', head: true });
      return !error;
    } catch {
      return false;
    }
  },

  // Update shop plugin status (vton_enabled)
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
  }
};
