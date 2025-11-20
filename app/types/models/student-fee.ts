export interface StudentFee {
  id: number;
  student_id: number;
  academic_session_id: number;
  fee_id: number;
  amount: number;
  discount_type?: 'flat' | 'percent' | null;
  discount_value?: number | null;
  created_at?: string;
  updated_at?: string;
  
  // Relations
  student?: any;
  academic_session?: any;
  fee?: any;
}

export interface CreateStudentFeeInput {
  student_id: number;
  academic_session_id: number;
  fee_id: number;
  amount: number;
  discount_type?: 'flat' | 'percent' | null;
  discount_value?: number | null;
}

export interface UpdateStudentFeeInput {
  amount?: number;
  discount_type?: 'flat' | 'percent' | null;
  discount_value?: number | null;
}

export interface BulkAssignStudentFeesInput {
  student_ids: number[];
  academic_session_id: number;
  fee_id: number;
  amount: number;
  discount_type?: 'flat' | 'percent' | null;
  discount_value?: number | null;
}

export interface BulkUpdateStudentFeesInput {
  student_fee_ids: number[];
  amount?: number;
  discount_type?: 'flat' | 'percent' | null;
  discount_value?: number | null;
}
