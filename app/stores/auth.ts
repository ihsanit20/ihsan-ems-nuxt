// app/stores/auth.ts
import { defineStore } from "pinia";

type AuthUser = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  photo?: string | null;
};

type AuthState = {
  token: string;
  user: AuthUser | null;
  status: "idle" | "authenticating" | "ready" | "error";
  error: string;
};

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    token: "",
    user: null,
    status: "idle",
    error: "",
  }),

  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    me: (s) => s.user,
    role: (s) => s.user?.role ?? null,
  },

  actions: {
    /* -------------------------- private helpers -------------------------- */
    _authCookie() {
      return useCookie<string>("auth_token", {
        sameSite: "lax",
        secure: !import.meta.dev, // ⬅️ process.env নয়
        httpOnly: false,
        path: "/",
      });
    },
    _setToken(tok: string) {
      this.token = tok;
      const c = this._authCookie();
      c.value = tok || "";
    },
    _clearState() {
      this.token = "";
      this.user = null;
      this.status = "idle";
      this.error = "";
      const c = this._authCookie();
      c.value = "";
    },

    /* ------------------------------ lifecycle ---------------------------- */
    init() {
      try {
        const c = this._authCookie();
        if (c.value && !this.token) {
          this.token = c.value;
        }
      } catch {
        // ignore
      }
    },

    /* --------------------------------- API -------------------------------- */
    /** Login: identifier (phone/email) + password */
    async login(identifier: string, password: string, device = "nuxt") {
      const { $publicApi } = useNuxtApp();
      this.status = "authenticating";
      this.error = "";

      try {
        const res = await $publicApi<{ token: string; user: AuthUser }>(
          "/v1/auth/login",
          { method: "POST", body: { identifier, password, device } }
        );

        this._setToken(res.token);
        this.user = res.user;
        this.status = "ready";
        return res.user;
      } catch (e: any) {
        this._clearState();
        this.status = "error";
        this.error =
          e?.data?.message || e?.data?.error || e?.message || "Login failed";
        throw e;
      }
    },

    /** Me: token → profile */
    async fetchMe() {
      const { $api } = useNuxtApp();
      this.error = "";

      try {
        const me = await $api<AuthUser>("/v1/me");
        this.user = me;
        if (this.token && !this.status.startsWith("auth")) {
          this.status = "ready";
        }
        return me;
      } catch (e: any) {
        if (e?.status === 401) {
          this._clearState();
        }
        this.error =
          e?.data?.message ||
          e?.data?.error ||
          e?.message ||
          "Failed to load profile";
        throw e;
      }
    },

    /** Logout (single token) */
    async logout() {
      const { $api } = useNuxtApp();
      try {
        await $api("/v1/auth/logout", { method: "POST" });
      } catch {
        // ignore
      } finally {
        this._clearState();
      }
    },

    /** Logout all tokens (global revoke) */
    async logoutAll() {
      const { $api } = useNuxtApp();
      try {
        await $api("/v1/auth/logout-all", { method: "POST" });
      } catch {
        // ignore
      } finally {
        this._clearState();
      }
    },
  },
});
