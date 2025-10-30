// app/stores/institute.ts
import { defineStore } from "pinia";

/* ---------- Types ---------- */
export type InstituteNames = {
  en?: string | null;
  bn?: string | null;
  ar?: string | null;
};

export type InstituteContact = {
  address: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  social?: {
    facebook?: string | null;
    youtube?: string | null;
    whatsapp?: string | null;
  } | null;
};

export type InstituteProfile = {
  names: InstituteNames | null;
  contact: InstituteContact;
};

const ENDPOINT = "/v1/institute/profile";

/* ---------- Store ---------- */
export const useInstituteStore = defineStore("institute", {
  state: () => ({
    profile: null as InstituteProfile | null,
    loading: false,
    saving: false,
    error: "" as string,
  }),

  actions: {
    async fetchProfile() {
      const { $api } = useNuxtApp();
      this.loading = true;
      this.error = "";
      try {
        const res = await $api<InstituteProfile>(ENDPOINT);
        // Normalize minimal shape
        const contact: InstituteContact = {
          address: res?.contact?.address ?? "",
          phone: res?.contact?.phone ?? null,
          email: res?.contact?.email ?? null,
          website: res?.contact?.website ?? null,
          social: res?.contact?.social ?? null,
        };
        this.profile = {
          names: res?.names ?? null,
          contact,
        };
        return this.profile;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to load institute profile";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async updateProfile(payload: {
      names?: InstituteNames | null;
      contact: InstituteContact; // contact.address required per API
    }) {
      const { $api } = useNuxtApp();
      this.saving = true;
      this.error = "";
      try {
        const updated = await $api<InstituteProfile>(ENDPOINT, {
          method: "PATCH", // matches Route::match(['put','patch'], ...)
          body: payload,
        });
        // Normalize
        const contact: InstituteContact = {
          address: updated?.contact?.address ?? "",
          phone: updated?.contact?.phone ?? null,
          email: updated?.contact?.email ?? null,
          website: updated?.contact?.website ?? null,
          social: updated?.contact?.social ?? null,
        };
        this.profile = {
          names: updated?.names ?? null,
          contact,
        };
        return this.profile;
      } catch (e: any) {
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to update institute profile";
        throw e;
      } finally {
        this.saving = false;
      }
    },
  },
});
