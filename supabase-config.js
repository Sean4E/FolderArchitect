// Folder Architect - Supabase Configuration
// Replace these with your Supabase project credentials from:
// https://supabase.com/dashboard → Settings → API

const SUPABASE_URL = 'YOUR_SUPABASE_URL';  // e.g., https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // Your anon/public key

// Export for use in HTML
window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
};
