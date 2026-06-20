"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { getCached, setCached } from "@/lib/queryCache";
import type { PaylaterAccount, PaylaterAccountFormData } from "@/lib/types";

export function usePaylaterAccounts() {
  const { userId } = useAuth();
  const cacheKey = `paylater_accounts:${userId}`;
  // Stale-while-revalidate: tampilkan data cache dulu, revalidasi di belakang
  const [accounts, setAccounts] = useState<PaylaterAccount[]>(
    () => getCached<PaylaterAccount[]>(cacheKey) ?? []
  );
  const [loading, setLoading] = useState(() => !getCached(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: err } = await supabase
        .from("paylater_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (err) throw err;
      setAccounts(data || []);
      setCached(cacheKey, data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat akun paylater");
    } finally {
      setLoading(false);
    }
  }, [userId, cacheKey]);

  useEffect(() => {
    // Fetch-on-mount sah untuk data layer client-only; semua setState di
    // dalamnya terjadi setelah await, bukan sinkron (rule ini konservatif).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccounts();
  }, [fetchAccounts]);

  const { skipNextChange } = useRealtimeSubscription({
    table: "paylater_accounts",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onChanged: fetchAccounts,
    enabled: !!userId,
  });

  const addAccount = async (data: PaylaterAccountFormData) => {
    if (!userId) return;

    skipNextChange();
    const { error: err } = await supabase
      .from("paylater_accounts")
      .insert([{ ...data, user_id: userId }]);
    if (err) throw err;
    await fetchAccounts();
  };

  const updateAccount = async (id: string, data: Partial<PaylaterAccountFormData>) => {
    if (!userId) return;

    // Optimistic update (sinkron ke cache)
    const next = accounts.map((a) =>
      a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a
    );
    setAccounts(next);
    setCached(cacheKey, next);

    skipNextChange();
    const { error: err } = await supabase
      .from("paylater_accounts")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);

    if (err) {
      await fetchAccounts();
      throw err;
    }
  };

  const deleteAccount = async (id: string) => {
    if (!userId) return;

    // Optimistic delete (sinkron ke cache). Pembelian & cicilan ikut
    // terhapus via ON DELETE CASCADE di database.
    const next = accounts.filter((a) => a.id !== id);
    setAccounts(next);
    setCached(cacheKey, next);

    skipNextChange();
    const { error: err } = await supabase
      .from("paylater_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (err) {
      await fetchAccounts();
      throw err;
    }
  };

  return {
    accounts,
    loading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts,
  };
}
