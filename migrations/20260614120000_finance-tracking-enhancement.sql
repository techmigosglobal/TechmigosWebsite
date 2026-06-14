-- Finance Tracking Enhancement Migration
-- Adds missing fields for spreadsheet-style finance tracking

-- Ensure crm_finance_transactions has all necessary indexes for spreadsheet queries
create index if not exists crm_finance_type_date_idx on crm_finance_transactions (transaction_type, transaction_date desc);
create index if not exists crm_finance_project_idx on crm_finance_transactions (project);
create index if not exists crm_finance_client_idx on crm_finance_transactions (client);
create index if not exists crm_finance_paid_by_idx on crm_finance_transactions (paid_by);
create index if not exists crm_finance_received_by_idx on crm_finance_transactions (received_by);
create index if not exists crm_finance_source_ref_idx on crm_finance_transactions (source_ref);

-- Add missing fields to crm_projects for enhanced project tracking
alter table crm_projects add column if not exists deadline date;
alter table crm_projects add column if not exists client_name text;
alter table crm_projects add column if not exists project_manager text;
alter table crm_projects add column if not exists progress_percent integer not null default 0;
alter table crm_projects add column if not exists expense_id_prefix text;

-- Create a view for easy spreadsheet-style queries
create or replace view finance_transactions_spreadsheet as
select
  id,
  transaction_date as "Date",
  transaction_type as "Type",
  reference_id as "Reference ID",
  title as "Title",
  client as "Client",
  project as "Project",
  paid_by as "Paid By",
  received_by as "Received By",
  payment_method as "Payment Method",
  department as "Department",
  region as "Region",
  quarter as "Quarter",
  status as "Status",
  amount as "Amount",
  notes as "Notes",
  source as "Source",
  source_ref as "Source Ref",
  created_at as "Created At",
  updated_at as "Updated At"
from crm_finance_transactions
order by transaction_date desc, created_at desc;

-- Create views for each sheet type
create or replace view expenses_sheet as
select
  id,
  transaction_date as "Date",
  reference_id as "Expense ID",
  title as "Purpose",
  paid_by as "Paid By",
  payment_method as "Payment Method",
  status as "Status",
  amount as "Amount",
  notes as "Notes"
from crm_finance_transactions
where transaction_type = 'expense'
order by transaction_date desc;

create or replace view income_sheet as
select
  id,
  transaction_date as "Date",
  reference_id as "Invoice ID",
  client as "Client",
  project as "Project",
  payment_method as "Payment Method",
  status as "Status",
  received_by as "Received By",
  amount as "Amount",
  notes as "Notes"
from crm_finance_transactions
where transaction_type = 'income'
order by transaction_date desc;

create or replace view revenue_sheet as
select
  id,
  transaction_date as "Date",
  title as "Revenue Source",
  department as "Department",
  notes as "Description",
  region as "Region",
  quarter as "Quarter",
  status as "Status",
  amount as "Amount"
from crm_finance_transactions
where transaction_type = 'revenue'
order by transaction_date desc;

create or replace view salary_sheet as
select
  id,
  transaction_date as "Date",
  title as "Employee Name",
  department as "Department",
  paid_by as "Role",
  received_by as "Bank Name",
  payment_method as "Account Number",
  status as "Status",
  amount as "Salary Amount",
  notes as "Notes"
from crm_finance_transactions
where transaction_type = 'salary'
order by transaction_date desc;

create or replace view project_tracking_sheet as
select
  id,
  external_project_id as "Project ID",
  name as "Project Name",
  client_name as "Client Name",
  project_manager as "Project Manager",
  start_date as "Start Date",
  deadline as "Deadline",
  status as "Status",
  priority as "Priority",
  budget as "Budget",
  progress_percent as "Progress %",
  notes as "Notes"
from crm_projects
order by start_date desc;

