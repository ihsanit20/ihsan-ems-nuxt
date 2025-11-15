// app/stores/section.ts
import { defineStore } from "pinia";

/* ---------- Types ---------- */
export type Section = {
  id: number;
  session_grade_id: number;
  name: string;
  code?: string | null;
  capacity?: number | null;
  class_teacher_id?: number | null;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;

  class_teacher?: { id: number; name: string } | null;
};

export type SectionFilters = {
  session_grade_id?: number;
  search?: string;
};

export const useSectionStore = defineStore("sections", {
  state: () => ({
    // প্রতি session_grade_id আলাদা করে data রাখব
    bySession: {} as Record<number, Section[]>,
    current: null as Section | null,

    loading: false,
    saving: false,
    removing: false,
    error: "" as string,
  }),

  getters: {
    // props.sessionGradeId দিয়ে লিস্ট বের করার helper
    itemsForSession: (state) => {
      return (sessionGradeId: number): Section[] =>
        state.bySession[sessionGradeId] ?? [];
    },
  },

  actions: {
    // GET /v1/sections?session_grade_id=...
    async fetchListBySession(
      sessionGradeId: number,
      extraQuery?: Record<string, any>
    ) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";

      if (!sessionGradeId) {
        this.loading = false;
        return;
      }

      try {
        const res = await $publicApi<Section[]>("/v1/sections", {
          query: {
            session_grade_id: sessionGradeId,
            ...(extraQuery || {}),
          },
        });

        // প্রতি session_grade_id অনুযায়ী রাখি
        this.bySession[sessionGradeId] = res || [];
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to load sections";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // GET /v1/sections/{id}
    async fetchOne(id: number, opts?: { withTeacher?: boolean }) {
      const { $publicApi } = useNuxtApp();
      this.loading = true;
      this.error = "";

      try {
        const query = opts?.withTeacher ? { with_teacher: 1 } : undefined;
        const section = await $publicApi<Section>(`/v1/sections/${id}`, {
          query,
        });
        this.current = section;
        return section;
      } catch (e: any) {
        this.error = e?.data?.message || e?.message || "Failed to load section";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    // POST /v1/sections
    async create(payload: {
      session_grade_id: number;
      name: string;
      code?: string | null;
      capacity?: number | null;
      class_teacher_id?: number | null;
      sort_order?: number | null;
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";

      try {
        const created = await $api<Section>("/v1/sections", {
          method: "POST",
          body: payload,
        });

        const sgId = created.session_grade_id;
        if (!this.bySession[sgId]) {
          this.bySession[sgId] = [];
        }
        this.bySession[sgId].unshift(created);

        return created;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to create section";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    // PATCH /v1/sections/{id}
    async update(
      id: number,
      payload: Partial<{
        name: string;
        code: string | null;
        capacity: number | null;
        class_teacher_id: number | null;
        sort_order: number | null;
      }>
    ) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";

      try {
        const updated = await $api<Section>(`/v1/sections/${id}`, {
          method: "PATCH",
          body: payload,
        });

        // map-এর মধ্যে যে session list এ আছে, সেখানেই আপডেট
        for (const key of Object.keys(this.bySession)) {
          const sgId = Number(key);
          const list = this.bySession[sgId];
          const idx = list.findIndex((s) => s.id === id);
          if (idx !== -1) {
            list[idx] = updated;
            break;
          }
        }

        if (this.current?.id === id) {
          this.current = updated;
        }

        return updated;
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to update section";
        throw e;
      } finally {
        this.saving = false;
      }
    },

    // DELETE /v1/sections/{id}
    async remove(id: number) {
      const { $api } = useNuxtApp();
      this.removing = true;
      this.error = "";

      try {
        await $api<{ message: string }>(`/v1/sections/${id}`, {
          method: "DELETE",
        });

        // সব session list এ গিয়ে খুঁজে যে list এ আছে, সেখান থেকে কেটে দেই
        for (const key of Object.keys(this.bySession)) {
          const sgId = Number(key);
          const list = this.bySession[sgId];
          const idx = list.findIndex((s) => s.id === id);
          if (idx !== -1) {
            list.splice(idx, 1);
            break;
          }
        }

        if (this.current?.id === id) {
          this.current = null;
        }
      } catch (e: any) {
        this.error =
          e?.data?.message || e?.message || "Failed to delete section";
        throw e;
      } finally {
        this.removing = false;
      }
    },
  },
});
