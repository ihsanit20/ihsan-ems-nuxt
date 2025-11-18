// app/types/models/session-grade.ts
import type { BaseFilters } from "../common";
import type { Grade } from "./grade";

/**
 * Session Grade (class opened for a session)
 */
export type SessionGrade = {
  id: number;
  academic_session_id: number;
  grade_id: number;

  // eager (optional)
  grade?: Grade | null;

  created_at?: string;
  updated_at?: string;
};

/**
 * Session Grade filters
 */
export type SessionGradeFilters = BaseFilters & {
  session_id?: number;
  grade_id?: number;
};
