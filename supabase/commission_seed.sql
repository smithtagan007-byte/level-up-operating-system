-- Commission Seed Data — Sample Placements
-- Run this in Supabase SQL Editor to load sample historical records.
-- Replace staff_name values with your actual recruiter names.
-- To link to system users, UPDATE placements SET recruiter_id = (SELECT id FROM user_profiles WHERE full_name = '...')
--   WHERE staff_name = '...' after inserting.

insert into public.placements (
  staff_name, client_invoice_date, client, candidate_name, role_name,
  start_date, annual_ctc, placement_fee_percentage, placement_fee,
  invoice_number, client_paid, commission_percentage, commission_earned,
  commission_month, payroll_month, commission_paid, ts_earned,
  payroll_commission, payroll_advance, advance_paid, notes
) values
  ('Sarah Johnson', '2024-09-05', 'Momentum Metropolitan', 'Thabo Dlamini', 'Senior Financial Analyst',
   '2024-10-01', 780000, 12, 93600,
   'LU-2024-001', true, 20, 18720,
   'Sep-24', 'Oct-24', 18720, 0, 18720, 0, 0, null),

  ('Mike van der Berg', '2024-09-18', 'Discovery Health', 'Zanele Mokoena', 'Actuarial Consultant',
   '2024-10-15', 920000, 12, 110400,
   'LU-2024-002', true, 20, 22080,
   'Sep-24', 'Oct-24', 22080, 0, 22080, 0, 0, null),

  ('Sarah Johnson', '2024-10-08', 'Standard Bank', 'Ruan Venter', 'Risk Manager',
   '2024-11-01', 850000, 12, 102000,
   'LU-2024-003', true, 20, 20400,
   'Oct-24', 'Nov-24', 20400, 0, 20400, 0, 0, null),

  ('Lisa Nkosi', '2024-10-22', 'Old Mutual', 'Priya Govender', 'Compliance Officer',
   '2024-11-15', 650000, 12, 78000,
   'LU-2024-004', true, 20, 15600,
   'Oct-24', 'Nov-24', 15600, 0, 15600, 0, 0, null),

  ('Mike van der Berg', '2024-11-14', 'Nedbank', 'Johan Pretorius', 'Head of Credit',
   '2024-12-01', 1200000, 12, 144000,
   'LU-2024-005', true, 20, 28800,
   'Nov-24', 'Dec-24', 28800, 0, 28800, 0, 0, null),

  ('Sarah Johnson', '2024-11-28', 'FirstRand Group', 'Ayesha Cassim', 'Investment Analyst',
   '2025-01-06', 720000, 12, 86400,
   'LU-2024-006', true, 20, 17280,
   'Nov-24', 'Dec-24', 17280, 0, 17280, 0, 0, null),

  ('Lisa Nkosi', '2025-01-10', 'Sanlam', 'David Oosthuizen', 'Senior Accountant',
   '2025-02-01', 680000, 12, 81600,
   'LU-2025-001', true, 20, 16320,
   'Jan-25', 'Feb-25', 16320, 0, 16320, 0, 0, null),

  ('Mike van der Berg', '2025-01-23', 'Investec', 'Nomvula Sithole', 'Portfolio Manager',
   '2025-03-01', 1050000, 12, 126000,
   'LU-2025-002', true, 20, 25200,
   'Jan-25', 'Feb-25', 25200, 0, 25200, 0, 0, null),

  ('Sarah Johnson', '2025-02-12', 'Absa', 'Christo du Plessis', 'Treasury Analyst',
   '2025-03-10', 760000, 12, 91200,
   'LU-2025-003', true, 20, 18240,
   'Feb-25', 'Mar-25', 18240, 0, 18240, 0, 0, null),

  ('Lisa Nkosi', '2025-02-27', 'RMB', 'Fatima Hendricks', 'Finance Business Partner',
   '2025-04-01', 890000, 12, 106800,
   'LU-2025-004', true, 20, 21360,
   'Feb-25', 'Mar-25', 21360, 0, 21360, 0, 0, null),

  ('Mike van der Berg', '2025-03-19', 'Capitec Bank', 'Sipho Zulu', 'Credit Analyst',
   '2025-04-14', 620000, 12, 74400,
   'LU-2025-005', true, 20, 14880,
   'Mar-25', 'Apr-25', 14880, 0, 14880, 0, 0, null),

  ('Sarah Johnson', '2025-04-08', 'Liberty Life', 'Kayla Ferreira', 'Actuarial Specialist',
   '2025-05-01', 980000, 12, 117600,
   'LU-2025-006', true, 20, 23520,
   'Apr-25', 'May-25', 23520, 0, 23520, 0, 0, null),

  ('Lisa Nkosi', '2025-05-14', 'PSG Financial Services', 'Mpho Khumalo', 'Wealth Manager',
   '2025-06-02', 740000, 12, 88800,
   'LU-2025-007', false, 20, 17760,
   'May-25', 'Jun-25', 0, 0, 0, 0, 0, 'Invoice outstanding'),

  ('Mike van der Berg', '2025-06-03', 'Alexander Forbes', 'Jacques Steyn', 'Pension Fund Consultant',
   '2025-07-01', 860000, 12, 103200,
   'LU-2025-008', false, 20, 20640,
   'Jun-25', 'Jul-25', 0, 0, 0, 0, 0, 'Invoice outstanding'),

  ('Sarah Johnson', '2025-07-21', 'Coronation Fund Managers', 'Nia Abrahams', 'Fund Analyst',
   '2025-08-18', 1100000, 12, 132000,
   'LU-2025-009', false, 20, 26400,
   'Jul-25', 'Aug-25', 0, 0, 0, 0, 0, null);
