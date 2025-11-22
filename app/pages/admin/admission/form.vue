<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  roles: ["Owner", "Admin", "Developer"],
});

useHead({ title: "Offline Application Entry" });

const router = useRouter();
const toast = useToast();

const apps = useAdmissionApplicationStore();
const { saving } = storeToRefs(apps);

async function handleSubmit(payload: any) {
  try {
    const res = await apps.createPublic(payload);
    toast.add({
      title: "Created",
      description: "Application created",
      color: "success",
    });
    router.push(`/admin/admission/${res?.id || ""}/application-details`);
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description:
        e?.data?.message || e?.message || "Could not create application",
      color: "error",
    });
  }
}
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Offline Entry</h1>
        <p class="text-sm text-gray-500">
          Record an application received offline.
        </p>
      </div>
      <UButton
        color="secondary"
        variant="outline"
        icon="i-lucide-arrow-left"
        to="/admin/admission/applications"
      >
        Back
      </UButton>
    </div>

    <AdmissionForm
      mode="admin"
      :saving="saving"
      submit-label="Create"
      @submit="handleSubmit"
      @cancel="router.push('/admin/admission/applications')"
    />
  </UContainer>
</template>
