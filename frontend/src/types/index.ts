export type Role = 'staff' | 'manager';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  fullName: string;
  isActive: boolean;
}

/** Payment mode is stored as a plain string (e.g. 'TNG', 'DuitNow', 'Cash'). */
export type PaymentMode = string;

export type TransactionSource = 'tng_import' | 'staff_manual' | 'manager_manual';
export type TransactionStatus = 'draft' | 'completed' | 'archived';
export type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'select';

export interface CategoryField {
  id: string;
  categoryId: string;
  fieldName: string;
  fieldKey: string;
  fieldType: FieldType;
  isRequired: boolean;
  displayOrder: number;
  placeholder?: string | null;
  options?: string[] | null;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  isActive: boolean;
  displayOrder: number;
  fields: CategoryField[];
  children: Category[];
}

export interface TransactionExtra {
  id?: string;
  fieldKey: string;
  fieldValue: string;
  fieldType: FieldType;
}

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  description: string;
  paymentMode: PaymentMode;
  amount: number | string;
  categoryId?: string | null;
  category?: Category | null;
  receiptPath?: string | null;
  source: TransactionSource;
  status: TransactionStatus;
  remarks?: string | null;
  importBatchId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; username: string };
  extras: TransactionExtra[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  filePath: string;
  totalRecords: number;
  importedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorLog?: string | null;
  createdAt: string;
  user?: { fullName: string; username: string };
  transactions?: Transaction[];
}

export interface DashboardSummary {
  totalSpend: number;
  totalTransactions: number;
  monthSpend: number;
  weekSpend: number;
  categoriesUsed: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  total: number;
}

export interface TrendPoint {
  label: string;
  total: number;
}
