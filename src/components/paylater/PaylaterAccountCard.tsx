"use client";

import { Pencil, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { PaylaterAccount } from "@/lib/types";

interface PaylaterAccountCardProps {
  account: PaylaterAccount;
  outstanding: number;
  onEdit: (account: PaylaterAccount) => void;
  onDelete: (id: string) => void;
}

export default function PaylaterAccountCard({
  account,
  outstanding,
  onEdit,
  onDelete,
}: PaylaterAccountCardProps) {
  const hasLimit = account.credit_limit > 0;
  const usedPct = hasLimit
    ? Math.min(100, Math.round((outstanding / account.credit_limit) * 100))
    : 0;
  const available = Math.max(0, account.credit_limit - outstanding);

  return (
    <div className="glass-card p-5 flex flex-col gap-4" style={{ borderRadius: 20 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: account.color + "20" }}
          >
            {account.icon}
          </span>
          <div className="min-w-0">
            <p className="font-semibold truncate" style={{ color: account.color }}>
              {account.name}
            </p>
            <p className="text-xs text-muted">
              {hasLimit ? `Limit ${formatRupiah(account.credit_limit)}` : "Tanpa limit"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(account)}
            className="p-2 rounded-lg hover:bg-card-hover transition-colors text-muted"
            aria-label="Edit akun"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(account.id)}
            className="p-2 rounded-lg hover:bg-expense/10 hover:text-expense transition-colors text-muted"
            aria-label="Hapus akun"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted">Sisa Tagihan</p>
        <p className="text-xl font-bold text-expense">{formatRupiah(outstanding)}</p>
      </div>

      {hasLimit && (
        <div>
          <div
            className="h-2 w-full rounded-full overflow-hidden"
            style={{ background: "var(--glass-bg-hover)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usedPct}%`,
                background: usedPct >= 90 ? "var(--color-expense)" : account.color,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-muted">
            <span>Terpakai {usedPct}%</span>
            <span>Sisa limit {formatRupiah(available)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
