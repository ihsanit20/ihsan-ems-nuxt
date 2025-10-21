<script setup lang="ts">
import { storeToRefs } from "pinia";
const store = useTenantStore();
const { meta } = storeToRefs(store);
const title = computed(() => meta.value?.name || "Ihsan EMS");
</script>

<template>
  <div>
    <header class="bg-red-600">
      <strong>{{ title }}</strong>
    </header>
    <main class="p-4">
      <slot />
    </main>
  </div>
</template>
