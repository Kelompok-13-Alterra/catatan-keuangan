"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { WALLET_COLORS, formatRupiahInput, getErrorMessage } from "@/lib/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { PaylaterAccount, PaylaterAccountFormData } from "@/lib/types";

const PAYLATER_ICONS = [
  "💳", "🛒", "🏬", "📱", "🪙", "🧾", "💸", "🛍️",
  "🏦", "⚡", "🎯", "📦", "💼", "🔖", "💎", "🟣",
];

interface PaylaterAccountFormProps {
  account?: PaylaterAccount | null;
  onSubmit: (data: PaylaterAccountFormData) => Promise<void>;
  onClose: () => void;
}

export default function PaylaterAccountForm({
  account,
  onSubmit,
  onClose,
}: PaylaterAccountFormProps) {
  const [name, setName] = useState(account?.name || "");
  const [icon, setIcon] = useState(account?.icon || "💳");
  const [color, setColor] = useState(account?.color || "#a78bfa");
  const [creditLimit, setCreditLimit] = useState(
    account ? formatRupiahInput(String(account.credit_limit)) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama akun wajib diisi");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        icon,
        color,
        credit_limit: Number(creditLimit.replace(/\D/g, "")) || 0,
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
        aria-label={account ? "Edit Akun PayLater" : "Tambah Akun PayLater"}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">
              {account ? "Edit Akun PayLater" : "Tambah Akun PayLater"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {account
                ? "Ubah detail akun paylater ini"
                : "Contoh: Shopee PayLater, Kredivo, Akulaku"}
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
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card-hover border border-card-border">
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: color + "20" }}
            >
              {icon}
            </span>
            <div>
              <p className="font-semibold text-sm" style={{ color }}>
                {name || "Nama Akun"}
              </p>
              <p className="text-xs text-muted">Preview</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Nama Akun
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Contoh: Shopee PayLater"
              autoFocus
              id="paylater-account-name-input"
            />
          </div>

          {/* Credit limit */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Limit Kredit <span className="text-xs font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={creditLimit}
              onChange={(e) => setCreditLimit(formatRupiahInput(e.target.value))}
              className="form-input"
              placeholder="Rp 0"
              id="paylater-account-limit-input"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Ikon</label>
            <div className="flex flex-wrap gap-2">
              {PAYLATER_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    icon === ic
                      ? "bg-accent/20 border-2 border-accent scale-110"
                      : "bg-card-hover border border-card-border hover:border-muted"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Warna</label>
            <div className="flex flex-wrap gap-2">
              {WALLET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? "scale-125" : "hover:scale-110"
                  }`}
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: "3px",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
              id="paylater-account-submit-btn"
            >
              {submitting ? "Menyimpan..." : account ? "Simpan" : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
