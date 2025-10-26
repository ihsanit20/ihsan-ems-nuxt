// app/plugins/tenant-bootstrap.ts
import { storeToRefs } from "pinia";

export default defineNuxtPlugin(async () => {
  const store = useTenantStore();

  // SSR/CSR—একবার meta এনে বসাই
  if (store.status === "idle") {
    try {
      await store.fetchMeta();
    } catch {
      // ignore; UI তে fallback থাকুক
    }
  }

  // Head: title + favicon + theme-color
  const { meta } = storeToRefs(store);

  useHead(() => {
    const title = meta.value?.name
      ? `${meta.value.name} — Ihsan EMS`
      : "Ihsan EMS";
    const links: any[] = [];
    if (meta.value?.branding?.faviconUrl) {
      links.push({
        rel: "icon",
        type: "image/png",
        href: meta.value.branding.faviconUrl!,
      });
    }
    const metas: any[] = [];
    if (meta.value?.branding?.primaryColor) {
      metas.push({
        name: "theme-color",
        content: meta.value.branding.primaryColor,
      });
    }
    return {
      title,
      link: links,
      meta: metas,
      htmlAttrs: { lang: meta.value?.locale?.default || "bn" },
    };
  });

  // Brand colors -> CSS variables (reactive)
  if (import.meta.client && typeof document !== "undefined") {
    watch(
      () => meta.value?.branding,
      (b) => {
        const root = document.documentElement;
        if (!b) return;
        if (b.primaryColor)
          root.style.setProperty("--brand-primary", b.primaryColor);
        if (b.secondaryColor)
          root.style.setProperty("--brand-secondary", b.secondaryColor);
      },
      { immediate: true, deep: true }
    );
  }
});
