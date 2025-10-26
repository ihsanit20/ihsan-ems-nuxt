// app/plugins/api.ts
export default defineNuxtPlugin(() => {
  const {
    public: { apiBase },
  } = useRuntimeConfig();

  // Resolve current host as tenant-domain
  const resolveTenant = () => {
    if (import.meta.server) {
      const h = useRequestHeaders(["host"]);
      return (h?.host || "").toLowerCase();
    }
    if (import.meta.client && typeof window !== "undefined") {
      return (window.location.host || "").toLowerCase();
    }
    return "";
  };

  // Read auth token from cookie (SSR/CSR-safe)
  const readToken = (): string => {
    try {
      const c = useCookie<string>("auth_token", {
        sameSite: "lax",
        secure: !import.meta.dev,
        httpOnly: false,
        path: "/",
      });
      return c.value || "";
    } catch {
      return "";
    }
  };

  // Normalize headers and attach tenant (and ?tenant)
  const attachTenant = (options: { headers?: HeadersInit; query?: any }) => {
    const tenantHost = resolveTenant();

    const h = new Headers(options.headers as HeadersInit | undefined);
    if (tenantHost) h.set("X-Tenant-Domain", tenantHost);
    h.set("Accept", "application/json");
    options.headers = h;

    const q = (options.query ||= {});
    if (tenantHost && (q as any).tenant == null) {
      (options.query as any).tenant = tenantHost;
    }
  };

  // ---------- $publicApi: NO Authorization ----------
  const $publicApi = $fetch.create({
    baseURL: apiBase, // e.g. http://127.0.0.1:8000/api
    credentials: "omit",
    onRequest({ options }) {
      attachTenant(options as any);
    },
  });

  // ---------- $api: Authorization (Bearer) + Tenant ----------
  const $api = $fetch.create({
    baseURL: apiBase,
    credentials: "omit", // If BFF, change to 'include'
    onRequest({ options }) {
      attachTenant(options as any);

      const token = readToken();
      if (token) {
        const h = new Headers(options.headers as HeadersInit | undefined);
        h.set("Authorization", `Bearer ${token}`);
        options.headers = h;
      }
    },
  });

  return { provide: { api: $api, publicApi: $publicApi } };
});
