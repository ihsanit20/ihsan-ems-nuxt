<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["auth"],
});
const auth = useAuthStore();
const tenantStore = useTenantStore();
const { meta: tenant, status: metaStatus } = storeToRefs(tenantStore);

const toast = useToast();
const tenantStatus = computed(() =>
  metaStatus.value === "ready" ? "ready" : metaStatus.value
);

const refresh = async () => {
  try {
    await auth.fetchMe();
    toast.add({ title: "Refreshed" });
  } catch {
    // ignore
  }
};

const onLogout = async () => {
  await auth.logout();
  await navigateTo("/auth/login");
};
</script>

<template>
  <div class="p-4 md:p-8 space-y-6">
    <!-- Admissions Dashboard Embedded -->
    <AdmissionDashboard />
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Dashboard</h1>
      <div class="flex items-center gap-2">
        <UButton color="neutral" variant="soft" @click="refresh"
          >Refresh</UButton
        >
        <UButton color="error" @click="onLogout">Logout</UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Signed in as</p>
            <p class="font-medium">{{ auth.user?.name }}</p>
          </div>
          <UBadge v-if="auth.user?.role" :label="auth.user?.role" />
        </div>
      </template>

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="space-y-1">
          <p>
            <span class="text-gray-500">Phone:</span>
            {{ auth.user?.phone || "—" }}
          </p>
          <p>
            <span class="text-gray-500">Email:</span>
            {{ auth.user?.email || "—" }}
          </p>
        </div>
        <div class="space-y-1">
          <p>
            <span class="text-gray-500">Tenant:</span> {{ tenant?.name }} ({{
              tenant?.domain
            }})
          </p>
          <p>
            <span class="text-gray-500">Currency:</span>
            {{ tenant?.currency?.code }}
          </p>
        </div>
      </div>
    </UCard>

    <div class="grid md:grid-cols-3 gap-4">
      <UCard>
        <template #header>Quick links</template>
        <ul class="list-disc pl-5 space-y-1">
          <li><NuxtLink to="/">Home</NuxtLink></li>
          <!-- <li><NuxtLink to="/admin/classes">Classes (stub)</NuxtLink></li>
          <li><NuxtLink to="/admin/students">Students (stub)</NuxtLink></li> -->
        </ul>
      </UCard>

      <UCard>
        <template #header>Status</template>
        <p>
          Meta loaded: <b>{{ tenantStatus }}</b>
        </p>
      </UCard>

      <UCard>
        <template #header>What’s next</template>
        <ul class="list-disc pl-5 space-y-1">
          <li>Wire up Classes/Students pages</li>
          <li>RBAC-based UI guard</li>
          <li>Profile & password update</li>
        </ul>
      </UCard>
    </div>
  </div>
</template>