-- Function to get summary analytics
create or replace function get_finance_summary()
returns jsonb
language sql
as $$
select jsonb_build_object(
  'total_income', coalesce(sum(case when transaction_type = 'income' then amount else 0 end), 0),
  'total_expenses', coalesce(sum(case when transaction_type = 'expense' then amount else 0 end), 0),
  'total_revenue', coalesce(sum(case when transaction_type = 'revenue' then amount else 0 end), 0),
  'total_salary', coalesce(sum(case when transaction_type = 'salary' then amount else 0 end), 0),
  'by_type', (
    select jsonb_object_agg(transaction_type, total)
    from (
      select transaction_type, sum(amount) as total
      from crm_finance_transactions
      group by transaction_type
    ) t
  ),
  'by_project', (
    select jsonb_object_agg(project, total)
    from (
      select project, sum(amount) as total
      from crm_finance_transactions
      where project is not null
      group by project
    ) t
  ),
  'by_person_paid', (
    select jsonb_object_agg(paid_by, total)
    from (
      select paid_by, sum(amount) as total
      from crm_finance_transactions
      where paid_by is not null and transaction_type in ('expense', 'salary')
      group by paid_by
    ) t
  ),
  'by_person_received', (
    select jsonb_object_agg(received_by, total)
    from (
      select received_by, sum(amount) as total
      from crm_finance_transactions
      where received_by is not null and transaction_type in ('income', 'revenue')
      group by received_by
    ) t
  )
)
from crm_finance_transactions;
$$;

-- Function to get project-wise analytics
create or replace function get_project_analytics()
returns jsonb
language sql
as $$
select jsonb_agg(jsonb_build_object(
  'project_id', p.id,
  'project_name', p.name,
  'client_name', p.client_name,
  'project_manager', p.project_manager,
  'status', p.status,
  'priority', p.priority,
  'budget', p.budget,
  'expenses', p.expenses,
  'revenue', p.revenue,
  'profit', p.profit,
  'progress_percent', p.progress_percent,
  'start_date', p.start_date,
  'deadline', p.deadline,
  'finance_income', coalesce(fi.total_income, 0),
  'finance_expenses', coalesce(fe.total_expenses, 0),
  'finance_revenue', coalesce(fr.total_revenue, 0),
  'finance_salary', coalesce(fs.total_salary, 0)
))
from crm_projects p
left join (
  select project, sum(amount) as total_income
  from crm_finance_transactions
  where transaction_type = 'income' and project is not null
  group by project
) fi on fi.project = p.name
left join (
  select project, sum(amount) as total_expenses
  from crm_finance_transactions
  where transaction_type = 'expense' and project is not null
  group by project
) fe on fe.project = p.name
left join (
  select project, sum(amount) as total_revenue
  from crm_finance_transactions
  where transaction_type = 'revenue' and project is not null
  group by project
) fr on fr.project = p.name
left join (
  select project, sum(amount) as total_salary
  from crm_finance_transactions
  where transaction_type = 'salary' and project is not null
  group by project
) fs on fs.project = p.name;
$$;

-- Function to get person-wise analytics
create or replace function get_person_analytics()
returns jsonb
language sql
as $$
select jsonb_build_object(
  'by_paid_by', (
    select jsonb_object_agg(paid_by, jsonb_build_object(
      'total_expenses', total_expenses,
      'total_salary', total_salary,
      'total_paid', total_expenses + total_salary,
      'transaction_count', txn_count
    ))
    from (
      select
        paid_by,
        sum(case when transaction_type = 'expense' then amount else 0 end) as total_expenses,
        sum(case when transaction_type = 'salary' then amount else 0 end) as total_salary,
        count(*) as txn_count
      from crm_finance_transactions
      where paid_by is not null and transaction_type in ('expense', 'salary')
      group by paid_by
    ) t
  ),
  'by_received_by', (
    select jsonb_object_agg(received_by, jsonb_build_object(
      'total_income', total_income,
      'total_revenue', total_revenue,
      'total_received', total_income + total_revenue,
      'transaction_count', txn_count
    ))
    from (
      select
        received_by,
        sum(case when transaction_type = 'income' then amount else 0 end) as total_income,
        sum(case when transaction_type = 'revenue' then amount else 0 end) as total_revenue,
        count(*) as txn_count
      from crm_finance_transactions
      where received_by is not null and transaction_type in ('income', 'revenue')
      group by received_by
    ) t
  )
);
$$;