// nuxt.config.ts

export default defineNuxtConfig({
  pages: true,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  modules: [
    "@nuxt/ui",
    "@nuxt/icon",
    "@nuxt/image",
    [
      "@pinia/nuxt",
      {
        // ← টাপল: [module, options]
        autoImports: ["defineStore", "storeToRefs"],
      },
    ],
  ],

  runtimeConfig: {
    public: {
      apiBase: "http://127.0.0.1:8000/api", // .env / .env.production এটাকে ওভাররাইড করবে
    },
  },
});
