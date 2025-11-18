// app/types/models/session.ts
import type { BaseFilters } from "../common";

/**
 * Academic Session
 */
export type AcademicSession = {
  id: number;
  name: string;
  start_date: string; // YYYY-MM-DD or ISO
  end_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

/**
 * Academic Session filters
 */
export type SessionFilters = BaseFilters & {
  active?: boolean | null;
};
