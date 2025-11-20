export interface Payment {
  id: number;
  student_id: number;
  fee_invoice_id?: number | null;
  payment_date: string;
  method: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  reference_no?: string | null;
  created_at?: string;
  updated_at?: string;
  
  // Relations
  student?: any;
  fee_invoice?: any;
}

export interface CreatePaymentInput {
  student_id: number;
  fee_invoice_id?: number | null;
  payment_date: string;
  method: string;
  amount: number;
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  reference_no?: string | null;
}

export interface UpdatePaymentInput {
  payment_date?: string;
  method?: string;
  amount?: number;
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  reference_no?: string | null;
}
