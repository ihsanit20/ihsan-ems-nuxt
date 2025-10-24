// app/plugins/tenant-bootstrap.ts
export default defineNuxtPlugin(async () => {
  const store = useTenantStore();

  // SSR/CSR উভয়েই একবারই চালাতে চাই
  if (store.status === "idle") {
    try {
      await store.fetchMeta(); // SSR-এও await হবে, HTML এর আগে ডেটা প্রস্তুত
    } catch {}
  }

  // Head (title/favicon/colors) রিঅ্যাকটিভ সেট
  const { meta } = storeToRefs(store);
  useHead(() => ({
    title: meta.value?.name ? `${meta.value.name} — Ihsan EMS` : "Ihsan EMS",
    link: meta.value?.branding?.faviconUrl
      ? [{ rel: "icon", href: meta.value.branding.faviconUrl }]
      : [],
  }));

  // CSS vars (SSR-safe): শুধু ক্লায়েন্টে DOM টাচ করুন
  if (import.meta.client && typeof document !== "undefined") {
    const root = document.documentElement;
    const b = meta.value?.branding || {};
    if (b.primaryColor)
      root.style.setProperty("--brand-primary", b.primaryColor);
    if (b.secondaryColor)
      root.style.setProperty("--brand-secondary", b.secondaryColor);
  }
});
