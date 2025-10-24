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
        secure: !import.meta.dev, // Vite flag; no @types/node needed
        httpOnly: false,
        path: "/",
      });
      return c.value || "";
    } catch {
      return "";
    }
  };

  // Normalize headers to a Headers instance and attach tenant (and optional ?tenant)
  const attachTenant = (options: { headers?: HeadersInit; query?: any }) => {
    const tenantHost = resolveTenant();

    // Always work with a Headers instance
    const h = new Headers(options.headers as HeadersInit | undefined);
    if (tenantHost) h.set("X-Tenant-Domain", tenantHost);
    options.headers = h; // <-- keep as Headers to satisfy TS

    // Optional DEV fallback via query (?tenant=host)
    const q = (options.query ||= {});
    if (tenantHost && (q as any).tenant == null) {
      (options.query as any).tenant = tenantHost;
    }
  };

  // ---------- $publicApi: NO Authorization ----------
  const $publicApi = $fetch.create({
    baseURL: apiBase,
    credentials: "omit",
    onRequest({ options }) {
      attachTenant(options as any);
    },
  });

  // ---------- $api: Authorization (Bearer) + Tenant ----------
  const $api = $fetch.create({
    baseURL: apiBase,
    credentials: "omit", // If you switch to BFF, change to 'include'
    onRequest({ options }) {
      attachTenant(options as any);

      const token = readToken();
      if (token) {
        const h = new Headers(options.headers as HeadersInit | undefined);
        h.set("Authorization", `Bearer ${token}`);
        options.headers = h; // keep as Headers
      }
    },
  });

  return { provide: { api: $api, publicApi: $publicApi } };
});
