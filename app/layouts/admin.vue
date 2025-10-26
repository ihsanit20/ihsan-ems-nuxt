<!-- app/layouts/admin.vue -->
<script setup lang="ts">
const sidebarCollapsed = ref(false);
const toggleSidebar = () => (sidebarCollapsed.value = !sidebarCollapsed.value);
</script>

<template>
  <div class="min-h-screen grid grid-rows-[auto_1fr_auto]">
    <AdminHeader @toggleSidebar="toggleSidebar" />
    <div class="grid grid-cols-[auto_1fr] min-h-0">
      <AdminSidebar :collapsed="sidebarCollapsed" />
      <main class="p-4 overflow-auto">
        <slot />
      </main>
    </div>
    <AdminFooter />
  </div>
</template>
