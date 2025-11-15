<!-- app/layouts/admin.vue -->
<script setup lang="ts"></script>

<template>
  <ClientOnly>
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

    <!-- চাইলে একটা fallback দেখাতে পারো -->
    <!--
    <template #fallback>
      <div class="min-h-svh flex items-center justify-center text-sm text-neutral-500">
        Loading admin shell...
      </div>
    </template>
    -->
  </ClientOnly>
</template>
