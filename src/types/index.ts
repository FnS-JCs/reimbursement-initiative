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
  is_closed: boolean;
  created_at: string;
}

export type BillStatus = 'pending' | 'physical_received' | 'reimbursed' | 'rejected';

export interface Bill {
  id: string;
  user_id: string;
  sc_id: string | null;
  submitted_by_role?: Role | null;
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
  rejected_by_role?: 'sc' | 'fns' | null;
  created_at: string;
}

export interface BillComment {
  id: string;
  bill_id: string;
  author_role: 'sc' | 'fns';
  body: string;
  created_at: string;
  updated_at: string;
}

export interface BillWithRelations extends Bill {
  users?: { name: string; email: string; role: Role };
  sc_user?: { name: string; email: string; role: Role };
  vendors?: { name: string };
  companies?: { name: string };
  categories?: { name: string };
  subcategories?: { name: string };
  reimbursement_cycles?: { name: string };
  fns_comment?: BillComment | null;
  sc_rejection_comment?: BillComment | null;
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
  statuses?: BillStatus[];
  company_id?: string;
  company_ids?: string[];
  vendor_ids?: string[];
  category_id?: string;
  category_ids?: string[];
  subcategory_ids?: string[];
  sc_id?: string;
  sc_ids?: string[];
  cycle_id?: string;
  cycle_ids?: string[];
  date_from?: string;
  date_to?: string;
}
