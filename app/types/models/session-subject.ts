// app/types/models/session-subject.ts
import type { BaseFilters } from "../common";
import type { AcademicSession } from "./session";

/**
 * Session Subject
 */
export type SessionSubject = {
  id: number;
  session_id: number;
  subject_id: number;
  sort_order: number;
  book_name?: string | null;

  // eager-loaded relations
  subject?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;

  academic_session?: AcademicSession | null;

  created_at?: string;
  updated_at?: string;
};

/**
 * Session Subject filters
 */
export type SessionSubjectFilters = BaseFilters & {
  session_id?: number;
  subject_id?: number;
};
