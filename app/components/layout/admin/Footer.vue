<!-- app/components/admin/Footer.vue -->
<script setup lang="ts">
const tenant = storeToRefs(useTenantStore()).meta;
const title = computed(() => tenant.value?.name || "Ihsan EMS");
</script>

<template>
  <footer class="mt-10 border-t">
    <div
      class="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-500 flex items-center justify-between"
    >
      <p>© {{ new Date().getFullYear() }} {{ title }}. All rights reserved.</p>
      <p class="opacity-80">
        Powered by
        <NuxtLink to="/" class="underline hover:no-underline"
          >Ihsan EMS</NuxtLink
        >
      </p>
    </div>
  </footer>
</template>
