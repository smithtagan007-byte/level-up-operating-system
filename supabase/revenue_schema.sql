-- Revenue schema — run after tracker_schema.sql

create table public.role_revenue (
  id uuid default gen_random_uuid() primary key,
  role_id uuid references public.roles(id) on delete cascade not null unique,
  fee_type text not null default 'percentage' check (fee_type in ('percentage', 'fixed')),
  placement_fee_percentage numeric default 15,
  fixed_fee_amount numeric,
  salary_basis text check (salary_basis in ('Annual CTC', 'Monthly CTC', 'Basic Salary', 'Fixed Fee')),
  estimated_candidate_ctc numeric,
  potential_revenue numeric,
  forecast_probability numeric check (forecast_probability in (0.25, 0.50, 0.75, 0.90)),
  weighted_forecast_revenue numeric generated always as (
    case when potential_revenue is not null and forecast_probability is not null
    then round(potential_revenue * forecast_probability, 2)
    else null end
  ) stored,
  actual_placement_ctc numeric,
  actual_revenue numeric,
  revenue_variance numeric generated always as (
    case when actual_revenue is not null and potential_revenue is not null
    then round(actual_revenue - potential_revenue, 2)
    else null end
  ) stored,
  revenue_status text not null default 'Forecast' check (revenue_status in ('Forecast', 'Hot', 'Placed', 'Closed Lost', 'Invoiced', 'Paid')),
  invoice_status text not null default 'Not Invoiced' check (invoice_status in ('Not Invoiced', 'Invoice Raised', 'Invoice Sent', 'Partially Paid', 'Paid', 'Written Off')),
  closed_lost_reason text,
  lost_revenue numeric,
  manual_override boolean not null default false,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.role_revenue enable row level security;

create policy "Authenticated users can read role_revenue"
  on public.role_revenue for select using (auth.uid() is not null);

create policy "Authenticated users can manage role_revenue"
  on public.role_revenue for all using (auth.uid() is not null);
