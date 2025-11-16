<script setup lang="ts"></script>

<template>
  <ClientOnly>
    <UDashboardGroup unit="px" storage="local" storage-key="guardian-shell">
      <!-- Left sidebar -->
      <LayoutGuardianSidebar />

      <UDashboardSearch />

      <UDashboardPanel id="main">
        <template #header>
          <LayoutGuardianHeader />
        </template>

        <template #body>
          <slot />
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </ClientOnly>
</template>
