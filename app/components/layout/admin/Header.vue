<!-- app/components/AdminHeader.vue -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

const { meta: tenant } = storeToRefs(useTenantStore());
const auth = useAuthStore();

const title = computed(
  () => tenant.value?.shortName || tenant.value?.name || "Ihsan EMS"
);
const logo = computed(() => tenant.value?.branding?.logoUrl || "");

const userData = computed(() => ({
  name: auth.user?.name,
  photo: auth.user?.photo,
}));

async function onLogout() {
  await auth.logout?.();
  navigateTo("/auth/login");
}
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
      <UserMenu :user="userData" :on-logout="onLogout" />
    </template>
  </UDashboardNavbar>
</template>
