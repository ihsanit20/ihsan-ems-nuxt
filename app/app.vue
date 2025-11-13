<script setup lang="ts">
const toaster = {
  position: "bottom-right" as const,
  duration: 5000,
  max: 5,
  expand: true,
};
</script>

<template>
  <UApp :toaster="toaster">
    <NuxtLayout>
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
