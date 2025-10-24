<template>
  <header
    class="w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60"
  >
    <div class="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
        <img v-if="logo" :src="logo" alt="logo" class="h-6 w-auto" />
        <span>{{ title }}</span>
      </NuxtLink>

      <nav class="hidden md:flex items-center gap-6 text-sm">
        <NuxtLink to="/" class="hover:underline">Home</NuxtLink>
        <NuxtLink to="/auth/login" class="hover:underline">Login</NuxtLink>
        <NuxtLink to="/auth/register" class="hover:underline"
          >Register</NuxtLink
        >
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
const tenant = storeToRefs(useTenantStore()).meta;
const title = computed(
  () => tenant.value?.shortName || tenant.value?.name || "Ihsan EMS"
);
const logo = computed(() => tenant.value?.branding?.logoUrl || "");
</script>
