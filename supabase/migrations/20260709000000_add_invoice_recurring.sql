-- Migration: Add `is_recurring` column to `public.crm_invoices` table
-- Run this in the Supabase SQL editor or CLI to apply it.

ALTER TABLE public.crm_invoices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
