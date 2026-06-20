-- ========================================================
-- Migration 009: (Dibatalkan) Siklus Penagihan PayLater
-- Jalankan di Supabase SQL Editor
-- ========================================================
-- Pendekatan "siklus penagihan per akun" diganti: jatuh tempo
-- kini DIHITUNG OTOMATIS dari tanggal pembelian di aplikasi
-- (pola SPayLater: tanggal beli + 10 hari, lalu bulanan).
-- Tidak ada kolom database yang diperlukan.
--
-- Script ini aman dijalankan baik bila versi awal migration 009
-- (yang menambah kolom statement_day/due_day) sudah pernah
-- dijalankan maupun belum — kolom & constraint akan dibersihkan
-- bila ada.

ALTER TABLE paylater_accounts
  DROP CONSTRAINT IF EXISTS paylater_accounts_statement_day_chk;
ALTER TABLE paylater_accounts
  DROP CONSTRAINT IF EXISTS paylater_accounts_due_day_chk;

ALTER TABLE paylater_accounts
  DROP COLUMN IF EXISTS statement_day;
ALTER TABLE paylater_accounts
  DROP COLUMN IF EXISTS due_day;
