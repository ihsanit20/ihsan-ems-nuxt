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
  state: () => {
    const profileFromCookie =
      useCookie<InstituteProfile | null>("institute_profile").value ?? null;
    return {
      profile: profileFromCookie as InstituteProfile | null,
      loading: false,
      saving: false,
      error: "" as string,
    };
  },

  actions: {
    async fetchProfile(force = false) {
      if (this.loading) return this.profile;

      // ✅ Cookie cache (SSR-safe), 12h TTL
      const cookie = useCookie<InstituteProfile | null>("institute_profile", {
        maxAge: 60 * 60 * 12, // seconds
        sameSite: "lax",
      });

      if (!force && cookie.value) {
        this.profile = cookie.value;
        return this.profile;
      }

      this.loading = true;
      this.error = "";
      try {
        const { $api } = useNuxtApp();
        const res = await $api<InstituteProfile>("/v1/institute/profile");

        const contact: InstituteContact = {
          address: res?.contact?.address ?? "",
          phone: res?.contact?.phone ?? null,
          email: res?.contact?.email ?? null,
          website: res?.contact?.website ?? null,
          social: res?.contact?.social ?? null,
        };

        this.profile = { names: res?.names ?? null, contact };
        cookie.value = this.profile; // ✅ cache write
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
      this.saving = true;
      this.error = "";
      try {
        const { $api } = useNuxtApp();
        const updated = await $api<InstituteProfile>("/v1/institute/profile", {
          method: "PATCH",
          body: payload,
        });

        const contact: InstituteContact = {
          address: updated?.contact?.address ?? "",
          phone: updated?.contact?.phone ?? null,
          email: updated?.contact?.email ?? null,
          website: updated?.contact?.website ?? null,
          social: updated?.contact?.social ?? null,
        };

        this.profile = { names: updated?.names ?? null, contact };

        // ✅ Cookie update so footer/public pages get the latest immediately
        const cookie = useCookie<InstituteProfile | null>("institute_profile", {
          maxAge: 60 * 60 * 12,
          sameSite: "lax",
        });
        cookie.value = this.profile;

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
