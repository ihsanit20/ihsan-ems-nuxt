// app/types/models/fee.ts
import type { BaseFilters } from "../common";

/**
 * Billing type
 */
export type BillingType = "one_time" | "recurring";

/**
 * Recurring cycle
 */
export type RecurringCycle = "monthly" | "yearly" | "term";

/**
 * Fee
 */
export type Fee = {
  id: number;
  name: string;
  billing_type: BillingType;
  recurring_cycle: RecurringCycle | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

/**
 * Fee filters
 */
export type FeeFilters = BaseFilters & {
  billing_type?: BillingType;
  recurring_cycle?: RecurringCycle;
  is_active?: boolean;
};
