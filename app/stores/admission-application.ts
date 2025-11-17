// app/stores/admission-application.ts
import { defineStore } from "pinia";

/* ---------- Types ---------- */

export type AddressJson = {
  division_id: number | undefined;
  district_id: number | undefined;
  area_id?: number | undefined;
  village_house_holding?: string | undefined;
};

export type AdmissionApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "admitted";

export type AdmissionApplicationType = "new" | "re_admission";

export type GuardianType = "father" | "mother" | "other";

export type ResidentialType = "residential" | "new_musafir" | "non_residential";

type MetaSession = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type MetaSessionGrade = {
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

  // relations (from controller ->with(...))
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

export type AdmissionFilters = {
  academic_session_id?: number;
  session_grade_id?: number;
  status?: AdmissionApplicationStatus | "";
  search?: string;
  page?: number;
  per_page?: number;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

export type AdmissionMeta = {
  sessions: MetaSession[];
  session_grades: MetaSessionGrade[];
  guardian_types: GuardianType[];
  residential_types: ResidentialType[];
};

export type AdmissionStats = {
  total: number;
  by_status: { status: AdmissionApplicationStatus; count: number }[];
  by_session: { academic_session_id: number; count: number }[];
};

/* ---------- Store ---------- */

export const useAdmissionApplicationStore = defineStore(
  "admission-applications",
  {
    state: () => ({
      // lists
      items: [] as AdmissionApplication[],
      current: null as AdmissionApplication | null,
      myItems: [] as AdmissionApplication[],

      // meta (sessions, classes, enums)
      meta: null as AdmissionMeta | null,

      // filters
      academic_session_id: null as number | null,
      session_grade_id: null as number | null,
      status: "" as AdmissionApplicationStatus | "",
      search: "" as string,
      page: 1,
      per_page: 15,
      total: 0,
      last_page: 1,

      // stats
      stats: null as AdmissionStats | null,

      // flags
      loading: false,
      saving: false,
      removing: false,
      metaLoading: false,
      statsLoading: false,
      myLoading: false,
      error: "" as string,
    }),

    getters: {
      params(state): AdmissionFilters {
        return {
          academic_session_id: state.academic_session_id ?? undefined,
          session_grade_id: state.session_grade_id ?? undefined,
          status: state.status || undefined,
          search: state.search || undefined,
          page: state.page,
          per_page: state.per_page,
        };
      },
    },

    actions: {
      /* ---------- Filter helpers ---------- */
      setSessionId(id: number | null) {
        this.academic_session_id = id;
        this.page = 1;
      },
      setSessionGradeId(id: number | null) {
        this.session_grade_id = id;
        this.page = 1;
      },
      setStatus(status: AdmissionApplicationStatus | "") {
        this.status = status;
        this.page = 1;
      },
      setSearch(q: string) {
        this.search = q;
        this.page = 1;
      },
      setPage(p: number) {
        this.page = Math.max(1, p || 1);
      },
      setPerPage(n: number) {
        this.per_page = Math.max(1, n || 1);
        this.page = 1;
      },
      resetFilters() {
        this.academic_session_id = null;
        this.session_grade_id = null;
        this.status = "";
        this.search = "";
        this.page = 1;
        this.per_page = 15;
      },

      /* ---------- GET /v1/admission-applications/meta ---------- */
      async fetchMeta() {
        const { $publicApi } = useNuxtApp();
        this.metaLoading = true;
        this.error = "";
        try {
          const res = await $publicApi<AdmissionMeta>(
            "/v1/admission-applications/meta"
          );
          this.meta = res;
          return res;
        } catch (e: any) {
          this.error =
            e?.data?.message ||
            e?.message ||
            "Failed to load admission meta info";
          throw e;
        } finally {
          this.metaLoading = false;
        }
      },

      /* ---------- GET /v1/admission-applications (Admin) ---------- */
      async fetchList() {
        const { $api } = useNuxtApp();
        this.loading = true;
        this.error = "";
        try {
          const res = await $api<Paginated<AdmissionApplication>>(
            "/v1/admission-applications",
            {
              query: this.params,
            }
          );
          this.items = res.data || [];
          this.page = res.current_page ?? 1;
          this.per_page = res.per_page ?? this.per_page;
          this.total = res.total ?? 0;
          this.last_page = res.last_page ?? 1;
          return this.items;
        } catch (e: any) {
          this.error =
            e?.data?.message ||
            e?.message ||
            "Failed to load admission applications";
          throw e;
        } finally {
          this.loading = false;
        }
      },

      /* ---------- GET /v1/admission-applications/{id} ---------- */
      async fetchOne(id: number) {
        const { $api } = useNuxtApp();
        this.loading = true;
        this.error = "";
        try {
          const app = await $api<AdmissionApplication>(
            `/v1/admission-applications/${id}`
          );
          this.current = app;
          return app;
        } catch (e: any) {
          this.error =
            e?.data?.message ||
            e?.message ||
            "Failed to load admission application";
          throw e;
        } finally {
          this.loading = false;
        }
      },

      /* ---------- GET /v1/admission-applications/my (Guardian) ---------- */
      async fetchMyApplications() {
        const { $api } = useNuxtApp();
        this.myLoading = true;
        this.error = "";
        try {
          const items = await $api<AdmissionApplication[]>(
            "/v1/admission-applications/my"
          );
          this.myItems = items || [];
          return this.myItems;
        } catch (e: any) {
          this.error =
            e?.data?.message || e?.message || "Failed to load my applications";
          throw e;
        } finally {
          this.myLoading = false;
        }
      },

      /* ---------- GET /v1/admission-applications/stats (Admin) ---------- */
      async fetchStats(params?: { academic_session_id?: number }) {
        const { $api } = useNuxtApp();
        this.statsLoading = true;
        this.error = "";
        try {
          const res = await $api<AdmissionStats>(
            "/v1/admission-applications/stats",
            {
              query: params,
            }
          );
          this.stats = res;
          return res;
        } catch (e: any) {
          this.error =
            e?.data?.message || e?.message || "Failed to load admission stats";
          throw e;
        } finally {
          this.statsLoading = false;
        }
      },

      /* ---------- POST /v1/admission-applications (Public form) ---------- */
      async createPublic(payload: {
        academic_session_id: number;
        session_grade_id: number;
        applicant_name: string;

        application_type?: AdmissionApplicationType;
        existing_student_id?: number | null;

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

        guardian_type?: GuardianType;
        guardian_name?: string | null;
        guardian_phone?: string | null;
        guardian_relation?: string | null;

        present_address?: AddressJson | null;
        permanent_address?: AddressJson | null;
        is_present_same_as_permanent?: boolean;

        previous_institution_name?: string | null;
        previous_class?: string | null;
        previous_result?: string | null;
        previous_result_division?: string | null;

        residential_type?: ResidentialType | null;

        applied_via?: "online" | "offline";
        application_date?: string | null;

        photo_path?: string | null;
        meta_json?: Record<string, any> | null;
      }) {
        const { $publicApi } = useNuxtApp();
        this.saving = true;
        this.error = "";
        try {
          const res = await $publicApi<{
            message: string;
            data: AdmissionApplication;
          }>("/v1/admission-applications", {
            method: "POST",
            body: payload,
          });

          const created = res.data;
          if (created && this.page === 1) {
            this.items.unshift(created);
          }
          return created;
        } catch (e: any) {
          this.error =
            e?.data?.message ||
            e?.message ||
            "Failed to submit admission application";
          throw e;
        } finally {
          this.saving = false;
        }
      },

      /* ---------- PATCH /v1/admission-applications/{id} (Admin edit) ---------- */
      async update(
        id: number,
        payload: Partial<{
          session_grade_id: number;
          application_type: AdmissionApplicationType;
          existing_student_id: number | null;

          applicant_name: string;
          gender: string | null;
          date_of_birth: string | null;
          student_phone: string | null;
          student_email: string | null;

          father_name: string | null;
          father_phone: string | null;
          father_occupation: string | null;

          mother_name: string | null;
          mother_phone: string | null;
          mother_occupation: string | null;

          guardian_type: GuardianType;
          guardian_name: string | null;
          guardian_phone: string | null;
          guardian_relation: string | null;

          present_address: AddressJson | null;
          permanent_address: AddressJson | null;
          is_present_same_as_permanent: boolean;

          previous_institution_name: string | null;
          previous_class: string | null;
          previous_result: string | null;
          previous_result_division: string | null;

          residential_type: ResidentialType | null;

          photo_path: string | null;
          meta_json: Record<string, any> | null;
        }>
      ) {
        const { $api } = useNuxtApp();
        this.saving = true;
        this.error = "";
        try {
          const res = await $api<{
            message: string;
            data: AdmissionApplication;
          }>(`/v1/admission-applications/${id}`, {
            method: "PATCH",
            body: payload,
          });

          const updated = res.data;
          const idx = this.items.findIndex((a) => a.id === id);
          if (idx !== -1 && updated) this.items[idx] = updated;
          if (this.current?.id === id && updated) this.current = updated;
          return updated;
        } catch (e: any) {
          this.error =
            e?.data?.message ||
            e?.message ||
            "Failed to update admission application";
          throw e;
        } finally {
          this.saving = false;
        }
      },

      /* ---------- DELETE /v1/admission-applications/{id} ---------- */
      async remove(id: number) {
        const { $api } = useNuxtApp();
        this.removing = true;
        this.error = "";
        try {
          await $api<{ message: string }>(`/v1/admission-applications/${id}`, {
            method: "DELETE",
          });
          this.items = this.items.filter((a) => a.id !== id);
          if (this.current?.id === id) this.current = null;
        } catch (e: any) {
          this.error =
            e?.data?.message ||
            e?.message ||
            "Failed to delete admission application";
          throw e;
        } finally {
          this.removing = false;
        }
      },

      /* ---------- POST /v1/admission-applications/{id}/status ---------- */
      async updateStatus(
        id: number,
        status: AdmissionApplicationStatus,
        status_note?: string
      ) {
        const { $api } = useNuxtApp();
        this.saving = true;
        this.error = "";
        try {
          const res = await $api<{
            message: string;
            data: AdmissionApplication;
          }>(`/v1/admission-applications/${id}/status`, {
            method: "POST",
            body: { status, status_note },
          });

          const updated = res.data;
          const idx = this.items.findIndex((a) => a.id === id);
          if (idx !== -1 && updated) this.items[idx] = updated;
          if (this.current?.id === id && updated) this.current = updated;
          return updated;
        } catch (e: any) {
          this.error =
            e?.data?.message ||
            e?.message ||
            "Failed to update admission status";
          throw e;
        } finally {
          this.saving = false;
        }
      },

      /* ---------- POST /v1/admission-applications/{id}/admit ---------- */
      async admit(
        id: number,
        payload: {
          section_id?: number | null;
          roll_no?: string | null;
          admission_date?: string | null;
        }
      ) {
        const { $api } = useNuxtApp();
        this.saving = true;
        this.error = "";
        try {
          const res = await $api<{
            message: string;
            student: any;
            enrollment: any;
            application: AdmissionApplication;
          }>(`/v1/admission-applications/${id}/admit`, {
            method: "POST",
            body: payload,
          });

          const updated = res.application;
          const idx = this.items.findIndex((a) => a.id === id);
          if (idx !== -1 && updated) this.items[idx] = updated;
          if (this.current?.id === id && updated) this.current = updated;

          return res; // চাইলে component থেকে student/enrollment ব্যবহার করতে পারবে
        } catch (e: any) {
          this.error =
            e?.data?.message ||
            e?.message ||
            "Failed to admit student from application";
          throw e;
        } finally {
          this.saving = false;
        }
      },
    },
  }
);
