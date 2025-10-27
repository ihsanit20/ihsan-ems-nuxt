<!-- app/components/UserMenu.vue -->
<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const auth = useAuthStore();

const userName = computed(() => auth.user?.name || "Profile");
const avatarUrl = computed(() => auth.user?.photo);
const userInitial = computed(() => (userName.value?.[0] || "P").toUpperCase());

async function onLogout() {
  await auth.logout?.();
  navigateTo("/auth/login");
}

const items = computed<DropdownMenuItem[]>(() => [
  { label: "Home", icon: "i-lucide-home", to: "/" },
  {
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    to: "/admin/dashboard",
  },
  { label: "Logout", icon: "i-lucide-log-out", onSelect: onLogout },
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
    :ui="{ content: 'w-48' }"
  >
    <UButton
      color="neutral"
      variant="outline"
      aria-label="User menu"
      class="gap-2"
    >
      <!-- Left: avatar (mobile+desktop) -->
      <template #leading>
        <UAvatar
          :src="avatarUrl"
          :alt="userName"
          :text="!avatarUrl ? userInitial : undefined"
          size="sm"
        />
      </template>

      <span class="hidden md:inline">{{ userName }}</span>

      <template #trailing>
        <UIcon name="i-lucide-chevron-down" />
      </template>
    </UButton>
  </UDropdownMenu>
</template>
