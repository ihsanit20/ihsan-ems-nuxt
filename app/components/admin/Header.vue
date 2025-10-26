<!-- app/components/admin/Header.vue -->
<script setup lang="ts">
const { meta: tenant } = storeToRefs(useTenantStore());
const auth = useAuthStore();

const title = computed(
  () => tenant.value?.shortName || tenant.value?.name || "Ihsan EMS"
);
const logo = computed(() => tenant.value?.branding?.logoUrl || "");
</script>

<template>
  <UDashboardNavbar>
    <template #left>
      <img v-if="logo" :src="logo" alt="" class="h-5 w-auto" />
      <span class="hidden sm:inline ml-2 font-semibold truncate max-w-[40vw]">
        {{ title }}
      </span>
    </template>

    <template #right>
      <UserMenu />
    </template>
  </UDashboardNavbar>
</template>
