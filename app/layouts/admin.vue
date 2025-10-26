<!-- app/layouts/admin.vue -->
<script setup lang="ts"></script>

<template>
  <UDashboardGroup unit="px" storage="local" storage-key="admin-shell">
    <!-- Left sidebar -->
    <AdminSidebar />

    <UDashboardSearch />

    <UDashboardPanel id="main">
      <template #header>
        <AdminHeader />
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
