import { createClient } from '@supabase/supabase-js';

// ログイン状態の保存先。「ログイン状態を保存する」にチェックがあれば localStorage（ログアウトするまで保持）、
// なければ sessionStorage（ブラウザ・タブを閉じたらログアウト）
const REMEMBER_KEY = 'aboutus-wholesale-remember';

export function setRememberLogin(remember) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  } catch { /* 保存できない環境では sessionStorage 扱い */ }
}

export function getRememberLogin() {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return false;
  }
}

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

const authStorage = {
  getItem: (key) => safe(() => localStorage.getItem(key)) ?? safe(() => sessionStorage.getItem(key)),
  setItem: (key, value) => {
    if (getRememberLogin()) {
      safe(() => localStorage.setItem(key, value));
      safe(() => sessionStorage.removeItem(key));
    } else {
      safe(() => sessionStorage.setItem(key, value));
      safe(() => localStorage.removeItem(key));
    }
  },
  removeItem: (key) => {
    safe(() => localStorage.removeItem(key));
    safe(() => sessionStorage.removeItem(key));
  },
};

// 同じオリジン（aboutuscoffee.github.io）・同じSupabaseを使う他アプリ（staff-todo など）の
// ログイン情報と混ざらないよう、卸アプリ専用の保存キーを使う
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: 'aboutus-wholesale-auth',
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }) },
  }
);
