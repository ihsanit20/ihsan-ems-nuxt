// app/stores/subject-session.ts
import { defineStore } from "pinia";
import type { Subject } from "./subject";

/* ---------- Types ---------- */
export type SubjectSession = {
  id: number;
  session_id: number;
  subject_id: number;
  order_index: number;
  book_name?: string | null;
  created_at?: string;
  updated_at?: string;

  // expanded (controller uses ->with(['subject','academicSession']))
  subject?: Subject;
  academic_session?: { id: number; name: string } | null; // optional shape
};

export type SubjectSessionFilters = {
  session_id?: number; // required to list (our store enforces)
  subject_id?: number;
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

export const useSubjectSessionStore = defineStore("subject-sessions", {
  state: () => ({
    items: [] as SubjectSession[],
    current: null as SubjectSession | null,

    // filters
    session_id: null as number | null,
    subject_id: null as number | null,
    page: 1,
    per_page: 25,
    total: 0,
    last_page: 1,

    loading: false,
    saving: false,
    removing: false,
    error: "" as string,
  }),

  getters: {
    params(state): SubjectSessionFilters {
      return {
        session_id: state.session_id ?? undefined,
        subject_id: state.subject_id ?? undefined,
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
    setSubject(id: number | null) {
      this.subject_id = id;
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
      this.subject_id = null;
      this.page = 1;
      this.per_page = 25;
    },

    /* ---------------------------------------------
     * READ list (by session)
     * GET /v1/subject-sessions?session_id=&subject_id=
     *  (অথবা: GET /v1/sessions/{session}/subjects → alias)
     * -------------------------------------------*/
    async fetchList(extraQuery?: Record<string, any>) {
      if (!this.session_id) throw new Error("session_id is required");
      const { $api } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $api<Paginated<SubjectSession>>(
          "/v1/subject-sessions",
          { query: { ...this.params, ...(extraQuery || {}) } }
        );
        this.items = res.data || [];
        this.page = res.current_page ?? 1;
        this.per_page = res.per_page ?? this.per_page;
        this.total = res.total ?? 0;
        this.last_page = res.last_page ?? 1;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load subject sessions";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------
     * CREATE
     * POST /v1/subject-sessions
     * body: { session_id, subject_id, order_index?, book_name? }
     * -------------------------------------------*/
    async create(payload: {
      session_id?: number; // defaults to state.session_id
      subject_id: number;
      order_index?: number | null;
      book_name?: string | null;
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const body = {
          session_id: payload.session_id ?? this.session_id,
          subject_id: payload.subject_id,
          order_index: payload.order_index ?? 0,
          book_name: payload.book_name ?? null,
        };
        if (!body.session_id) throw new Error("session_id is required");

        const created = await $api<SubjectSession>("/v1/subject-sessions", {
          method: "POST",
          body,
        });
        if (this.page === 1) this.items.unshift(created);
        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to create subject session";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * UPDATE
     * PATCH /v1/subject-sessions/{id}
     * -------------------------------------------*/
    async update(
      id: number,
      payload: Partial<{
        session_id: number;
        subject_id: number;
        order_index: number | null;
        book_name: string | null;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<SubjectSession>(
          `/v1/subject-sessions/${id}`,
          { method: "PATCH", body: payload }
        );
        const idx = this.items.findIndex((x) => x.id === id);
        if (idx !== -1) this.items[idx] = updated;
        if (this.current?.id === id) this.current = updated;
        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to update subject session";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * DELETE
     * DELETE /v1/subject-sessions/{id}
     * -------------------------------------------*/
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message?: string }>(`/v1/subject-sessions/${id}`, {
          method: "DELETE",
        });
        this.items = this.items.filter((x) => x.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to delete subject session";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
