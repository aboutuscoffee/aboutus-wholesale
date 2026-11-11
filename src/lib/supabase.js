import { createClient } from '@supabase/supabase-js';

// 同じオリジン（aboutuscoffee.github.io）・同じSupabaseを使う他アプリ（staff-todo など）の
// ログイン情報と混ざらないよう、卸アプリ専用の保存キーを使う
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: { storageKey: 'aboutus-wholesale-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }) },
  }
);
