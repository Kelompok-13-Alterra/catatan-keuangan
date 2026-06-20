export interface Source {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  user_id?: string | null;
}

export type SourceFormData = {
  name: string;
  icon: string;
  color: string;
};

export interface Wallet {
  id: string;
  name: string;
  icon: string;
  color: string;
  balance: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  created_at: string;
  user_id?: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  category_id: string | null;
  wallet_id: string;
  source_id: string | null;
  is_transfer: boolean;
  date: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface TransactionWithRelations extends Transaction {
  category: Category | null;
  wallet: Wallet;
  source: Source | null;
}

export interface MonthlyReport {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryReport {
  name: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
}

export type TransactionFormData = {
  type: "income" | "expense";
  amount: number;
  description: string;
  category_id: string;
  wallet_id: string;
  source_id: string | null;
  date: string;
};

export type WalletFormData = {
  name: string;
  icon: string;
  color: string;
  balance?: number;
};

export type InvestmentType = "saham" | "reksadana" | "crypto" | "emas" | "obligasi" | "lainnya";

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  current_val: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

// ============================================
// PayLater
// ============================================

/** Penyedia paylater (mis. Shopee PayLater, Kredivo) + limit kredit. */
export interface PaylaterAccount {
  id: string;
  name: string;
  icon: string;
  color: string;
  credit_limit: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export type PaylaterAccountFormData = {
  name: string;
  icon: string;
  color: string;
  credit_limit: number;
};

/** Satu cicilan bulanan dari sebuah pembelian paylater. */
export interface PaylaterInstallment {
  id: string;
  purchase_id: string;
  installment_no: number;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date: string | null;
  /** Dompet yang dipakai melunasi (diisi saat paid). */
  wallet_id: string | null;
  /** Transaksi expense yang dibuat saat cicilan dilunasi. */
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

/** Pembelian yang dibayar via paylater, dipecah jadi `tenor` cicilan. */
export interface PaylaterPurchase {
  id: string;
  account_id: string;
  description: string;
  amount: number;
  tenor: number;
  purchase_date: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface PaylaterPurchaseWithRelations extends PaylaterPurchase {
  category: Category | null;
  installments: PaylaterInstallment[];
}

export type PaylaterPurchaseFormData = {
  account_id: string;
  description: string;
  amount: number;
  tenor: number;
  purchase_date: string;
  category_id: string | null;
};


