<!-- app/layouts/admin.vue -->
<script setup lang="ts"></script>

<template>
  <UDashboardGroup unit="px" storage="local" storage-key="admin-shell">
    <!-- Left sidebar -->
    <LayoutAdminSidebar />

    <UDashboardSearch />

    <UDashboardPanel id="main">
      <template #header>
        <LayoutAdminHeader />
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
