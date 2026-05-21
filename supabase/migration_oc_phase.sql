-- Operational Calibration Phase — schema additions
-- Run this in your Supabase SQL editor

-- Add current company and title to candidates
alter table public.candidates
  add column if not exists current_company text,
  add column if not exists current_title text;

-- Add blocker field to role_tracker for weekly view
alter table public.role_tracker
  add column if not exists blocker text;
