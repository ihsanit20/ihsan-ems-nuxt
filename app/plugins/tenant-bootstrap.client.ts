// app/plugins/tenant-bootstrap.client.ts
export default defineNuxtPlugin(async () => {
  const store = useTenantStore();
  if (store.status === "idle") {
    try {
      await store.fetchMeta();
    } catch {}
  }

  const meta = store.meta;
  if (!meta) return;

  document.title = meta.name ? `${meta.name} — Ihsan EMS` : "Ihsan EMS";
  const root = document.documentElement;
  if (meta.branding?.primaryColor)
    root.style.setProperty("--brand-primary", meta.branding.primaryColor);
  if (meta.branding?.secondaryColor)
    root.style.setProperty("--brand-secondary", meta.branding.secondaryColor);

  if (meta.branding?.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = meta.branding.faviconUrl;
  }
  if (meta.locale?.default) root.setAttribute("lang", meta.locale.default);
});
