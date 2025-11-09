import { defineStore } from "pinia";

/* ---------- Types ---------- */
export type SessionGrade = {
  id: number;
  academic_session_id: number;
  grade_id: number;

  // eager (optional)
  grade?: { id: number; name: string; code?: string | null };

  created_at?: string;
  updated_at?: string;
};

export type SessionGradeFilters = {
  // when listing by session
  session_id?: number; // required for /sessions/{session}/classes
  grade_id?: number;
  page?: number;
  per_page?: number;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

export const useSessionGradeStore = defineStore("session-grades", {
  state: () => ({
    items: [] as SessionGrade[],
    current: null as SessionGrade | null,

    // filters
    session_id: null as number | null, // picker on UI
    grade_id: undefined as number | undefined,
    page: 1,
    per_page: 15,
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
        session_id: state.session_id ?? undefined,
        grade_id: state.grade_id,
        page: state.page,
        per_page: state.per_page,
      };
    },
  },

  actions: {
    setSession(id: number | null) {
      this.session_id = id;
      this.page = 1;
    },
    setGrade(id?: number) {
      this.grade_id = id;
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
      this.grade_id = undefined;
      this.page = 1;
      this.per_page = 15;
    },

    /* ---------------------------------------------
     * READ: list by session
     * GET /v1/sessions/{session}/classes
     * -------------------------------------------*/
    async fetchList(extraQuery?: Record<string, any>) {
      if (!this.session_id) throw new Error("session_id is required");
      const { $publicApi } = useNuxtApp();

      this.loading = true;
      this.error = "";
      try {
        const res = await $publicApi<Paginated<SessionGrade>>(
          `/v1/sessions/${this.session_id}/classes`,
          { query: { ...this.params, ...(extraQuery || {}) } }
        );

        // NOTE: আপনার $publicApi যদি { data: paginator } রিটার্ন করে,
        // তাহলে কম্পোনেন্টে normalize আছে — তবু এখানে common কেস রাখলাম।
        this.items = (res as any)?.data || [];
        this.page = (res as any)?.current_page ?? 1;
        this.per_page = (res as any)?.per_page ?? this.per_page;
        this.total = (res as any)?.total ?? 0;
        this.last_page = (res as any)?.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load session classes";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------
     * READ: single
     * GET /v1/session-grades/{id}
     * -------------------------------------------*/
    async fetchOne(id: number) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const data = await $publicApi<SessionGrade>(`/v1/session-grades/${id}`);
        this.current = data as any;
        return data;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load session-grade item";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------
     * CREATE single
     * POST /v1/sessions/{session}/classes
     * -------------------------------------------*/
    async create(sessionId: number, payload: { grade_id: number }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const created = await $api<SessionGrade>(
          `/v1/sessions/${sessionId}/classes`,
          { method: "POST", body: payload }
        );
        // optimistic add when listing same session
        if (this.session_id === sessionId && this.page === 1)
          this.items.unshift(created as any);
        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to open class (session)";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * BULK open
     * POST /v1/sessions/{session}/classes/bulk-open
     * -------------------------------------------*/
    async bulkOpen(sessionId: number, payload: { grade_ids: number[] }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const res = await $api<{
          created_count: number;
          items: SessionGrade[];
        }>(`/v1/sessions/${sessionId}/classes/bulk-open`, {
          method: "POST",
          body: payload,
        });
        // optimistic merge
        if (this.session_id === sessionId && this.page === 1) {
          this.items = [...((res as any).items || []), ...this.items];
        }
        return res;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to bulk-open classes";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * UPDATE (grade_id only)
     * PATCH /v1/session-classes/{id}
     * -------------------------------------------*/
    async update(id: number, payload: { grade_id: number }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<SessionGrade>(`/v1/session-classes/${id}`, {
          method: "PATCH",
          body: payload,
        });
        const idx = this.items.findIndex((x) => x.id === id);
        if (idx !== -1) this.items[idx] = updated as any;
        if (this.current?.id === id) this.current = updated as any;
        return updated;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to update class";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * DELETE
     * DELETE /v1/session-grades/{id}
     * -------------------------------------------*/
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
        this.error = e?.data?.message || e?.message || "Failed to delete class";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
