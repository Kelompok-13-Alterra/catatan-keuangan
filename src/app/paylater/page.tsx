"use client";

import { useMemo, useState } from "react";
import { Plus, CreditCard, Wallet as WalletIcon, CalendarClock } from "lucide-react";
import { usePaylaterAccounts } from "@/hooks/usePaylaterAccounts";
import { usePaylaterPurchases } from "@/hooks/usePaylaterPurchases";
import { useWallets } from "@/hooks/useWallets";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/context/ToastContext";
import { formatRupiah, getCurrentYearMonth } from "@/lib/utils";
import PaylaterAccountForm from "@/components/paylater/PaylaterAccountForm";
import PaylaterAccountCard from "@/components/paylater/PaylaterAccountCard";
import PaylaterPurchaseForm from "@/components/paylater/PaylaterPurchaseForm";
import PaylaterPurchaseCard from "@/components/paylater/PaylaterPurchaseCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ErrorBanner from "@/components/ui/ErrorBanner";
import type {
  PaylaterAccount,
  PaylaterAccountFormData,
  PaylaterInstallment,
  PaylaterPurchaseFormData,
} from "@/lib/types";

export default function PaylaterPage() {
  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    addAccount,
    updateAccount,
    deleteAccount,
    refetch: refetchAccounts,
  } = usePaylaterAccounts();
  const {
    purchases,
    loading: purchasesLoading,
    error: purchasesError,
    addPurchase,
    payInstallment,
    unpayInstallment,
    deletePurchase,
    refetch: refetchPurchases,
  } = usePaylaterPurchases();
  const { wallets } = useWallets();
  const { expenseCategories } = useCategories();
  const { showToast } = useToast();

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaylaterAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null);

  // Sisa tagihan (cicilan belum lunas) per akun & total.
  const outstandingByAccount = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of purchases) {
      const unpaid = p.installments
        .filter((i) => !i.paid)
        .reduce((s, i) => s + i.amount, 0);
      map.set(p.account_id, (map.get(p.account_id) ?? 0) + unpaid);
    }
    return map;
  }, [purchases]);

  const totalOutstanding = useMemo(
    () => Array.from(outstandingByAccount.values()).reduce((s, v) => s + v, 0),
    [outstandingByAccount]
  );

  const totalLimit = useMemo(
    () => accounts.reduce((s, a) => s + a.credit_limit, 0),
    [accounts]
  );

  // Cicilan yang jatuh tempo bulan berjalan & belum dibayar.
  const dueThisMonth = useMemo(() => {
    const ym = getCurrentYearMonth();
    let sum = 0;
    for (const p of purchases) {
      for (const i of p.installments) {
        if (!i.paid && i.due_date.startsWith(ym)) sum += i.amount;
      }
    }
    return sum;
  }, [purchases]);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  const deletingAccount = accounts.find((a) => a.id === deletingAccountId);
  const deletingPurchase = purchases.find((p) => p.id === deletingPurchaseId);

  const handleAccountSubmit = async (data: PaylaterAccountFormData) => {
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, data);
        showToast("Akun paylater diperbarui!", "success");
      } else {
        await addAccount(data);
        showToast("Akun paylater ditambahkan!", "success");
      }
    } catch {
      showToast("Gagal menyimpan akun paylater.", "error");
      throw new Error("Gagal menyimpan akun paylater");
    }
  };

  const handleAccountDelete = async () => {
    if (!deletingAccountId) return;
    try {
      // Hapus pembelian akun lebih dulu agar transaksi pelunasannya
      // dibersihkan & saldo dompet kembali (CASCADE DB tidak menyentuh
      // tabel transactions). Setelah itu baru hapus akunnya.
      const ownedPurchases = purchases.filter(
        (p) => p.account_id === deletingAccountId
      );
      for (const p of ownedPurchases) {
        await deletePurchase(p.id);
      }
      await deleteAccount(deletingAccountId);
      showToast("Akun paylater dihapus.", "success");
    } catch {
      showToast("Gagal menghapus akun paylater.", "error");
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handlePurchaseSubmit = async (data: PaylaterPurchaseFormData) => {
    try {
      await addPurchase(data);
      showToast("Pembelian paylater ditambahkan!", "success");
    } catch {
      showToast("Gagal menyimpan pembelian.", "error");
      throw new Error("Gagal menyimpan pembelian");
    }
  };

  const handlePurchaseDelete = async () => {
    if (!deletingPurchaseId) return;
    try {
      await deletePurchase(deletingPurchaseId);
      showToast("Pembelian dihapus.", "success");
    } catch {
      showToast("Gagal menghapus pembelian.", "error");
    } finally {
      setDeletingPurchaseId(null);
    }
  };

  const handlePay = async (
    installment: PaylaterInstallment,
    walletId: string,
    paidDate: string
  ) => {
    const purchase = purchases.find((p) => p.id === installment.purchase_id);
    if (!purchase) return;
    try {
      await payInstallment(
        installment,
        walletId,
        paidDate,
        purchase.description,
        purchase.tenor,
        purchase.category_id
      );
      showToast("Cicilan dibayar!", "success");
    } catch {
      showToast("Gagal mencatat pembayaran.", "error");
      throw new Error("Gagal mencatat pembayaran");
    }
  };

  const handleUnpay = async (installment: PaylaterInstallment) => {
    try {
      await unpayInstallment(installment);
      showToast("Pembayaran dibatalkan, saldo dikembalikan.", "success");
    } catch {
      showToast("Gagal membatalkan pembayaran.", "error");
      throw new Error("Gagal membatalkan pembayaran");
    }
  };

  const loading = accountsLoading || purchasesLoading;
  const error = accountsError || purchasesError;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-in-right">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-0.5">PayLater</h1>
          <p className="text-xs sm:text-sm text-muted">
            Kelola pembelian cicilan dan tagihan paylater Anda
          </p>
        </div>
        {accounts.length > 0 && (
          <button
            onClick={() => setShowAccountForm(true)}
            className="btn-secondary"
            id="add-paylater-account-btn"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Tambah Akun</span>
          </button>
        )}
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => {
            refetchAccounts();
            refetchPurchases();
          }}
        />
      )}

      {loading && accounts.length === 0 && purchases.length === 0 ? (
        /* Skeleton awal */
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card skeleton" style={{ height: 74, borderRadius: 18 }} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card skeleton" style={{ height: 150, borderRadius: 20 }} />
            ))}
          </div>
        </div>
      ) : accounts.length === 0 ? (
        /* Onboarding tunggal saat belum ada apa pun */
        <div className="glass-card flex flex-col items-center text-center px-6 py-14 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-accent/12 flex items-center justify-center mb-4">
            <CreditCard size={28} className="text-accent" />
          </div>
          <p className="text-lg font-semibold">Mulai kelola PayLater</p>
          <p className="text-sm text-muted mt-1.5 max-w-md">
            Tambahkan akun penyedia seperti Shopee PayLater, Kredivo, atau Akulaku.
            Setelah itu Anda bisa mencatat pembelian beserta cicilannya.
          </p>
          <button
            onClick={() => setShowAccountForm(true)}
            className="btn-primary mt-5"
            id="empty-add-paylater-account-btn"
          >
            <Plus size={16} />
            Tambah Akun PayLater
          </button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-expense/15 flex items-center justify-center shrink-0">
                <CreditCard size={18} className="text-expense" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted">Total Tagihan</p>
                <p className="text-lg font-bold text-expense truncate">
                  {formatRupiah(totalOutstanding)}
                </p>
              </div>
            </div>
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <CalendarClock size={18} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted">Jatuh Tempo Bulan Ini</p>
                <p className="text-lg font-bold truncate">{formatRupiah(dueThisMonth)}</p>
              </div>
            </div>
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-income/15 flex items-center justify-center shrink-0">
                <WalletIcon size={18} className="text-income" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted">Total Limit</p>
                <p className="text-lg font-bold truncate">{formatRupiah(totalLimit)}</p>
              </div>
            </div>
          </div>

          {/* Accounts */}
          <div>
            <h2 className="text-sm font-semibold text-muted mb-3">Akun PayLater</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <PaylaterAccountCard
                  key={account.id}
                  account={account}
                  outstanding={outstandingByAccount.get(account.id) ?? 0}
                  onEdit={(a) => {
                    setEditingAccount(a);
                    setShowAccountForm(true);
                  }}
                  onDelete={(id) => setDeletingAccountId(id)}
                />
              ))}
            </div>
          </div>

          {/* Purchases */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted">Pembelian PayLater</h2>
              <button
                onClick={() => setShowPurchaseForm(true)}
                className="btn-primary"
                id="add-paylater-purchase-btn"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Tambah Pembelian</span>
              </button>
            </div>

            {purchases.length === 0 ? (
              <div className="glass-card flex flex-col items-center text-center px-6 py-10 animate-fade-in">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--glass-bg-hover)" }}>
                  <CreditCard size={22} className="text-muted" />
                </div>
                <p className="text-sm font-medium">Belum ada pembelian</p>
                <p className="text-xs text-muted mt-1 mb-4 max-w-xs">
                  Catat pembelian cicilan pertama Anda di akun paylater.
                </p>
                <button
                  onClick={() => setShowPurchaseForm(true)}
                  className="btn-primary"
                  id="empty-add-paylater-purchase-btn"
                >
                  <Plus size={16} />
                  Tambah Pembelian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {purchases.map((purchase) => {
                  const account = accountMap.get(purchase.account_id);
                  return (
                    <PaylaterPurchaseCard
                      key={purchase.id}
                      purchase={purchase}
                      accountName={account?.name ?? "PayLater"}
                      accountIcon={account?.icon ?? "💳"}
                      accountColor={account?.color ?? "#a78bfa"}
                      wallets={wallets}
                      onPay={handlePay}
                      onUnpay={handleUnpay}
                      onDelete={(id) => setDeletingPurchaseId(id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showAccountForm && (
        <PaylaterAccountForm
          key={editingAccount?.id ?? "new"}
          account={editingAccount}
          onSubmit={handleAccountSubmit}
          onClose={() => {
            setShowAccountForm(false);
            setEditingAccount(null);
          }}
        />
      )}

      {showPurchaseForm && (
        <PaylaterPurchaseForm
          accounts={accounts}
          categories={expenseCategories}
          onSubmit={handlePurchaseSubmit}
          onClose={() => setShowPurchaseForm(false)}
        />
      )}

      {deletingAccountId && (
        <ConfirmDialog
          title="Hapus Akun PayLater"
          message={`Yakin hapus akun "${deletingAccount?.name}"? Semua pembelian, cicilan, dan transaksi pembayarannya akan ikut terhapus dan saldo dompet dikembalikan.`}
          confirmLabel="Ya, Hapus"
          onConfirm={handleAccountDelete}
          onCancel={() => setDeletingAccountId(null)}
        />
      )}

      {deletingPurchaseId && (
        <ConfirmDialog
          title="Hapus Pembelian"
          message={`Yakin hapus pembelian "${deletingPurchase?.description}"? Cicilan yang sudah dibayar akan dibatalkan dan saldo dompet dikembalikan.`}
          confirmLabel="Ya, Hapus"
          onConfirm={handlePurchaseDelete}
          onCancel={() => setDeletingPurchaseId(null)}
        />
      )}
    </div>
  );
}
