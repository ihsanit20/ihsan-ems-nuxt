<template>
  <header
    class="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60"
  >
    <div class="h-14 px-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          size="sm"
          icon="i-heroicons-bars-3"
          @click="$emit('toggleSidebar')"
        />
        <div class="flex items-center gap-2 font-semibold">
          <img v-if="logo" :src="logo" alt="logo" class="h-6 w-auto" />
          <span>{{ title }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UBadge v-if="role" :label="role" />
        <UDropdown :items="menu">
          <UButton variant="ghost" icon="i-heroicons-user-circle" />
        </UDropdown>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: "toggleSidebar"): void }>();

const tenant = storeToRefs(useTenantStore()).meta;
const auth = useAuthStore();

const title = computed(
  () => tenant.value?.shortName || tenant.value?.name || "Ihsan EMS"
);
const logo = computed(() => tenant.value?.branding?.logoUrl || "");
const role = computed(() => auth.user?.role || "");

const menu = computed(() => [
  [
    { label: auth.user?.name || "Profile", disabled: true },
    { label: "Dashboard", to: "/dashboard", icon: "i-heroicons-chart-bar" },
    {
      label: "Logout",
      icon: "i-heroicons-arrow-right-on-rectangle",
      click: onLogout,
    },
  ],
]);

async function onLogout() {
  await auth.logout();
  navigateTo("/auth/login");
}
</script>
