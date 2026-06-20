"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import {
  formatRupiah,
  formatRupiahInput,
  formatDateShort,
  getToday,
  getErrorMessage,
  computeInstallmentDueDates,
} from "@/lib/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import type {
  Category,
  PaylaterAccount,
  PaylaterPurchaseFormData,
} from "@/lib/types";

const TENOR_OPTIONS = [1, 3, 6, 9, 12, 18, 24];

interface PaylaterPurchaseFormProps {
  accounts: PaylaterAccount[];
  categories: Category[];
  onSubmit: (data: PaylaterPurchaseFormData) => Promise<void>;
  onClose: () => void;
}

export default function PaylaterPurchaseForm({
  accounts,
  categories,
  onSubmit,
  onClose,
}: PaylaterPurchaseFormProps) {
  useEscapeKey(onClose);

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [tenor, setTenor] = useState(3);
  const [categoryId, setCategoryId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(getToday());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name, icon: a.icon })),
    [accounts]
  );

  const numericAmount = Number(amount.replace(/\D/g, ""));

  // Preview cicilan: bagi rata, sisa ke cicilan terakhir. Jatuh tempo
  // otomatis dari tanggal beli (pola SPayLater: tgl beli + 10).
  const preview = useMemo(() => {
    if (!numericAmount || tenor < 1) return null;
    const base = Math.floor(numericAmount / tenor);
    const last = base + (numericAmount - base * tenor);
    const dueDates = computeInstallmentDueDates(purchaseDate, tenor);
    return {
      base,
      last,
      firstDue: dueDates[0],
      lastDue: dueDates[dueDates.length - 1],
      same: base === last,
    };
  }, [numericAmount, tenor, purchaseDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId) {
      setError("Pilih akun paylater terlebih dahulu");
      return;
    }
    if (!description.trim()) {
      setError("Deskripsi pembelian wajib diisi");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        account_id: accountId,
        description: description.trim(),
        amount: numericAmount,
        tenor,
        purchase_date: purchaseDate,
        category_id: categoryId || null,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Gagal menyimpan"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tambah Pembelian PayLater"
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">Pembelian PayLater</h2>
            <p className="text-xs text-muted mt-0.5">
              Catat pembelian dan tenor cicilannya
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Akun PayLater
            </label>
            <CustomSelect
              value={accountId}
              onChange={setAccountId}
              options={accountOptions}
              placeholder="Pilih akun..."
              id="paylater-purchase-account-select"
              showDefaultOption={false}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Deskripsi
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              placeholder="Contoh: HP Samsung A55"
              autoFocus
              id="paylater-purchase-description-input"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Total Harga (Rp)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(formatRupiahInput(e.target.value))}
              className="form-input"
              placeholder="Rp 0"
              id="paylater-purchase-amount-input"
            />
          </div>

          {/* Tenor */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Tenor (bulan)
            </label>
            <div
              className="flex gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-2 sm:pb-0"
              style={{ scrollbarWidth: "none" }}
            >
              {TENOR_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTenor(t)}
                  className={`px-3.5 py-2 rounded-lg text-sm transition-all shrink-0 ${
                    tenor === t
                      ? "border-2 border-accent text-accent font-semibold bg-accent/10"
                      : "border border-card-border hover:border-muted"
                  }`}
                >
                  {t}x
                </button>
              ))}
            </div>
          </div>

          {/* Installment preview */}
          {preview && (
            <div className="p-3 rounded-xl bg-accent/8 border border-accent/20 text-sm">
              <p className="font-semibold text-accent mb-1">
                {tenor}x {formatRupiah(preview.base)}
                {!preview.same && (
                  <span className="font-normal text-muted">
                    {" "}
                    (terakhir {formatRupiah(preview.last)})
                  </span>
                )}
                <span className="font-normal text-muted"> / bulan</span>
              </p>
              <p className="text-xs text-muted">
                Jatuh tempo pertama {formatDateShort(preview.firstDue)}
                {" — terakhir "}
                {formatDateShort(preview.lastDue)}
              </p>
              <p className="text-[11px] text-muted mt-1.5">
                Jatuh tempo otomatis: tanggal beli + 10, jatuh di bulan
                berikutnya, lalu tiap bulan untuk cicilan selanjutnya.
              </p>
            </div>
          )}

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Kategori <span className="text-xs font-normal">(opsional)</span>
              </label>
              <div
                className="flex gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-2 sm:pb-0"
                style={{ scrollbarWidth: "none" }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setCategoryId(categoryId === cat.id ? "" : cat.id)
                    }
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all shrink-0 ${
                      categoryId === cat.id
                        ? "border-2 font-medium"
                        : "border border-card-border hover:border-muted"
                    }`}
                    style={
                      categoryId === cat.id
                        ? {
                            backgroundColor: cat.color + "15",
                            borderColor: cat.color + "50",
                            color: cat.color,
                          }
                        : {}
                    }
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Purchase date */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Tanggal Pembelian
            </label>
            <CustomDatePicker
              value={purchaseDate}
              onChange={setPurchaseDate}
              id="paylater-purchase-date-picker"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
              id="paylater-purchase-submit-btn"
            >
              {submitting ? "Menyimpan..." : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
