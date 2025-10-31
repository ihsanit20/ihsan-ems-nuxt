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
    async fetchMeta(force = false) {
      if (this.status === "loading") return this.meta;

      // ✅ Cookie cache (SSR-safe), 12h TTL
      const cookie = useCookie<TenantMeta | null>("tenant_meta", {
        maxAge: 60 * 60 * 12, // seconds
        sameSite: "lax",
      });

      if (!force && cookie.value) {
        this.meta = cookie.value;
        this.status = "ready";
        return this.meta;
      }

      this.status = "loading";
      const { $publicApi } = useNuxtApp();
      try {
        const data = await $publicApi<TenantMeta>("/v1/tenant/meta");
        this.meta = data;
        cookie.value = data; // ✅ cache write
        this.status = "ready";
        return data;
      } catch (e: any) {
        this.error =
          e?.data?.error || e?.message || "Failed to load tenant meta";
        this.status = "error";
        throw e;
      }
    },
  },
});
