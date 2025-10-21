// app/plugins/api.ts
export default defineNuxtPlugin(() => {
  const {
    public: { apiBase },
  } = useRuntimeConfig();

  const api = $fetch.create({
    baseURL: apiBase,
    credentials: "omit", // পরে BFF হলে 'include'
    onRequest({ options }) {
      let host = "";

      if (import.meta.server) {
        // SSR: রিকোয়েস্ট হেডার থেকে host
        const h = useRequestHeaders(["host"]);
        host = h?.host || "";
      } else if (import.meta.client && typeof window !== "undefined") {
        // CSR: ব্রাউজারের host:port
        host = window.location.host;
      }

      // Dev টেস্ট: tenant query auto-attach (না থাকলে)
      const q = (options.query ||= {});
      if (host && (q as any).tenant == null) {
        (options.query as any).tenant = host;
      }
    },
  });

  return { provide: { api } };
});
