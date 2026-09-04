-- HR module: employee master data (Head Office + Project workforce)

CREATE TABLE IF NOT EXISTS hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workforce TEXT NOT NULL CHECK (workforce IN ('head_office', 'project')),
  employee_no TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL,
  sex TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  job_title_key TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  salary NUMERIC(14, 2),
  desert_allowance NUMERIC(14, 2),
  food_allowance NUMERIC(14, 2),
  total_pay NUMERIC(14, 2),
  department TEXT NOT NULL DEFAULT '',
  work_location TEXT NOT NULL DEFAULT '',
  employee_type TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  source_row INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_employees_workforce ON hr_employees(workforce, is_active);
CREATE INDEX IF NOT EXISTS idx_hr_employees_department ON hr_employees(department);
CREATE INDEX IF NOT EXISTS idx_hr_employees_location ON hr_employees(work_location);
CREATE INDEX IF NOT EXISTS idx_hr_employees_job_key ON hr_employees(job_title_key);
CREATE INDEX IF NOT EXISTS idx_hr_employees_employee_no ON hr_employees(employee_no);
