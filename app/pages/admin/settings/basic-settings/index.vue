<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

const tiles = [
  {
    key: "institute",
    title: "Institute",
    desc: "Basic institute profile settings: name, logo, address, contact.",
    icon: "i-lucide-building-2",
    to: "/admin/settings/basic-settings/institute",
    primary: "Manage",
  },
  {
    key: "levels",
    title: "Levels (Master)",
    desc: "Level/stage master with code and sort order.",
    icon: "i-lucide-layers",
    to: "/admin/settings/basic-settings/levels",
    primary: "Manage",
  },
  {
    key: "grades",
    title: "Grades (Master)",
    desc: "Level-based grade master data: name, code, order, status.",
    icon: "i-lucide-list-ordered",
    to: "/admin/settings/basic-settings/grades",
    primary: "Manage",
  },
];
</script>

<template>
  <UContainer>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">Basic Settings</h1>
        <p class="text-sm text-gray-500 mt-1">
          Configure the core data for your system—Institute profile, Grades, and
          Levels.
        </p>
      </div>
      <UBadge color="primary" variant="soft">Admin • Settings</UBadge>
    </div>

    <!-- Guidance -->
    <UAlert
      title="Heads up"
      description="Session-scoped items (e.g., Class Openings / Sections) are managed inside Academic Sessions. This page only covers master/profile data."
      icon="i-lucide-info"
      color="primary"
      variant="soft"
      class="mb-6"
    />

    <!-- Tiles -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="t in tiles"
        :key="t.key"
        class="hover:shadow-md transition-shadow"
      >
        <div class="flex gap-4">
          <div
            class="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border bg-white/70"
          >
            <UIcon :name="t.icon" class="h-5 w-5" />
          </div>

          <div class="flex-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-medium">{{ t.title }}</h3>
            </div>
            <p class="text-sm text-gray-500 mt-1">
              {{ t.desc }}
            </p>

            <div class="mt-4">
              <UButton :to="t.to" color="primary" variant="solid">
                {{ t.primary }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Helpful note -->
    <p class="text-xs text-gray-500 mt-6">
      Tip: To open classes/sections by session, go to
      <strong>Academics → Sessions → (open a session) → Classes</strong>.
    </p>
  </UContainer>
</template>
