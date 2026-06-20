"use client";

import { useState } from "react";
import { Trash2, Check, Clock, CalendarClock, CircleCheck } from "lucide-react";
import { formatRupiah, formatDate, formatDateShort, getToday } from "@/lib/utils";
import type {
  PaylaterInstallment,
  PaylaterPurchaseWithRelations,
  Wallet,
} from "@/lib/types";
import PayInstallmentModal from "@/components/paylater/PayInstallmentModal";

interface PaylaterPurchaseCardProps {
  purchase: PaylaterPurchaseWithRelations;
  accountName: string;
  accountIcon: string;
  accountColor: string;
  wallets: Wallet[];
  onPay: (
    installment: PaylaterInstallment,
    walletId: string,
    paidDate: string
  ) => Promise<void>;
  onUnpay: (installment: PaylaterInstallment) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function PaylaterPurchaseCard({
  purchase,
  accountName,
  accountIcon,
  accountColor,
  wallets,
  onPay,
  onUnpay,
  onDelete,
}: PaylaterPurchaseCardProps) {
  const [payingInstallment, setPayingInstallment] =
    useState<PaylaterInstallment | null>(null);

  const installments = purchase.installments;
  const paidCount = installments.filter((i) => i.paid).length;
  const total = installments.length;
  const paidAmount = installments
    .filter((i) => i.paid)
    .reduce((s, i) => s + i.amount, 0);
  const remaining = purchase.amount - paidAmount;
  const progressPct = total > 0 ? Math.round((paidCount / total) * 100) : 0;
  const isComplete = paidCount === total && total > 0;
  const today = getToday();

  return (
    <div className="glass-card p-5" style={{ borderRadius: 20 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
              style={{ backgroundColor: accountColor + "1a", color: accountColor }}
            >
              <span>{accountIcon}</span>
              {accountName}
            </span>
            {purchase.category && (
              <span className="text-[11px] text-muted">
                {purchase.category.icon} {purchase.category.name}
              </span>
            )}
          </div>
          <p className="font-semibold truncate">{purchase.description}</p>
          <p className="text-xs text-muted">
            {formatRupiah(purchase.amount)} • {purchase.tenor}x cicilan •{" "}
            {formatDateShort(purchase.purchase_date)}
          </p>
        </div>
        <button
          onClick={() => onDelete(purchase.id)}
          className="p-2 rounded-lg hover:bg-expense/10 hover:text-expense transition-colors text-muted shrink-0"
          aria-label="Hapus pembelian"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className={isComplete ? "text-income font-medium" : "text-muted"}>
            {isComplete ? (
              <span className="inline-flex items-center gap-1">
                <CircleCheck size={13} /> Lunas
              </span>
            ) : (
              `${paidCount}/${total} cicilan terbayar`
            )}
          </span>
          <span className="text-muted">
            Sisa <span className="text-expense font-medium">{formatRupiah(remaining)}</span>
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ background: "var(--glass-bg-hover)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: isComplete ? "var(--color-income)" : accountColor,
            }}
          />
        </div>
      </div>

      {/* Installments */}
      <div className="space-y-2">
        {installments.map((inst) => {
          const overdue = !inst.paid && inst.due_date < today;
          return (
            <div
              key={inst.id}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-card-border"
              style={inst.paid ? { background: "var(--glass-bg-hover)" } : undefined}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  background: inst.paid
                    ? "color-mix(in srgb, var(--color-income) 18%, transparent)"
                    : overdue
                    ? "rgba(244,63,94,0.15)"
                    : "var(--glass-bg-hover)",
                  color: inst.paid
                    ? "var(--color-income)"
                    : overdue
                    ? "var(--color-expense)"
                    : "var(--text-secondary)",
                }}
              >
                {inst.installment_no}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{formatRupiah(inst.amount)}</p>
                <p className="text-[11px] text-muted flex items-center gap-1">
                  {inst.paid ? (
                    <>
                      <Check size={11} className="text-income" />
                      Dibayar {inst.paid_date ? formatDate(inst.paid_date) : ""}
                    </>
                  ) : overdue ? (
                    <>
                      <CalendarClock size={11} className="text-expense" />
                      <span className="text-expense">
                        Telat • jatuh tempo {formatDate(inst.due_date)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock size={11} />
                      Jatuh tempo {formatDate(inst.due_date)}
                    </>
                  )}
                </p>
              </div>
              {inst.paid ? (
                <button
                  onClick={() => onUnpay(inst)}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg text-muted hover:bg-card-hover transition-colors shrink-0"
                >
                  Batalkan
                </button>
              ) : (
                <button
                  onClick={() => setPayingInstallment(inst)}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                  style={{
                    background: "var(--accent-primary-dim)",
                    color: "var(--accent-primary)",
                  }}
                >
                  Bayar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {payingInstallment && (
        <PayInstallmentModal
          installment={payingInstallment}
          purchaseDescription={purchase.description}
          tenor={purchase.tenor}
          wallets={wallets}
          onConfirm={(walletId, paidDate) =>
            onPay(payingInstallment, walletId, paidDate)
          }
          onClose={() => setPayingInstallment(null)}
        />
      )}
    </div>
  );
}
