-- ========================================================
-- Migration 008: Fitur Pengeluaran PayLater
-- Jalankan di Supabase SQL Editor
-- ========================================================
-- Model:
--   paylater_accounts     : penyedia paylater (Shopee PayLater,
--                           Kredivo, dll) + limit kredit.
--   paylater_purchases    : pembelian yang dibayar via paylater,
--                           punya tenor (jumlah cicilan).
--   paylater_installments : satu baris per cicilan bulanan.
-- Saldo dompet TIDAK dipotong saat pembelian. Saat sebuah
-- cicilan ditandai lunas, aplikasi membuat transaksi expense
-- biasa di dompet terpilih (transaction_id) sehingga trigger
-- update_wallet_balance memotong saldo + masuk laporan.
-- Membatalkan pelunasan menghapus transaksi itu (saldo balik).

-- --------------------------------------------------------
-- 1. Akun PayLater
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS paylater_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💳',
  color TEXT DEFAULT '#a78bfa',
  credit_limit BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- --------------------------------------------------------
-- 2. Pembelian PayLater
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS paylater_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES paylater_accounts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  tenor INT NOT NULL CHECK (tenor >= 1),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- --------------------------------------------------------
-- 3. Cicilan PayLater
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS paylater_installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES paylater_purchases(id) ON DELETE CASCADE,
  installment_no INT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  -- transaksi expense yang dibuat saat cicilan dilunasi; dihapus
  -- saat pelunasan dibatalkan agar saldo dompet kembali.
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- --------------------------------------------------------
-- 4. Index
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_paylater_accounts_user
  ON paylater_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_paylater_purchases_user
  ON paylater_purchases(user_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_paylater_purchases_account
  ON paylater_purchases(account_id);
CREATE INDEX IF NOT EXISTS idx_paylater_installments_purchase
  ON paylater_installments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_paylater_installments_user_due
  ON paylater_installments(user_id, due_date);

-- --------------------------------------------------------
-- 5. Row Level Security (per-user)
-- --------------------------------------------------------
ALTER TABLE paylater_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paylater_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE paylater_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own paylater accounts" ON paylater_accounts;
CREATE POLICY "Users manage own paylater accounts" ON paylater_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own paylater purchases" ON paylater_purchases;
CREATE POLICY "Users manage own paylater purchases" ON paylater_purchases
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own paylater installments" ON paylater_installments;
CREATE POLICY "Users manage own paylater installments" ON paylater_installments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------
-- 6. Realtime (safe check, tidak gagal kalau sudah terdaftar)
-- --------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'paylater_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE paylater_accounts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'paylater_purchases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE paylater_purchases;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'paylater_installments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE paylater_installments;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
