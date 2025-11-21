import type { SessionFee } from "./session-fee";

export interface StudentFee {
  id: number;
  student_id: number;
  academic_session_id: number;
  session_fee_id: number;
  amount?: number | null;
  discount_type?: "flat" | "percent" | null;
  discount_value?: number | null;
  // Due-fee metadata (optional)
  fee_name?: string | null;
  period_key?: string | null;
  last_invoiced_invoice_no?: string | null;
  created_at?: string;
  updated_at?: string;

  student?: any;
  academic_session?: any;
  sessionFee?: SessionFee & {
    grade?: { id: number; name: string } | null;
  };
}

export interface CreateStudentFeeInput {
  student_id: number;
  academic_session_id: number;
  session_fee_id: number;
  amount?: number | null;
  discount_type?: "flat" | "percent" | null;
  discount_value?: number | null;
}

export interface UpdateStudentFeeInput {
  session_fee_id?: number;
  amount?: number | null;
  discount_type?: "flat" | "percent" | null;
  discount_value?: number | null;
}

export interface BulkAssignStudentFeesInput {
  student_ids: number[];
  academic_session_id: number;
  session_fee_id: number;
  amount?: number | null;
  discount_type?: "flat" | "percent" | null;
  discount_value?: number | null;
}

export interface BulkUpdateStudentFeesInput {
  student_fee_ids: number[];
  amount?: number | null;
  discount_type?: "flat" | "percent" | null;
  discount_value?: number | null;
}
