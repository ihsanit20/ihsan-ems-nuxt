// app/types/models/session-fee.ts
import type { BaseFilters } from "../common";
import type { BillingType, RecurringCycle } from "./fee";

/**
 * Session Fee
 */
export type SessionFee = {
  id: number;
  academic_session_id: number;
  grade_id: number;
  fee_id: number;
  amount: number | string;
  created_at?: string;
  updated_at?: string;

  // Eager loaded relations (optional)
  session?: { id: number; name: string };
  grade?: { id: number; name: string };
  fee?: {
    id: number;
    name: string;
    billing_type: BillingType;
    recurring_cycle: RecurringCycle | null;
  };
};

/**
 * Session Fee filters
 */
export type SessionFeeFilters = BaseFilters & {
  academic_session_id?: number;
  grade_id?: number;
  fee_id?: number;
  only_active?: boolean;
};
