export type Role = 'jc' | 'sc' | 'fns';

export interface User {
  id: string;
  auth_user_id?: string | null;
  email: string;
  name: string;
  roll_no: string | null;
  role: Role;
  is_active?: boolean;
  upi_id: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface ScCabinet {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface SubCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface CategorySubCategory {
  category_id: string;
  subcategory_id: string;
}

export interface ProcessType {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface ReimbursementCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_closed: boolean;
  created_at: string;
}

export type BillStatus = 'pending' | 'physical_received' | 'reimbursed' | 'rejected';

export interface Bill {
  id: string;
  user_id: string;
  sc_id: string | null;
  vendor_id: string;
  company_id: string | null;
  category_id: string;
  subcategory_id: string;
  bill_number: string;
  date: string;
  amount: number;
  process_type: string | null;
  file_url: string | null;
  status: BillStatus;
  created_at: string;
}

export interface BillWithRelations extends Bill {
  users?: { name: string; email: string; role: Role };
  sc_user?: { name: string; email: string; role: Role };
  vendors?: { name: string };
  companies?: { name: string };
  categories?: { name: string };
  subcategories?: { name: string };
  reimbursement_cycles?: { name: string };
}

export interface BillFormData {
  date: string;
  vendor_id: string;
  bill_number: string;
  company_id: string;
  sc_id: string;
  category_id: string;
  subcategory_id: string;
  process_type: string;
  amount: number;
  file: File | null;
}

export interface BillFilters {
  submitted_by_filter?: 'jcs' | 'myself' | 'all';
  bill_type?: 'company' | 'general' | 'all';
  status?: BillStatus | 'all';
  company_id?: string;
  category_id?: string;
  sc_id?: string;
  cycle_id?: string;
  date_from?: string;
  date_to?: string;
  show_historical?: boolean;
}
