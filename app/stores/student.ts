// app/stores/student.ts
import { defineStore } from "pinia";
import type {
  Gender,
  ResidentialType,
  StudentStatus,
  Student,
  StudentEnrollment,
  StudentFilters,
  StudentStats,
  User,
  Paginated,
} from "~/types";

/* ---------------------- Helpers ---------------------- */

function toFormData(payload: Record<string, any>): FormData {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v === null) {
      fd.append(k, "");
    } else if (v instanceof File || v instanceof Blob) {
      fd.append(k, v);
    } else if (typeof v === "object") {
      // For nested objects/arrays, stringify
      fd.append(k, JSON.stringify(v));
    } else {
      fd.append(k, String(v));
    }
  });
  return fd;
}

/* ---------------------- Store ---------------------- */

export const useStudentStore = defineStore("students", {
  state: () => ({
    items: [] as Student[],
    current: null as Student | null,

    // enrollment history for current student
    currentEnrollments: [] as StudentEnrollment[],

    // stats
    stats: null as StudentStats | null,

    // pagination
    page: 1,
    per_page: 25,
    total: 0,
    last_page: 1,

    // filters/sort
    q: "" as string,
    status: "" as StudentStatus | "",
    gender: "" as Gender | "",
    residential_type: "" as ResidentialType | "",
    academic_session_id: null as number | null,
    session_grade_id: null as number | null,
    section_id: null as number | null,
    with: [] as string[],

    sort_by: "id" as StudentFilters["sort_by"],
    sort_dir: "desc" as StudentFilters["sort_dir"],

    // flags
    loading: false,
    saving: false,
    removing: false,
    loadingStats: false,
    loadingEnrollments: false,
    exporting: false,
    error: "" as string,
  }),

  getters: {
    params(state): StudentFilters {
      return {
        q: state.q || undefined,
        status: state.status || undefined,
        gender: state.gender || undefined,
        residential_type: state.residential_type || undefined,
        academic_session_id: state.academic_session_id || undefined,
        session_grade_id: state.session_grade_id || undefined,
        section_id: state.section_id || undefined,
        page: state.page,
        per_page: state.per_page,
        sort_by: state.sort_by,
        sort_dir: state.sort_dir,
        with: state.with && state.with.length ? state.with : undefined,
        paginate: true,
      };
    },
  },

  actions: {
    /* ---------------- Filter setters ---------------- */

    setQuery(q: string) {
      this.q = q;
      this.page = 1;
    },
    setStatus(status: StudentStatus | "" | null) {
      this.status = (status || "") as any;
      this.page = 1;
    },
    setGender(gender: Gender | "" | null) {
      this.gender = (gender || "") as any;
      this.page = 1;
    },
    setResidentialType(type: ResidentialType | "" | null) {
      this.residential_type = (type || "") as any;
      this.page = 1;
    },
    setAcademicSessionId(id: number | null) {
      this.academic_session_id = id;
      this.page = 1;
    },
    setSessionGradeId(id: number | null) {
      this.session_grade_id = id;
      this.page = 1;
    },
    setSectionId(id: number | null) {
      this.section_id = id;
      this.page = 1;
    },
    setWith(withRelations: string[] | null) {
      this.with = withRelations || [];
      this.page = 1;
    },
    setPage(p: number) {
      this.page = Math.max(1, p || 1);
    },
    setPerPage(n: number) {
      this.per_page = Math.max(1, n || 1);
      this.page = 1;
    },
    setSort(
      by: StudentFilters["sort_by"] = "id",
      dir: StudentFilters["sort_dir"] = "desc"
    ) {
      this.sort_by = by || "id";
      this.sort_dir = dir === "asc" ? "asc" : "desc";
      this.page = 1;
    },
    resetFilters() {
      this.q = "";
      this.status = "";
      this.gender = "";
      this.residential_type = "";
      this.academic_session_id = null;
      this.session_grade_id = null;
      this.section_id = null;
      this.with = [];
      this.page = 1;
      this.per_page = 25;
      this.sort_by = "id";
      this.sort_dir = "desc";
    },

    /* ---------------- API calls: list / single ---------------- */

    async fetchList() {
      const { $api } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $api<Paginated<Student>>("/v1/students", {
          query: this.params,
        });

        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;

        return res;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to load students";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async fetchOne(id: number, withEnrollments: boolean = true) {
      const { $api } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const student = await $api<Student>(`/v1/students/${id}`, {
          query: {
            with_enrollments: withEnrollments ? 1 : 0,
          },
        });
        this.current = student;
        // If API returns enrollments inside student, also sync local enrollments
        if (student.enrollments) {
          this.currentEnrollments = student.enrollments;
        }
        return student;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to load student";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------- Create / Update / Delete ---------------- */

    async create(payload: Record<string, any>) {
      // payload matches StudentController@store fields
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        // JSON body is fine here (no file)
        const res = await $api<{ message: string; data: Student }>(
          "/v1/students",
          {
            method: "POST",
            body: payload,
          }
        );

        const created = res.data;
        if (this.page === 1) this.items.unshift(created);

        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to create student";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async update(id: number, payload: Record<string, any>) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<{ message: string; data: Student }>(
          `/v1/students/${id}`,
          {
            method: "PATCH",
            body: payload,
          }
        );

        const student = updated.data;

        const idx = this.items.findIndex((s) => s.id === id);
        if (idx !== -1) this.items[idx] = student;
        if (this.current?.id === id) this.current = student;

        return student;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to update student";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async remove(id: number, force: boolean = false) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message: string }>(`/v1/students/${id}`, {
          method: "DELETE",
          query: force ? { force: 1 } : undefined,
        });

        this.items = this.items.filter((s) => s.id !== id);
        if (this.current?.id === id) {
          this.current = null;
          this.currentEnrollments = [];
        }
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to delete student";
        throw e;
      } finally {
        this.removing = false;
      }
    },

    /* ---------------- Enrollments & account ---------------- */

    async fetchEnrollments(studentId: number) {
      const { $api } = useNuxtApp();
      this.loadingEnrollments = true;
      this.error = "";
      try {
        const list = await $api<StudentEnrollment[]>(
          `/v1/students/${studentId}/enrollments`
        );
        this.currentEnrollments = list;
        if (this.current?.id === studentId) {
          this.current = { ...this.current, enrollments: list };
        }
        return list;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to load enrollments";
        throw e;
      } finally {
        this.loadingEnrollments = false;
      }
    },

    async createUserAccount(
      studentId: number,
      payload: { phone: string; email?: string | null; password: string }
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const res = await $api<{ message: string; data: User }>(
          `/v1/students/${studentId}/create-account`,
          {
            method: "POST",
            body: payload,
          }
        );

        if (this.current?.id === studentId) {
          this.current = {
            ...this.current,
            user: res.data,
            user_id: res.data.id,
          };
        }

        return res.data;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to create user account";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async uploadPhoto(studentId: number, file: File) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const fd = new FormData();
        fd.append("photo", file);

        const res = await $api<{
          message: string;
          photo_path: string;
          photo_url?: string;
        }>(`/v1/students/${studentId}/upload-photo`, {
          method: "POST",
          body: fd,
        });

        if (this.current?.id === studentId) {
          this.current = {
            ...this.current,
            photo_path: res.photo_path,
            photo_url: res.photo_url ?? this.current.photo_url,
          };
        }

        // sync in list
        const idx = this.items.findIndex((s) => s.id === studentId);
        if (idx !== -1 && this.items[idx]) {
          this.items[idx] = {
            ...this.items[idx],
            photo_path: res.photo_path,
            photo_url: res.photo_url ?? this.items[idx].photo_url,
          } as Student;
        }

        return res;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to upload photo";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------- Transfer / Promotion / TC ---------------- */

    async transferStudent(
      studentId: number,
      payload: {
        academic_session_id: number;
        session_grade_id: number;
        section_id?: number | null;
        roll_no?: string | null;
        remarks?: string | null;
      }
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const res = await $api<{
          message: string;
          data: StudentEnrollment;
        }>(`/v1/students/${studentId}/transfer`, {
          method: "POST",
          body: payload,
        });

        // Push/replace in currentEnrollments list
        const enrollment = res.data;
        const idx = this.currentEnrollments.findIndex(
          (e) => e.academic_session_id === enrollment.academic_session_id
        );
        if (idx !== -1) this.currentEnrollments[idx] = enrollment;
        else this.currentEnrollments.push(enrollment);

        if (this.current?.id === studentId) {
          this.current = {
            ...this.current,
            enrollments: this.currentEnrollments,
          };
        }

        return enrollment;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to transfer student";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async bulkPromote(payload: {
      student_ids: number[];
      from_session_id: number;
      to_session_id: number;
      to_session_grade_id: number;
      to_section_id?: number | null;
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const res = await $api<{
          message: string;
          count: number;
        }>("/v1/students/bulk-promote", {
          method: "POST",
          body: payload,
        });
        return res;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to promote students";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async issueTC(studentId: number, remarks?: string | null) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const res = await $api<{
          message: string;
          data: Student;
        }>(`/v1/students/${studentId}/issue-tc`, {
          method: "POST",
          body: { remarks },
        });

        const student = res.data;

        // sync list
        const idx = this.items.findIndex((s) => s.id === studentId);
        if (idx !== -1) this.items[idx] = student;

        if (this.current?.id === studentId) {
          this.current = student;
        }

        return student;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to issue TC";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async bulkUpdateStatus(payload: {
      student_ids: number[];
      status: StudentStatus;
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const res = await $api<{
          message: string;
          count: number;
        }>("/v1/students/bulk-status", {
          method: "POST",
          body: payload,
        });

        // Optimistic local update
        this.items = this.items.map((s) =>
          payload.student_ids.includes(s.id)
            ? { ...s, status: payload.status }
            : s
        );
        if (this.current && payload.student_ids.includes(this.current.id)) {
          this.current = { ...this.current, status: payload.status };
        }

        return res;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to update student status";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------- Stats & Export ---------------- */

    async fetchStats(academic_session_id?: number | null) {
      const { $api } = useNuxtApp();
      this.loadingStats = true;
      this.error = "";
      try {
        const stats = await $api<StudentStats>("/v1/students/stats", {
          query: {
            academic_session_id:
              academic_session_id ?? this.academic_session_id ?? undefined,
          },
        });
        this.stats = stats;
        return stats;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to load student stats";
        throw e;
      } finally {
        this.loadingStats = false;
      }
    },

    async exportStudents() {
      // returns export data for frontend to generate CSV/XLSX
      const { $api } = useNuxtApp();
      this.exporting = true;
      this.error = "";
      try {
        const query: any = {
          status: this.status || undefined,
          academic_session_id: this.academic_session_id || undefined,
          // you can add more filters if needed
        };

        const res = await $api<{
          data: any[];
          count: number;
        }>("/v1/students/export", {
          query,
        });

        return res;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to export students";
        throw e;
      } finally {
        this.exporting = false;
      }
    },
  },
});
