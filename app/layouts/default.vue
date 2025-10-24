<!-- app/layouts/default.vue -->
<script setup lang="ts">
import { storeToRefs } from "pinia";
const store = useTenantStore();
const { meta, status } = storeToRefs(store);
const title = computed(() => meta.value?.name || "Ihsan EMS");
</script>

<template>
  <div>
    <header class="bg-red-600">
      <!-- গার্ড: status ready না হলে একই জিনিস SSR/CSR-এ render হবে (এখানে blank নয়, একই fallback) -->
      <strong v-if="status === 'ready'">{{ title }}</strong>
      <strong v-else>Loading…</strong>
    </header>
    <main class="p-4">
      <slot />
    </main>
  </div>
</template>
