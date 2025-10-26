<!-- app/layouts/default.vue -->
<script setup lang="ts">
const store = useTenantStore();
const { meta, status } = storeToRefs(store);
const title = computed(() => meta.value?.name || "Ihsan EMS");
</script>

<template>
  <div class="min-h-screen grid grid-rows-[auto_1fr_auto]">
    <PublicHeader />

    <main class="px-4 py-6">
      <div
        v-if="status !== 'ready'"
        class="mx-auto max-w-7xl text-sm opacity-70"
      >
        Loading tenant meta…
      </div>
      <slot />
    </main>

    <PublicFooter />
  </div>
</template>
