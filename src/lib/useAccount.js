import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { fetchCustomerPrices, fetchMyProfile } from './db';

// ログイン中の取引先（ws_customers の行）と、その取引先の特別価格
export function useAccount() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
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
      if (p?.status === 'approved') {
        const rows = await fetchCustomerPrices(user.id);
        setPrices(Object.fromEntries(rows.map((r) => [r.bean_id, r])));
      } else {
        setPrices({});
      }
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
    isApproved: profile?.status === 'approved',
    isAdmin: profile?.role === 'admin' && profile?.status === 'approved',
  };
}
