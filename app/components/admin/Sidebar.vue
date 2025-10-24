<template>
  <aside
    class="border-r bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/40"
    :class="collapsed ? 'w-14' : 'w-64'"
  >
    <nav class="p-3 space-y-1">
      <NuxtLink
        class="block px-3 py-2 rounded hover:bg-gray-50"
        to="/dashboard"
      >
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-heroicons-home" />
          <span v-if="!collapsed">Dashboard</span>
        </span>
      </NuxtLink>
      <NuxtLink
        class="block px-3 py-2 rounded hover:bg-gray-50"
        to="/admin/classes"
      >
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-heroicons-academic-cap" />
          <span v-if="!collapsed">Classes</span>
        </span>
      </NuxtLink>
      <NuxtLink
        class="block px-3 py-2 rounded hover:bg-gray-50"
        to="/admin/students"
      >
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-heroicons-user-group" />
          <span v-if="!collapsed">Students</span>
        </span>
      </NuxtLink>
      <NuxtLink
        class="block px-3 py-2 rounded hover:bg-gray-50"
        to="/admin/fees"
      >
        <span class="inline-flex items-center gap-2">
          <UIcon name="i-heroicons-banknotes" />
          <span v-if="!collapsed">Fees</span>
        </span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ collapsed: boolean }>();
</script>
