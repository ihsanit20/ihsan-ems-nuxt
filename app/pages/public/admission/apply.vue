<script setup lang="ts">
definePageMeta({ layout: "default" });

useHead({ title: "Apply for Admission" });

const store = useAdmissionApplicationStore();
const { saving } = storeToRefs(store);
const toast = useToast();
const router = useRouter();

async function handleSubmit(payload: any) {
  try {
    const result = await store.createPublic(payload);
    toast.add({
      title: "Success",
      description: "Your application has been submitted successfully!",
      color: "success",
    });
    router.push({
      path: "/public/admission/success",
      query: { application_no: result.application_no },
    });
  } catch (error: any) {
    toast.add({
      title: "Submission Failed",
      description:
        error?.data?.message ||
        "Failed to submit application. Please try again.",
      color: "error",
    });
  }
}
</script>

<template>
  <UContainer>
    <div class="mx-auto max-w-3xl">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold mb-2">Admission Application Form</h1>
        <p class="text-sm text-gray-600">
          Please fill in all required fields marked with
          <span class="text-red-500">*</span>
        </p>
      </div>

      <!-- Form -->
      <AdmissionForm
        mode="public"
        :saving="saving"
        submit-label="Submit Application"
        @submit="handleSubmit"
        @cancel="router.back()"
      />
    </div>
  </UContainer>
</template>
