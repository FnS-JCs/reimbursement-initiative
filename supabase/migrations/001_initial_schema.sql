-- Reimbursement App Database Schema
-- Run this migration in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  google_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('jc', 'sc', 'fns')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Sub-categories table (belongs to category)
CREATE TABLE IF NOT EXISTS sub_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (category_id, name)
);

-- Process types table
CREATE TABLE IF NOT EXISTS process_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Cycles table
CREATE TABLE IF NOT EXISTS cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by UUID NOT NULL REFERENCES users(id),
  sc_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  sub_category_id UUID NOT NULL REFERENCES sub_categories(id),
  process_type_id UUID REFERENCES process_types(id),
  bill_date DATE NOT NULL,
  bill_number TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  file_url TEXT NOT NULL,
  is_general BOOLEAN NOT NULL DEFAULT false,
  cycle_id UUID REFERENCES cycles(id),
  physical_received BOOLEAN NOT NULL DEFAULT false,
  is_reimbursed BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  is_voided BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bills_submitted_by ON bills(submitted_by);
CREATE INDEX IF NOT EXISTS idx_bills_sc_id ON bills(sc_id);
CREATE INDEX IF NOT EXISTS idx_bills_cycle_id ON bills(cycle_id);
CREATE INDEX IF NOT EXISTS idx_bills_is_voided ON bills(is_voided);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id ON sub_categories(category_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on bills
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-assign cycle_id on bill insert if no cycle_id provided
CREATE OR REPLACE FUNCTION set_default_cycle_id()
RETURNS TRIGGER AS $$
DECLARE
  active_cycle_id UUID;
BEGIN
  IF NEW.cycle_id IS NULL THEN
    SELECT id INTO active_cycle_id
    FROM cycles
    WHERE is_active = true
    LIMIT 1;
    NEW.cycle_id := active_cycle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bill_default_cycle ON bills;
CREATE TRIGGER set_bill_default_cycle
  BEFORE INSERT ON bills
  FOR EACH ROW
  EXECUTE FUNCTION set_default_cycle_id();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "FnS can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

CREATE POLICY "FnS can insert users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

CREATE POLICY "FnS can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- Bills policies
CREATE POLICY "JC can view own bills"
  ON bills FOR SELECT
  USING (
    submitted_by = (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND is_voided = false
  );

CREATE POLICY "SC can view own bills and bills assigned to them"
  ON bills FOR SELECT
  USING (
    (
      submitted_by = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      OR sc_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
    AND is_voided = false
  );

CREATE POLICY "FnS can view all non-voided bills"
  ON bills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

CREATE POLICY "Authenticated users can insert bills"
  ON bills FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "SC can update physical_received, is_reimbursed, rejection_reason"
  ON bills FOR UPDATE
  USING (
    sc_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND is_voided = false
  )
  WITH CHECK (
    sc_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "FnS can update all bill fields"
  ON bills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- Companies policies
CREATE POLICY "Everyone can view active companies"
  ON companies FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'fns'
  ));

CREATE POLICY "FnS can manage companies"
  ON companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- Vendors policies
CREATE POLICY "Everyone can view active vendors"
  ON vendors FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'fns'
  ));

CREATE POLICY "FnS can manage vendors"
  ON vendors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- Categories policies
CREATE POLICY "Everyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'fns'
  ));

CREATE POLICY "FnS can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- Sub-categories policies
CREATE POLICY "Everyone can view active sub-categories"
  ON sub_categories FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'fns'
  ));

CREATE POLICY "FnS can manage sub-categories"
  ON sub_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- Process types policies
CREATE POLICY "Everyone can view active process types"
  ON process_types FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'fns'
  ));

CREATE POLICY "FnS can manage process types"
  ON process_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- Cycles policies
CREATE POLICY "Everyone can view cycles"
  ON cycles FOR SELECT
  USING (true);

CREATE POLICY "FnS can manage cycles"
  ON cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- ============================================
-- STORAGE
-- ============================================

-- Create bucket for bill uploads (run in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('bill-uploads', 'bill-uploads', false);

-- Storage policies
CREATE POLICY "Users can upload bills to their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bill-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own bills"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bill-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "SC can view bills in their assigned folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bill-uploads'
  );

CREATE POLICY "FnS can view all bills"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bill-uploads'
    AND EXISTS (
      SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

-- ============================================
-- SEED DATA (optional - remove in production)
-- ============================================

-- Sample categories and sub-categories
INSERT INTO categories (name) VALUES
  ('Food & Beverages'),
  ('Travel'),
  ('Stationery'),
  ('Printing'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

INSERT INTO sub_categories (category_id, name) 
SELECT c.id, s.name FROM (VALUES
  ('Food & Beverages', 'Swiggy'),
  ('Food & Beverages', 'Zomato'),
  ('Food & Beverages', 'Local Restaurant'),
  ('Food & Beverages', 'Groceries'),
  ('Travel', 'Auto Rickshaw'),
  ('Travel', 'Bus'),
  ('Travel', 'Metro'),
  ('Travel', 'Cab'),
  ('Stationery', 'Notebooks'),
  ('Stationery', 'Pens'),
  ('Stationery', 'Markers'),
  ('Printing', 'Photocopy'),
  ('Printing', 'Printouts'),
  ('Printing', 'Banners'),
  ('Miscellaneous', 'Misc')
) AS s(category_name, name)
JOIN categories c ON c.name = s.category_name
ON CONFLICT (category_id, name) DO NOTHING;

-- Sample process types
INSERT INTO process_types (name) VALUES
  ('Pre Placement Talk'),
  ('Recruitment Process'),
  ('Internship Drive'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

-- Sample vendors
INSERT INTO vendors (name) VALUES
  ('Swiggy'),
  ('Zomato'),
  ('Blinkit'),
  ('Local Print Shop'),
  ('Stationery Shop'),
  ('Metro Station'),
  ('Auto Stand')
ON CONFLICT (name) DO NOTHING;

-- Sample companies
INSERT INTO companies (name) VALUES
  ('Tata Consultancy Services'),
  ('HDFC Bank'),
  ('ICICI Bank'),
  ('KPMG India'),
  ('Deloitte India'),
  ('PwC India')
ON CONFLICT (name) DO NOTHING;

-- Sample cycle
INSERT INTO cycles (name, start_date, end_date, is_active) VALUES
  ('Placement Season 2024-25', '2024-10-01', '2025-05-31', true)
ON CONFLICT DO NOTHING;
