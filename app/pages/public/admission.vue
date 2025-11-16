<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Admission - Apply Online",
});

const store = useAdmissionApplicationStore();
const { meta, metaLoading } = storeToRefs(store);

onMounted(async () => {
  try {
    await store.fetchMeta();
  } catch (error) {
    console.error("Failed to load admission meta:", error);
  }
});

const activeSessions = computed(() => {
  return meta.value?.sessions?.filter((s) => s.is_active) || [];
});

const sessionGrades = computed(() => {
  return meta.value?.session_grades || [];
});
</script>

<template>
  <UContainer>
    <div class="mx-auto max-w-4xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Online Admission</h1>
        <p class="text-gray-600">
          Welcome to our online admission portal. Please review the guidelines
          and apply for admission to your preferred class.
        </p>
      </div>

      <!-- Guidelines Card -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-info" class="h-5 w-5" />
            Admission Guidelines
          </h2>
        </template>

        <div class="space-y-3 text-sm text-gray-700">
          <p>
            <strong>1. Eligibility:</strong> Ensure your child meets the age
            and academic requirements for the desired class.
          </p>
          <p>
            <strong>2. Documents:</strong> Keep necessary documents ready
            (birth certificate, previous result, etc.).
          </p>
          <p>
            <strong>3. Application:</strong> Fill the online form carefully.
            All fields marked with * are mandatory.
          </p>
          <p>
            <strong>4. Review:</strong> Your application will be reviewed by
            our admission committee. You will be notified about the status.
          </p>
          <p>
            <strong>5. Status Check:</strong> You can check your application
            status anytime using your application number and date of birth.
          </p>
        </div>
      </UCard>

      <!-- Available Sessions -->
      <UCard v-if="!metaLoading" class="mb-6">
        <template #header>
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="h-5 w-5" />
            Available Sessions & Classes
          </h2>
        </template>

        <div v-if="activeSessions.length > 0" class="space-y-4">
          <div
            v-for="session in activeSessions"
            :key="session.id"
            class="border rounded-lg p-4"
          >
            <h3 class="font-semibold text-lg mb-2">{{ session.name }}</h3>
            <p class="text-sm text-gray-600 mb-3">
              Duration: {{ new Date(session.start_date).toLocaleDateString() }}
              - {{ new Date(session.end_date).toLocaleDateString() }}
            </p>

            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="sg in sessionGrades.filter(
                  (g) => g.academic_session_id === session.id
                )"
                :key="sg.id"
                color="primary"
                variant="soft"
              >
                {{ sg.grade?.name || `Grade ${sg.grade_id}` }}
                <span v-if="sg.capacity" class="ml-1">
                  ({{ sg.capacity }} seats)
                </span>
              </UBadge>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-alert-circle" class="h-8 w-8 mx-auto mb-2" />
          <p>No active admission sessions available at the moment.</p>
        </div>
      </UCard>

      <!-- Loading State -->
      <UCard v-else class="mb-6">
        <div class="text-center py-8">
          <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin mx-auto" />
          <p class="text-gray-500 mt-2">Loading admission information...</p>
        </div>
      </UCard>

      <!-- Action Buttons -->
      <div class="flex gap-4 justify-center">
        <UButton
          to="/public/admission/apply"
          color="primary"
          size="lg"
          icon="i-lucide-edit"
          :disabled="metaLoading || activeSessions.length === 0"
        >
          Apply Online
        </UButton>

        <UButton
          to="/public/admission/status"
          color="secondary"
          variant="outline"
          size="lg"
          icon="i-lucide-search"
        >
          Check Status
        </UButton>
      </div>

      <!-- Help Text -->
      <p class="text-center text-sm text-gray-500 mt-6">
        Need help? Contact our admission office during working hours.
      </p>
    </div>
  </UContainer>
</template>
