<script setup lang="ts"></script>

<template>
  <ClientOnly>
    <UDashboardGroup unit="px" storage="local" storage-key="guardian-shell">
      <!-- Left sidebar -->
      <LayoutGuardianSidebar class="print:hidden" />

      <UDashboardSearch />

      <UDashboardPanel id="main">
        <template #header>
          <LayoutGuardianHeader class="print:hidden" />
        </template>

        <template #body>
          <slot />
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </ClientOnly>
</template>
