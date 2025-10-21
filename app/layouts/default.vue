<template>
  <div>
    <header class="bg-red-600">
      <strong>{{ title }}</strong>
    </header>
    <main style="padding: 16px">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
const store = useTenantStore();
const { meta } = storeToRefs(store);
const title = computed(() => meta.value?.name || "Ihsan EMS");
</script>
