import type { SessionFee } from "./session-fee";
import type { StudentFee } from "./student-fee";

export interface FeeInvoice {
  id: number;
  student_id: number;
  academic_session_id: number;
  invoice_no: string;
  invoice_month?: string | null;
  invoice_date: string;
  due_date?: string | null;
  total_amount: number;
  total_discount: number;
  payable_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'cancelled';
  created_at?: string;
  updated_at?: string;
  
  // Relations
  student?: any;
  academic_session?: any;
  items?: FeeInvoiceItem[];
  payments?: any[];
}

export interface FeeInvoiceItem {
  id: number;
  fee_invoice_id: number;
  student_fee_id: number;
  description?: string | null;
  amount?: number;
  discount_amount?: number;
  net_amount?: number;
  created_at?: string;
  updated_at?: string;
  
  sessionFee?: SessionFee;
  studentFee?: StudentFee;
}

export interface CreateFeeInvoiceInput {
  student_id: number;
  academic_session_id: number;
  invoice_month?: string | null;
  invoice_date: string;
  due_date?: string | null;
  items: CreateFeeInvoiceItemInput[];
}

export interface CreateFeeInvoiceItemInput {
  student_fee_id: number;
  description?: string | null;
  amount?: number;
  discount_amount?: number;
}

export interface UpdateFeeInvoiceInput {
  invoice_month?: string | null;
  invoice_date?: string;
  due_date?: string | null;
  status?: 'pending' | 'partial' | 'paid' | 'cancelled';
  items?: UpdateFeeInvoiceItemInput[];
}

export interface UpdateFeeInvoiceItemInput {
  id?: number;
  student_fee_id: number;
  description?: string | null;
  amount?: number;
  discount_amount?: number;
}

export interface MonthlyInvoiceGenerationResult {
  month: string;
  created: number;
  skipped: number;
  failed: number;
}
