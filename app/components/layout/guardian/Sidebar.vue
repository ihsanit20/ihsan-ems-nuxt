<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { meta: tenant } = storeToRefs(useTenantStore());
const auth = useAuthStore();

const logo = computed(() => tenant.value?.branding?.logoUrl || "");
const title = computed(
  () => tenant.value?.shortName || tenant.value?.name || "Ihsan EMS"
);

const itemsPrimary = computed<NavigationMenuItem[]>(() => [
  {
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    to: "/guardian/dashboard",
    exact: true,
  },
  {
    label: "My Admissions",
    icon: "i-lucide-user-check",
    to: "/guardian/admissions",
  },
  {
    label: "Students",
    icon: "i-lucide-users",
    to: "/guardian/students",
  },
  {
    label: "Attendance",
    icon: "i-lucide-calendar-check",
    to: "/guardian/attendance",
  },
  {
    label: "Fees",
    icon: "i-lucide-banknote",
    to: "/guardian/fees",
  },
  {
    label: "Results",
    icon: "i-lucide-file-text",
    to: "/guardian/results",
  },
]);

const itemsSecondary = computed<NavigationMenuItem[]>(() => [
  {
    label: "Help & Support",
    icon: "i-lucide-info",
    to: "https://github.com/nuxt/ui",
    target: "_blank",
  },
]);
</script>

<template>
  <UDashboardSidebar
    resizable
    collapsible
    :min-size="220"
    :default-size="318"
    :max-size="420"
    :collapsed-size="64"
    :ui="{ footer: 'border-t border-default' }"
  >
    <!-- Header -->
    <template #header="{ collapsed }">
      <div class="relative h-10 px-2 w-full min-w-0">
        <!-- Expanded: logo left, collapse right -->
        <div
          v-if="!collapsed"
          class="flex w-full h-full items-center justify-between"
        >
          <div class="flex items-center gap-2 min-w-0">
            <img
              v-if="logo"
              :src="logo"
              :alt="title"
              class="size-5 w-auto shrink-0"
            />
          </div>
          <UDashboardSidebarCollapse
            aria-label="Collapse sidebar"
            class="inline-flex"
          />
        </div>

        <!-- Collapsed: center logo + full overlay button to expand -->
        <div
          v-else
          class="relative flex w-full h-full items-center justify-center"
        >
          <img v-if="logo" :src="logo" :alt="title" class="h-5 w-auto" />
          <!-- Full header area clickable to expand -->
          <UDashboardSidebarCollapse
            aria-label="Expand sidebar"
            class="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </template>

    <!-- Body -->
    <template #default="{ collapsed }">
      <UDashboardSearchButton />
      <UNavigationMenu
        :collapsed="collapsed"
        :items="itemsPrimary"
        orientation="vertical"
        class="mt-2"
      />
      <UNavigationMenu
        :collapsed="collapsed"
        :items="itemsSecondary"
        orientation="vertical"
        class="mt-auto"
      />
    </template>

    <!-- Footer -->
    <template #footer="{ collapsed }">
      <div v-if="!collapsed" class="p-3">
        <p class="text-xs text-gray-500">Guardian Portal</p>
      </div>
    </template>
  </UDashboardSidebar>
</template>
