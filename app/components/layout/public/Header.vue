<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

const { meta } = storeToRefs(useTenantStore());
const auth = useAuthStore();

const title = computed(
  () => meta.value?.shortName || meta.value?.name || "Ihsan EMS"
);
const logo = computed(() => meta.value?.branding?.logoUrl || "");

// সরাসরি user truthy চেক
const user = computed(() => auth.user);
const role = computed(() => auth.user?.role || "");
const userData = computed(() => ({
  name: auth.user?.name,
  photo: auth.user?.photo,
}));

async function onLogout() {
  await auth.logout?.();
  navigateTo("/auth/login");
}
</script>

<template>
  <header
    class="w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-2"
  >
    <UContainer class="flex justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
        <img v-if="logo" :src="logo" alt="logo" class="h-6 w-auto" />
        <span>{{ title }}</span>
      </NuxtLink>

      <!-- guest -->
      <nav v-if="!user" class="hidden md:flex items-center gap-6 text-sm">
        <NuxtLink to="/" class="hover:underline">Home</NuxtLink>
        <NuxtLink to="/auth/login" class="hover:underline">Login</NuxtLink>
        <NuxtLink to="/auth/register" class="hover:underline"
          >Register</NuxtLink
        >
      </nav>

      <!-- authed -->
      <div v-else class="hidden md:flex items-center gap-2">
        <UserMenu :user="userData" :on-logout="onLogout" />
      </div>
    </UContainer>
  </header>
</template>
