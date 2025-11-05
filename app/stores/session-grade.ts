// stores/session-grade.ts
import { defineStore } from "pinia";

/* ---------- Types ---------- */
export type SessionGrade = {
  id: number;
  academic_session_id: number;
  grade_id: number;
  capacity: number;
  class_teacher_id?: number | null;
  meta_json?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;

  // optional embeds if ?with=... ব্যবহার করা হয়
  academicSession?: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
  };
  grade?: {
    id: number;
    level_id: number;
    name: string;
    code?: string | null;
  };
  classTeacher?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  sections?: Array<{
    id: number;
    session_grade_id: number;
    name: string;
    code?: string | null;
    capacity?: number | null;
    class_teacher_id?: number | null;
    sort_order?: number | null;
  }>;
};

export type SessionGradeFilters = {
  academic_session_id?: number;
  grade_id?: number;
  class_teacher_id?: number;
  page?: number;
  per_page?: number;
  with?: string; // e.g. "grade,academicSession,sections,classTeacher"
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

/* ---------- Store ---------- */
export const useSessionGradeStore = defineStore("session-grades", {
  state: () => ({
    items: [] as SessionGrade[],
    current: null as SessionGrade | null,

    // filters
    academic_session_id: undefined as number | undefined,
    grade_id: undefined as number | undefined,
    class_teacher_id: undefined as number | undefined,
    page: 1,
    per_page: 15,

    // embed control (comma separated as backend expects)
    withEmbeds: "grade,academicSession,sections,classTeacher" as string,

    total: 0,
    last_page: 1,

    loading: false,
    saving: false,
    removing: false,
    error: "" as string,
  }),

  getters: {
    params(state): SessionGradeFilters {
      return {
        academic_session_id: state.academic_session_id ?? undefined,
        grade_id: state.grade_id ?? undefined,
        class_teacher_id: state.class_teacher_id ?? undefined,
        page: state.page,
        per_page: state.per_page,
        with: state.withEmbeds || undefined,
      };
    },
  },

  actions: {
    /* ----- Filter setters ----- */
    setSession(sessionId?: number) {
      this.academic_session_id = sessionId || undefined;
      this.page = 1;
    },
    setGrade(gradeId?: number) {
      this.grade_id = gradeId || undefined;
      this.page = 1;
    },
    setClassTeacher(userId?: number) {
      this.class_teacher_id = userId || undefined;
      this.page = 1;
    },
    setPage(p: number) {
      this.page = Math.max(1, p || 1);
    },
    setPerPage(n: number) {
      this.per_page = Math.max(1, n || 1);
      this.page = 1;
    },
    setWithEmbeds(csv?: string) {
      this.withEmbeds = (csv || "").trim();
    },
    resetFilters() {
      this.academic_session_id = undefined;
      this.grade_id = undefined;
      this.class_teacher_id = undefined;
      this.page = 1;
      this.per_page = 15;
    },

    /* ----- API: GET /v1/session-grades (paginated) ----- */
    async fetchList(extraQuery?: Record<string, any>) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $publicApi<Paginated<SessionGrade>>(
          "/v1/session-grades",
          {
            query: { ...this.params, ...(extraQuery || {}) },
          }
        );
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load session grades";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ----- API: GET /v1/sessions/{session}/grades (read-only nested) ----- */
    async fetchBySession(sessionId: number, extraQuery?: Record<string, any>) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $publicApi<Paginated<SessionGrade>>(
          `/v1/sessions/${sessionId}/grades`,
          { query: { ...this.params, ...(extraQuery || {}) } }
        );
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load session grades";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ----- API: GET /v1/session-grades/{id} ----- */
    async fetchOne(
      id: number,
      opts?: {
        with?: string | string[]; // override embeds
      }
    ) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const withParam =
          typeof opts?.with === "string"
            ? opts?.with
            : Array.isArray(opts?.with)
            ? opts?.with.join(",")
            : this.withEmbeds || undefined;

        const sg = await $publicApi<SessionGrade>(`/v1/session-grades/${id}`, {
          query: withParam ? { with: withParam } : undefined,
        });
        this.current = sg;
        return sg;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load session grade";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ----- API: POST /v1/session-grades ----- */
    async create(payload: {
      academic_session_id: number;
      grade_id: number;
      capacity: number;
      class_teacher_id?: number | null;
      meta_json?: Record<string, any> | null;
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const created = await $api<SessionGrade>("/v1/session-grades", {
          method: "POST",
          body: payload,
        });
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to create session grade";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ----- API: PATCH /v1/session-grades/{id} ----- */
    async update(
      id: number,
      payload: Partial<{
        academic_session_id: number;
        grade_id: number;
        capacity: number;
        class_teacher_id: number | null;
        meta_json: Record<string, any> | null;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<SessionGrade>(`/v1/session-grades/${id}`, {
          method: "PATCH",
          body: payload,
        });
        const idx = this.items.findIndex((x) => x.id === id);
        if (idx !== -1) this.items[idx] = updated;
        if (this.current?.id === id) this.current = updated;
        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to update session grade";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ----- API: DELETE /v1/session-grades/{id} ----- */
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message: string }>(`/v1/session-grades/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((x) => x.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to delete session grade";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
