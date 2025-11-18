// app/types/models/student.ts
import type { BaseFilters, SortableFilters } from "../common";
import type { User } from "./user";
import type { AcademicSession } from "./session";
import type { Grade } from "./grade";
import type { SessionGrade } from "./session-grade";
import type { Section } from "./section";
import type { AddressJson } from "./address";

/**
 * Gender
 */
export type Gender = "male" | "female" | "other";

/**
 * Residential type
 */
export type ResidentialType = "residential" | "new_musafir" | "non_residential";

/**
 * Student status
 */
export type StudentStatus =
  | "active"
  | "inactive"
  | "passed"
  | "tc_issued"
  | "dropped";

/**
 * Guardian type
 */
export type GuardianType = "father" | "mother" | "other";

/**
 * Student enrollment
 */
export type StudentEnrollment = {
  id: number;
  student_id: number;
  academic_session_id: number;
  session_grade_id: number;
  section_id?: number | null;
  roll_no?: string | null;
  admission_type?: string | null;
  status?: string | null;
  remarks?: string | null;

  academicSession?: AcademicSession | null;
  sessionGrade?: SessionGrade | null;
  section?: Section | null;
};

/**
 * Student
 */
export type Student = {
  id: number;
  student_code: string;
  user_id?: number | null;

  // Basic info
  name_bn: string;
  name_en?: string | null;
  gender?: Gender | null;
  date_of_birth?: string | null;
  student_phone?: string | null;
  student_email?: string | null;

  // Father
  father_name?: string | null;
  father_phone?: string | null;
  father_occupation?: string | null;

  // Mother
  mother_name?: string | null;
  mother_phone?: string | null;
  mother_occupation?: string | null;

  // Guardian
  guardian_type?: GuardianType | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_relation?: string | null;

  // Address
  present_address?: AddressJson | null;
  permanent_address?: AddressJson | null;

  residential_type?: ResidentialType | null;
  status?: StudentStatus | null;

  photo_path?: string | null;
  photo_url?: string | null;
  meta_json?: Record<string, any> | null;

  created_at?: string;
  updated_at?: string;

  // Relations
  user?: User | null;
  enrollments?: StudentEnrollment[];
};

/**
 * Student filters
 */
export type StudentFilters = SortableFilters & {
  status?: StudentStatus | "";
  gender?: Gender | "";
  residential_type?: ResidentialType | "";
  academic_session_id?: number | null;
  session_grade_id?: number | null;
  section_id?: number | null;
  sort_by?:
    | "id"
    | "student_code"
    | "name_bn"
    | "name_en"
    | "status"
    | "created_at"
    | "updated_at";
  with?: string[];
  paginate?: boolean;
};

/**
 * Student statistics
 */
export type StudentStats = {
  total: number;
  by_status: {
    active: number;
    inactive: number;
    passed: number;
    tc_issued: number;
    dropped: number;
  };
  by_gender: {
    male: number;
    female: number;
    other: number;
  };
  by_residential_type: {
    residential: number;
    new_musafir: number;
    non_residential: number;
  };
};
