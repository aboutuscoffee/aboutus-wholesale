import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { fetchMyProfile, fetchPrices } from './db';

// ログイン中の取引先（ws_customers の行）と、その取引先に見せる価格（承認済みのみ）
export function useAccount() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  // パスワード再設定メールのリンクから開いたとき true（新しいパスワードの入力画面を出す）
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPrices({});
      setLoading(false);
      return;
    }
    try {
      const p = await fetchMyProfile(user.id);
      setProfile(p);
      setPrices(p?.status === 'approved' ? await fetchPrices() : {});
    } catch (e) {
      console.warn('アカウント情報の読み込みに失敗:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    user,
    profile,
    setProfile,
    prices,
    loading,
    refresh,
    recovery,
    endRecovery: () => setRecovery(false),
    isApproved: profile?.status === 'approved',
    isAdmin: profile?.role === 'admin' && profile?.status === 'approved',
  };
}
