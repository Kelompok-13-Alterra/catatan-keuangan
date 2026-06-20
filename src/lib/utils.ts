import { format, parseISO, addMonths, setDate, lastDayOfMonth } from "date-fns";
import { id } from "date-fns/locale";

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRupiahInput(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (!clean) return "";
  return formatRupiah(parseInt(clean, 10));
}


/**
 * Ambil pesan error yang bisa ditampilkan ke user dari nilai `unknown`
 * (Supabase kadang melempar object non-Error yang punya properti `message`).
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, "dd MMM yyyy", { locale: id });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, "dd MMM", { locale: id });
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(dateStr: string): string {
  try {
    const date = parseISO(dateStr + "-01");
    return format(date, "MMM yyyy", { locale: id });
  } catch {
    return dateStr;
  }
}

export function getToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Bulan berjalan dalam format "YYYY-MM". */
export function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Rentang tanggal satu bulan penuh: "YYYY-MM" → { startDate, endDate }. */
export function getMonthRange(yearMonth: string): {
  startDate: string;
  endDate: string;
} {
  const [y, m] = yearMonth.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    startDate: `${y}-${mm}-01`,
    endDate: `${y}-${mm}-${String(days).padStart(2, "0")}`,
  };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const WALLET_ICONS = [
  "💰", "🏦", "💳", "📱", "💵", "🪙", "💎", "🏧",
];

// Palet pastel soft — cukup pekat untuk teks putih di kartu dompet
export const WALLET_COLORS = [
  "#818cf8", "#60a5fa", "#a78bfa", "#f472b6",
  "#fb7185", "#fbbf24", "#2dd4bf", "#94a3b8",
];

// Dompet lama menyimpan warna dari palet sebelumnya di database.
// Petakan ke padanan pastel-nya saat ditampilkan (hijau → biru),
// tanpa perlu migrasi data; warna baru ikut tersimpan saat dompet diedit.
const LEGACY_WALLET_COLOR_MAP: Record<string, string> = {
  "#10b981": "#60a5fa", // hijau emerald → biru pastel
  "#3b82f6": "#60a5fa",
  "#8b5cf6": "#a78bfa",
  "#f59e0b": "#fbbf24",
  "#ef4444": "#fb7185",
  "#ec4899": "#f472b6",
  "#06b6d4": "#2dd4bf",
  "#64748b": "#94a3b8",
};

export function normalizeWalletColor(color: string): string {
  return LEGACY_WALLET_COLOR_MAP[color.toLowerCase()] ?? color;
}

// Tampilan kartu dompet — warna disamakan persis dengan referensi desain
// (biru-violet vivid), sama untuk semua dompet di halaman Dompet & dashboard.
export const WALLET_CARD_GRADIENT =
  "linear-gradient(160deg, #7a72f7 0%, #4f46e5 42%, #392ec9 100%)";
export const WALLET_CARD_SHADOW = "0 14px 36px rgba(63, 53, 213, 0.35)";

// ============================================
// PayLater — jatuh tempo otomatis
// ============================================

/** Set tanggal pada bulan `d`, di-clamp ke hari terakhir bila melebihi. */
function withDayClamped(d: Date, day: number): Date {
  const last = lastDayOfMonth(d).getDate();
  return setDate(d, Math.min(day, last));
}

/**
 * Hitung tanggal jatuh tempo tiap cicilan ("yyyy-MM-dd") secara otomatis
 * dari tanggal pembelian, mengikuti pola SPayLater. Hari jatuh tempo =
 * tanggal beli + 10 (basis 30 hari), dan SELALU jatuh di bulan berikutnya:
 *   beli tgl 1  → tempo tgl 11 (bulan depan)
 *   beli tgl 15 → tempo tgl 25 (bulan depan)
 *   beli tgl 21 → tempo tgl 1  (bulan depan)
 *   beli tgl 25 → tempo tgl 5  (bulan depan)
 * Cicilan ke-n menambah (n-1) bulan dari jatuh tempo pertama.
 */
export function computeInstallmentDueDates(
  purchaseDate: string,
  tenor: number
): string[] {
  const p = parseISO(purchaseDate);
  const raw = p.getDate() + 10;
  const dueDay = raw > 30 ? raw - 30 : raw;
  // Jatuh tempo selalu bulan berikutnya dari tanggal pembelian.
  const firstDue = withDayClamped(addMonths(p, 1), dueDay);

  return Array.from({ length: tenor }, (_, i) =>
    format(addMonths(firstDue, i), "yyyy-MM-dd")
  );
}
