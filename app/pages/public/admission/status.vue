<script setup lang="ts">
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  layout: "default",
});

useHead({
  title: "Check Application Status",
});

const toast = useToast();

// Form state
const state = reactive({
  application_no: "",
  date_of_birth: "",
});

// Result state
const searchPerformed = ref(false);
const loading = ref(false);
const applicationResult = ref<any>(null);

// Form submission
async function onSubmit(event: FormSubmitEvent<any>) {
  // Basic validation
  if (!state.application_no.trim()) {
    toast.add({
      title: "Validation Error",
      description: "Please enter your application number.",
      color: "error",
    });
    return;
  }

  if (!state.date_of_birth) {
    toast.add({
      title: "Validation Error",
      description: "Please enter your date of birth.",
      color: "error",
    });
    return;
  }

  loading.value = true;
  searchPerformed.value = false;

  try {
    // TODO: call status-check API when available
    // const store = useAdmissionApplicationStore();
    // const result = await store.checkStatus({
    //   application_no: state.application_no,
    //   date_of_birth: state.date_of_birth,
    // });

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock result for demonstration
    applicationResult.value = {
      application_no: state.application_no,
      applicant_name: "Sample Student Name",
      applied_date: "2025-11-10",
      session: "Academic Year 2025-2026",
      grade: "Class 6",
      status: "pending",
      status_note: "Your application is under review.",
    };

    searchPerformed.value = true;

    toast.add({
      title: "Success",
      description: "Application status retrieved successfully.",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Error",
      description:
        error?.data?.message || "Failed to retrieve application status.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

// Status badge color
function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "warning";
    case "accepted":
      return "success";
    case "admitted":
      return "primary";
    case "rejected":
      return "error";
    default:
      return "neutral";
  }
}

// Status icon
function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
      return "i-lucide-clock";
    case "accepted":
      return "i-lucide-check-circle";
    case "admitted":
      return "i-lucide-graduation-cap";
    case "rejected":
      return "i-lucide-x-circle";
    default:
      return "i-lucide-help-circle";
  }
}

// Reset form
function resetSearch() {
  state.application_no = "";
  state.date_of_birth = "";
  searchPerformed.value = false;
  applicationResult.value = null;
}
</script>

<template>
  <UContainer>
    <div class="mx-auto max-w-2xl">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold mb-2">Check Application Status</h1>
        <p class="text-sm text-gray-600">
          Enter your application number and date of birth to check your
          application status.
        </p>
      </div>

      <!-- Search Form -->
      <UCard class="mb-6">
        <UForm :state="state" @submit="onSubmit" class="space-y-4">
          <UFormField
            label="Application Number"
            required
            name="application_no"
            help="Enter the application number you received after submission"
          >
            <UInput
              v-model="state.application_no"
              placeholder="e.g., ADM-2025-001234"
              :disabled="loading"
              size="lg"
            />
          </UFormField>

          <UFormField
            label="Date of Birth"
            required
            name="date_of_birth"
            help="Enter the applicant's date of birth"
          >
            <UInput
              v-model="state.date_of_birth"
              type="date"
              :disabled="loading"
              size="lg"
            />
          </UFormField>

          <div class="flex gap-4">
            <UButton
              type="submit"
              color="primary"
              :loading="loading"
              :disabled="loading"
              icon="i-lucide-search"
              size="lg"
            >
              Check Status
            </UButton>

            <UButton
              v-if="searchPerformed"
              type="button"
              color="secondary"
              variant="outline"
              :disabled="loading"
              @click="resetSearch"
              size="lg"
            >
              New Search
            </UButton>
          </div>
        </UForm>
      </UCard>

      <!-- Loading State -->
      <UCard v-if="loading" class="mb-6">
        <div class="text-center py-8">
          <UIcon
            name="i-lucide-loader-2"
            class="h-8 w-8 animate-spin mx-auto"
          />
          <p class="text-gray-500 mt-2">Checking application status...</p>
        </div>
      </UCard>

      <!-- Result Card -->
      <UCard v-if="searchPerformed && applicationResult && !loading">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Application Details</h2>
            <UBadge
              :color="getStatusColor(applicationResult.status)"
              size="lg"
              variant="soft"
            >
              <UIcon
                :name="getStatusIcon(applicationResult.status)"
                class="h-4 w-4 mr-1"
              />
              {{ applicationResult.status.toUpperCase() }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Application Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">Application Number</p>
              <p class="font-semibold">
                {{ applicationResult.application_no }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Applicant Name</p>
              <p class="font-semibold">
                {{ applicationResult.applicant_name }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Applied Date</p>
              <p class="font-semibold">
                {{
                  new Date(applicationResult.applied_date).toLocaleDateString()
                }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Academic Session</p>
              <p class="font-semibold">{{ applicationResult.session }}</p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Applied Class</p>
              <p class="font-semibold">{{ applicationResult.grade }}</p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Status</p>
              <p class="font-semibold capitalize">
                {{ applicationResult.status }}
              </p>
            </div>
          </div>

          <!-- Status Note -->
          <UAlert
            v-if="applicationResult.status_note"
            :title="
              applicationResult.status === 'pending'
                ? 'Under Review'
                : 'Status Update'
            "
            :description="applicationResult.status_note"
            :icon="getStatusIcon(applicationResult.status)"
            :color="getStatusColor(applicationResult.status)"
            variant="soft"
          />

          <!-- Additional Info based on status -->
          <div
            v-if="applicationResult.status === 'accepted'"
            class="bg-green-50 rounded-lg p-4"
          >
            <h3 class="font-semibold text-green-900 mb-2">
              Congratulations! 🎉
            </h3>
            <p class="text-sm text-green-800">
              Your application has been accepted. Please wait for further
              instructions regarding document submission and fee payment.
            </p>
          </div>

          <div
            v-if="applicationResult.status === 'admitted'"
            class="bg-blue-50 rounded-lg p-4"
          >
            <h3 class="font-semibold text-blue-900 mb-2">
              Welcome to Our Institute! 🎓
            </h3>
            <p class="text-sm text-blue-800">
              You have been successfully admitted. Please contact the admission
              office for your student ID and class schedule.
            </p>
          </div>

          <div
            v-if="applicationResult.status === 'rejected'"
            class="bg-red-50 rounded-lg p-4"
          >
            <h3 class="font-semibold text-red-900 mb-2">
              Application Not Accepted
            </h3>
            <p class="text-sm text-red-800">
              Unfortunately, we are unable to accept your application at this
              time. You may contact the admission office for more information.
            </p>
          </div>
        </div>

        <template #footer>
          <div class="text-sm text-gray-500">
            <p>
              For any queries, please contact the admission office with your
              application number.
            </p>
          </div>
        </template>
      </UCard>

      <!-- Info Alert -->
      <UAlert
        title="Note"
        description="This is a mock status check page. The actual API integration will be implemented when the backend endpoint is available."
        icon="i-lucide-info"
        color="info"
        variant="soft"
        class="mt-6"
      />

      <!-- Help Section -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600 mb-3">Need help?</p>
        <UButton
          to="/public/admission"
          color="secondary"
          variant="outline"
          icon="i-lucide-arrow-left"
        >
          Back to Admission Portal
        </UButton>
      </div>
    </div>
  </UContainer>
</template>
