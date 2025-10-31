<!-- app/components/admin/Sidebar.vue -->
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
    to: "/admin/dashboard",
    exact: true,
  },

  // {
  //   label: "Admission",
  //   icon: "i-lucide-badge-plus",
  //   children: [
  //     { label: "New Admission", to: "/admin/admission" },
  //     { label: "Students", to: "/admin/students" },
  //     { label: "Imports", to: "/admin/students/imports" },
  //   ],
  // },
  // {
  //   label: "Attendance",
  //   icon: "i-lucide-check-square",
  //   children: [
  //     { label: "Students", to: "/admin/attendance/students" },
  //     { label: "Staff", to: "/admin/attendance/staff" },
  //   ],
  // },
  // {
  //   label: "Fees",
  //   icon: "i-lucide-banknote",
  //   children: [
  //     { label: "Collect Fees", to: "/admin/fees/collect" },
  //     { label: "Due List", to: "/admin/fees/due" },
  //     { label: "Student Ledger", to: "/admin/fees/ledger" },
  //   ],
  // },
  // {
  //   label: "Exams",
  //   icon: "i-lucide-clipboard-list",
  //   children: [
  //     { label: "Marks Entry", to: "/admin/exams/marks" },
  //     { label: "Result Sheet", to: "/admin/exams/results" },
  //   ],
  // },
  // {
  //   label: "Reports",
  //   icon: "i-lucide-bar-chart-3",
  //   children: [
  //     { label: "Admission", to: "/admin/reports/admission" },
  //     { label: "Attendance", to: "/admin/reports/attendance" },
  //     { label: "Fees", to: "/admin/reports/fees" },
  //     { label: "Exams", to: "/admin/reports/exams" },
  //   ],
  // },

  {
    label: "Setup",
    icon: "i-lucide-settings",
    defaultOpen: true,
    children: [
      { label: "User Management", to: "/admin/setup/users" },
      { label: "Institute Setup", to: "/admin/setup/institute" },
      { label: "Session Setup", to: "/admin/setup/sessions" },
      // { label: "Payment Methods", to: "setup/payments" },
    ],
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
          <!-- পুরো হেডার এলাকা ক্লিক করলে expand -->
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
      <UButton
        :avatar="auth.user ? { alt: auth.user.name } : undefined"
        :label="collapsed ? undefined : auth.user?.name || 'Profile'"
        color="neutral"
        variant="ghost"
        class="w-full"
        :block="collapsed"
        to="/admin/dashboard"
      />
    </template>

    <!-- Resize handle (visible & easy to grab) -->
    <template #resize-handle="{ onMouseDown, onTouchStart, onDoubleClick }">
      <UDashboardResizeHandle
        class="relative z-20 w-2 cursor-col-resize hover:bg-(--ui-border-accented) transition"
        @mousedown="onMouseDown"
        @touchstart="onTouchStart"
        @dblclick="onDoubleClick"
      />
    </template>
  </UDashboardSidebar>
</template>
