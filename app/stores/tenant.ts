// app/stores/tenant.ts

import { defineStore } from "pinia";

type TenantMeta = {
  id: number;
  domain: string;
  name: string;
  shortName?: string | null;
  branding: {
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
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
  actions: {
    async fetchMeta() {
      if (this.status === "loading" || this.status === "ready") return;
      this.status = "loading";
      const { $api } = useNuxtApp();
      try {
        const data = await $api<TenantMeta>("/v1/meta");
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
