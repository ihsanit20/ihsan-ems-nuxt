// app/stores/tenant.ts
import { defineStore } from "pinia";

export type TenantMeta = {
  id: number;
  domain: string;
  name: string;
  shortName?: string | null;
  branding: {
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    version?: string | null;
  };
  locale: {
    default: string;
    supported: string[];
    numberSystem: string;
    calendarMode: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  currency: { code: string; symbol: string; position: "prefix" | "suffix" };
  features: Record<string, boolean>;
  policy: Record<string, any>;
  status: { active: boolean; maintenance: boolean };
};

export const useTenantStore = defineStore("tenant", {
  state: () => ({
    meta: null as TenantMeta | null,
    status: "idle" as "idle" | "loading" | "ready" | "error",
    error: "" as string | "",
  }),
  getters: {
    title(state): string {
      return state.meta?.shortName || state.meta?.name || "Ihsan EMS";
    },
    logo(state): string {
      return state.meta?.branding?.logoUrl || "";
    },
    favicon(state): string {
      return state.meta?.branding?.faviconUrl || "";
    },
  },
  actions: {
    async fetchMeta() {
      if (this.status === "loading" || this.status === "ready") return;
      this.status = "loading";
      const { $publicApi } = useNuxtApp();
      try {
        // ✅ server route: /api/v1/tenant/meta  (nuxt runtime apiBase ends with /api)
        const data = await $publicApi<TenantMeta>("/v1/tenant/meta");
        this.meta = data;
        this.status = "ready";
      } catch (e: any) {
        this.error =
          e?.data?.error || e?.message || "Failed to load tenant meta";
        this.status = "error";
        throw e;
      }
    },
  },
});
