import { defineStore } from "pinia";
import type { SessionSubject, SessionSubjectFilters, Paginated } from "~/types";

type SessionSubjectCreatePayload = {
  subject_id: number;
  sort_order?: number;
  book_name?: string | null;
};

type SessionSubjectUpdatePayload = {
  session_id?: number;
  subject_id?: number;
  sort_order?: number;
  book_name?: string | null;
};

export const useSessionSubjectStore = defineStore("session-subjects", {
  state: () => ({
    items: [] as SessionSubject[],
    current: null as SessionSubject | null,

    // filters
    session_id: null as number | null, // active session in UI
    subject_id: undefined as number | undefined,
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
    params(state): SessionSubjectFilters {
      return {
        session_id: state.session_id ?? undefined,
        subject_id: state.subject_id,
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

    setSubject(id?: number) {
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
      this.subject_id = undefined;
      this.page = 1;
      this.per_page = 25;
    },

    /* ---------------------------------------------
     * READ: list by session
     * GET /v1/sessions/{session}/subjects
     * (internally hits SessionSubjectController@index)
     * -------------------------------------------*/
    async fetchList(extraQuery?: Record<string, any>) {
      if (!this.session_id) throw new Error("session_id is required");
      const { $publicApi } = useNuxtApp();

      this.loading = true;
      this.error = "";
      try {
        const res = await $publicApi<Paginated<SessionSubject>>(
          `/v1/sessions/${this.session_id}/subjects`,
          { query: { ...this.params, ...(extraQuery || {}) } }
        );

        // common paginator case (no outer { data: ... } wrapper)
        this.items = (res as any)?.data || [];
        this.page = (res as any)?.current_page ?? 1;
        this.per_page = (res as any)?.per_page ?? this.per_page;
        this.total = (res as any)?.total ?? 0;
        this.last_page = (res as any)?.last_page ?? 1;

        return res;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load session subjects";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------
     * CREATE single
     * POST /v1/session-subjects
     * body: { session_id, subject_id, sort_order?, book_name? }
     * -------------------------------------------*/
    async create(sessionId: number, payload: SessionSubjectCreatePayload) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const body = {
          ...payload,
          session_id: sessionId,
        };

        const created = await $api<SessionSubject>(`/v1/session-subjects`, {
          method: "POST",
          body,
        });

        // optimistic add when listing same session & first page
        if (this.session_id === sessionId && this.page === 1) {
          this.items.unshift(created as any);
        }

        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.message ||
          "Failed to attach subject to session";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * UPDATE
     * PATCH /v1/session-subjects/{id}
     * body: any subset of { session_id, subject_id, sort_order, book_name }
     * -------------------------------------------*/
    async update(id: number, payload: SessionSubjectUpdatePayload) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<SessionSubject>(
          `/v1/session-subjects/${id}`,
          {
            method: "PATCH",
            body: payload,
          }
        );

        const idx = this.items.findIndex((x) => x.id === id);
        if (idx !== -1) {
          // যদি session_id বদলায় এবং current session থেকে বের হয়ে যায়,
          // চাইলে এখানে filter করে বাদ দিতে পারো; আপাতত just replace করছি
          this.items[idx] = updated as any;
        }

        if (this.current?.id === id) {
          this.current = updated as any;
        }

        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to update session-subject";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /* ---------------------------------------------
     * DELETE
     * DELETE /v1/session-subjects/{id}
     * -------------------------------------------*/
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";
      try {
        await $api<{ message?: string }>(`/v1/session-subjects/${id}`, {
          method: "DELETE",
        });

        this.items = this.items.filter((x) => x.id !== id);
        if (this.current?.id === id) this.current = null;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.message ||
          "Failed to detach subject from session";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
