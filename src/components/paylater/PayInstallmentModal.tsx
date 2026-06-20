"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import {
  formatRupiah,
  formatDate,
  getToday,
  getErrorMessage,
} from "@/lib/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import type { PaylaterInstallment, Wallet } from "@/lib/types";

interface PayInstallmentModalProps {
  installment: PaylaterInstallment;
  purchaseDescription: string;
  tenor: number;
  wallets: Wallet[];
  onConfirm: (walletId: string, paidDate: string) => Promise<void>;
  onClose: () => void;
}

export default function PayInstallmentModal({
  installment,
  purchaseDescription,
  tenor,
  wallets,
  onConfirm,
  onClose,
}: PayInstallmentModalProps) {
  useEscapeKey(onClose);

  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [paidDate, setPaidDate] = useState(getToday());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletOptions = useMemo(
    () => wallets.map((w) => ({ value: w.id, label: w.name, icon: w.icon })),
    [wallets]
  );

  const handleConfirm = async () => {
    if (!walletId) {
      setError("Pilih dompet pembayaran terlebih dahulu");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(walletId, paidDate);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Gagal mencatat pembayaran"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bayar Cicilan"
        className="modal-content !max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">Bayar Cicilan</h2>
            <p className="text-xs text-muted mt-0.5 truncate">
              Cicilan {installment.installment_no}/{tenor} — {purchaseDescription}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-card-hover transition-colors text-muted"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-expense/10 border border-expense/20 text-expense text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Amount summary */}
          <div className="p-4 rounded-xl bg-card-hover border border-card-border text-center">
            <p className="text-xs text-muted mb-1">Jumlah Cicilan</p>
            <p className="text-2xl font-bold text-expense">
              {formatRupiah(installment.amount)}
            </p>
            <p className="text-xs text-muted mt-1">
              Jatuh tempo {formatDate(installment.due_date)}
            </p>
          </div>

          {wallets.length === 0 ? (
            <p className="text-sm text-muted text-center">
              Belum ada dompet. Buat dompet dulu untuk mencatat pembayaran.
            </p>
          ) : (
            <>
              {/* Wallet */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Bayar dari Dompet
                </label>
                <CustomSelect
                  value={walletId}
                  onChange={setWalletId}
                  options={walletOptions}
                  placeholder="Pilih dompet..."
                  id="pay-installment-wallet-select"
                  showDefaultOption={false}
                />
                <p className="text-xs text-muted mt-1.5">
                  Saldo dompet ini akan berkurang sebesar cicilan.
                </p>
              </div>

              {/* Paid date */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Tanggal Bayar
                </label>
                <CustomDatePicker
                  value={paidDate}
                  onChange={setPaidDate}
                  id="pay-installment-date-picker"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || wallets.length === 0}
              className="btn-primary flex-1"
              id="pay-installment-confirm-btn"
            >
              {submitting ? "Menyimpan..." : "Bayar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
