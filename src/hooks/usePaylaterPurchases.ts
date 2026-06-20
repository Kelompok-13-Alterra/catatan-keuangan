"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { getCached, setCached } from "@/lib/queryCache";
import { computeInstallmentDueDates } from "@/lib/utils";
import type {
  PaylaterInstallment,
  PaylaterPurchaseFormData,
  PaylaterPurchaseWithRelations,
} from "@/lib/types";

const EMPTY: PaylaterPurchaseWithRelations[] = [];

/**
 * Bagi total `amount` jadi `tenor` cicilan rata. Sisa pembagian
 * ditambahkan ke cicilan terakhir agar totalnya tetap persis.
 */
function splitInstallmentAmounts(amount: number, tenor: number): number[] {
  const base = Math.floor(amount / tenor);
  const amounts = Array.from({ length: tenor }, () => base);
  amounts[tenor - 1] += amount - base * tenor;
  return amounts;
}

export function usePaylaterPurchases() {
  const { userId } = useAuth();
  const cacheKey = `paylater_purchases:${userId}`;
  const [purchases, setPurchases] = useState<PaylaterPurchaseWithRelations[]>(
    () => getCached<PaylaterPurchaseWithRelations[]>(cacheKey) ?? EMPTY
  );
  const [loading, setLoading] = useState(() => !getCached(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: err } = await supabase
        .from("paylater_purchases")
        .select(
          `
          id, account_id, description, amount, tenor, purchase_date,
          category_id, created_at, updated_at, user_id,
          category:categories(id, name, icon, color, type, created_at),
          installments:paylater_installments(
            id, purchase_id, installment_no, amount, due_date, paid,
            paid_date, wallet_id, transaction_id, created_at, updated_at, user_id
          )
        `
        )
        .eq("user_id", userId)
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (err) throw err;
      const rows = ((data as unknown as PaylaterPurchaseWithRelations[]) || []).map(
        (p) => ({
          ...p,
          installments: [...(p.installments || [])].sort(
            (a, b) => a.installment_no - b.installment_no
          ),
        })
      );
      setPurchases(rows);
      setCached(cacheKey, rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pembelian paylater");
    } finally {
      setLoading(false);
    }
  }, [userId, cacheKey]);

  useEffect(() => {
    // Fetch-on-mount sah untuk data layer client-only; semua setState di
    // dalamnya terjadi setelah await, bukan sinkron (rule ini konservatif).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPurchases();
  }, [fetchPurchases]);

  // Perubahan pada salah satu tabel paylater memicu refetch gabungan.
  useRealtimeSubscription({
    table: "paylater_purchases",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onChanged: fetchPurchases,
    enabled: !!userId,
  });
  useRealtimeSubscription({
    table: "paylater_installments",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onChanged: fetchPurchases,
    enabled: !!userId,
  });

  /**
   * Buat pembelian baru + generate baris cicilan sesuai tenor.
   * Tanggal jatuh tempo dihitung otomatis dari tanggal pembelian
   * (pola SPayLater: tgl beli + 10), lalu bulanan untuk cicilan berikutnya.
   */
  const addPurchase = async (data: PaylaterPurchaseFormData) => {
    if (!userId) throw new Error("Tidak terautentikasi");

    const { data: purchase, error: err } = await supabase
      .from("paylater_purchases")
      .insert([{ ...data, user_id: userId }])
      .select("id")
      .single();
    if (err) throw err;

    const amounts = splitInstallmentAmounts(data.amount, data.tenor);
    const dueDates = computeInstallmentDueDates(data.purchase_date, data.tenor);
    const rows = amounts.map((amount, i) => ({
      purchase_id: purchase.id,
      installment_no: i + 1,
      amount,
      due_date: dueDates[i],
      paid: false,
      user_id: userId,
    }));

    const { error: err2 } = await supabase
      .from("paylater_installments")
      .insert(rows);
    if (err2) throw err2;

    await fetchPurchases();
  };

  /**
   * Tandai cicilan lunas: buat transaksi expense di dompet terpilih
   * (trigger akan memotong saldo + masuk laporan), lalu tautkan ke cicilan.
   */
  const payInstallment = async (
    installment: PaylaterInstallment,
    walletId: string,
    paidDate: string,
    purchaseDescription: string,
    tenor: number,
    categoryId: string | null
  ) => {
    if (!userId) throw new Error("Tidak terautentikasi");

    const { data: txn, error: err } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: userId,
          type: "expense",
          amount: installment.amount,
          description: `[PAYLATER] Cicilan ${installment.installment_no}/${tenor} — ${purchaseDescription}`,
          category_id: categoryId,
          wallet_id: walletId,
          is_transfer: false,
          date: paidDate,
        },
      ])
      .select("id")
      .single();
    if (err) throw err;

    const { error: err2 } = await supabase
      .from("paylater_installments")
      .update({
        paid: true,
        paid_date: paidDate,
        wallet_id: walletId,
        transaction_id: txn.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", installment.id)
      .eq("user_id", userId);
    if (err2) {
      // Rollback transaksi yang sudah terlanjur dibuat
      await supabase.from("transactions").delete().eq("id", txn.id).eq("user_id", userId);
      throw err2;
    }

    await fetchPurchases();
  };

  /** Batalkan pelunasan: hapus transaksi terkait (saldo kembali) + reset cicilan. */
  const unpayInstallment = async (installment: PaylaterInstallment) => {
    if (!userId) throw new Error("Tidak terautentikasi");

    if (installment.transaction_id) {
      const { error: errTxn } = await supabase
        .from("transactions")
        .delete()
        .eq("id", installment.transaction_id)
        .eq("user_id", userId);
      if (errTxn) throw errTxn;
    }

    const { error: err } = await supabase
      .from("paylater_installments")
      .update({
        paid: false,
        paid_date: null,
        wallet_id: null,
        transaction_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", installment.id)
      .eq("user_id", userId);
    if (err) throw err;

    await fetchPurchases();
  };

  /** Hapus pembelian beserta semua transaksi pelunasannya (saldo dompet kembali). */
  const deletePurchase = async (id: string) => {
    if (!userId) throw new Error("Tidak terautentikasi");

    const purchase = purchases.find((p) => p.id === id);
    const txnIds = (purchase?.installments || [])
      .map((inst) => inst.transaction_id)
      .filter((v): v is string => Boolean(v));

    // Hapus transaksi pelunasan lebih dulu agar trigger mengembalikan saldo.
    // Baris cicilan ikut terhapus via ON DELETE CASCADE saat purchase dihapus.
    if (txnIds.length > 0) {
      const { error: errTxn } = await supabase
        .from("transactions")
        .delete()
        .in("id", txnIds)
        .eq("user_id", userId);
      if (errTxn) throw errTxn;
    }

    // Optimistic remove
    const next = purchases.filter((p) => p.id !== id);
    setPurchases(next);
    setCached(cacheKey, next);

    const { error: err } = await supabase
      .from("paylater_purchases")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (err) {
      await fetchPurchases();
      throw err;
    }
  };

  return {
    purchases,
    loading,
    error,
    addPurchase,
    payInstallment,
    unpayInstallment,
    deletePurchase,
    refetch: fetchPurchases,
  };
}

/** Helper: total terutang (cicilan belum lunas) dari sekumpulan pembelian. */
export function getOutstanding(purchases: PaylaterPurchaseWithRelations[]): number {
  return purchases.reduce(
    (sum, p) =>
      sum +
      p.installments
        .filter((i) => !i.paid)
        .reduce((s, i) => s + i.amount, 0),
    0
  );
}
