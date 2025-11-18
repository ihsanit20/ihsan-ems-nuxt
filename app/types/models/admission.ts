// app/types/models/admission.ts
import type { BaseFilters } from "../common";
import type { AddressJson } from "./address";
import type { ResidentialType, GuardianType } from "./student";

/**
 * Admission application status
 */
export type AdmissionApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "admitted";

/**
 * Admission application type
 */
export type AdmissionApplicationType = "new" | "re_admission";

/**
 * Meta session (for admission meta)
 */
export type MetaSession = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

/**
 * Meta session grade (for admission meta)
 */
export type MetaSessionGrade = {
  id: number;
  academic_session_id: number;
  grade_id: number;
  capacity: number | null;
  grade?: {
    id: number;
    name: string;
    code?: string | null;
  };
};

/**
 * Admission application
 */
export type AdmissionApplication = {
  id: number;
  application_no: string;

  academic_session_id: number;
  session_grade_id: number;

  application_type: AdmissionApplicationType;
  existing_student_id?: number | null;

  applicant_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  student_phone?: string | null;
  student_email?: string | null;

  father_name?: string | null;
  father_phone?: string | null;
  father_occupation?: string | null;

  mother_name?: string | null;
  mother_phone?: string | null;
  mother_occupation?: string | null;

  guardian_type: GuardianType;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_relation?: string | null;

  present_address?: AddressJson | null;
  permanent_address?: AddressJson | null;
  is_present_same_as_permanent: boolean;

  previous_institution_name?: string | null;
  previous_class?: string | null;
  previous_result?: string | null;
  previous_result_division?: string | null;

  residential_type?: ResidentialType | null;

  applied_via?: "online" | "offline" | null;
  application_date?: string | null;

  status: AdmissionApplicationStatus;
  status_note?: string | null;

  admitted_student_id?: number | null;

  photo_path?: string | null;
  meta_json?: Record<string, any> | null;

  created_at?: string;
  updated_at?: string;

  // Appended attributes from backend
  formatted_present_address?: string | null;
  formatted_permanent_address?: string | null;

  present_division_name?: string | null;
  present_district_name?: string | null;
  present_area_name?: string | null;

  permanent_division_name?: string | null;
  permanent_district_name?: string | null;
  permanent_area_name?: string | null;

  // relations
  session?: {
    id: number;
    name: string;
  };
  session_grade?: {
    id: number;
    academic_session_id: number;
    grade_id: number;
    grade?: {
      id: number;
      name: string;
      code?: string | null;
    };
  };
  admitted_student?: {
    id: number;
    student_code: string;
    name_bn: string;
  };
};

/**
 * Admission filters
 */
export type AdmissionFilters = BaseFilters & {
  academic_session_id?: number;
  session_grade_id?: number;
  status?: AdmissionApplicationStatus | "";
  search?: string;
};

/**
 * Admission meta
 */
export type AdmissionMeta = {
  sessions: MetaSession[];
  session_grades: MetaSessionGrade[];
  guardian_types: GuardianType[];
  residential_types: ResidentialType[];
};

/**
 * Admission statistics
 */
export type AdmissionStats = {
  total: number;
  by_status: { status: AdmissionApplicationStatus; count: number }[];
  by_session: { academic_session_id: number; count: number }[];
};
