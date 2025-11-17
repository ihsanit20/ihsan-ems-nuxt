<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "ভর্তি - অনলাইনে আবেদন",
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
        <h1 class="text-3xl font-bold mb-2">অনলাইন ভর্তি</h1>
        <p class="text-gray-600">
          আমাদের অনলাইন ভর্তি পোর্টালে স্বাগতম। দয়া করে নির্দেশনাগুলো পড়ে আপনার
          পছন্দের শ্রেণিতে ভর্তির জন্য আবেদন করুন।
        </p>
      </div>

      <!-- Guidelines Card -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-info" class="h-5 w-5" />
            ভর্তির নির্দেশনা
          </h2>
        </template>

        <div class="space-y-3 text-sm text-gray-700">
          <p>
            <strong>১) যোগ্যতা:</strong> যে শ্রেণিতে ভর্তি করতে চান, তার বয়স ও
            শিক্ষাগত শর্ত পূরণ হচ্ছে কিনা নিশ্চিত করুন।
          </p>
          <p>
            <strong>২) নথিপত্র:</strong> প্রয়োজনীয় কাগজপত্র প্রস্তুত রাখুন
            (জন্মসনদ, পূর্বের ফলাফল ইত্যাদি)।
          </p>
          <p>
            <strong>৩) আবেদন:</strong> অনলাইন ফর্মটি মনোযোগ দিয়ে পূরণ করুন।
            তারকা (*) চিহ্নিত ঘরগুলো বাধ্যতামূলক।
          </p>
          <p>
            <strong>৪) পর্যালোচনা:</strong> আপনার আবেদনটি ভর্তি কমিটি পর্যালোচনা
            করবে। ফলাফল সম্পর্কে আপনাকে জানানো হবে।
          </p>
          <p>
            <strong>৫) স্ট্যাটাস দেখুন:</strong> আবেদন নম্বর ও জন্মতারিখ ব্যবহার
            করে যেকোনো সময় স্ট্যাটাস দেখতে পারবেন।
          </p>
        </div>
      </UCard>

      <!-- Available Sessions -->
      <UCard v-if="!metaLoading" class="mb-6">
        <template #header>
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="h-5 w-5" />
            উপলব্ধ সেশন ও শ্রেণি
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
              সময়কাল: {{ new Date(session.start_date).toLocaleDateString() }} -
              {{ new Date(session.end_date).toLocaleDateString() }}
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
                {{ sg.grade?.name || `শ্রেণি ${sg.grade_id}` }}
                <span v-if="sg.capacity" class="ml-1">
                  ({{ sg.capacity }} টি আসন)
                </span>
              </UBadge>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <UIcon name="i-lucide-alert-circle" class="h-8 w-8 mx-auto mb-2" />
          <p>এই মুহূর্তে কোনো সক্রিয় ভর্তি সেশন নেই।</p>
        </div>
      </UCard>

      <!-- Loading State -->
      <UCard v-else class="mb-6">
        <div class="text-center py-8">
          <UIcon
            name="i-lucide-loader-2"
            class="h-8 w-8 animate-spin mx-auto"
          />
          <p class="text-gray-500 mt-2">ভর্তির তথ্য লোড হচ্ছে...</p>
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
          অনলাইনে আবেদন
        </UButton>

        <UButton
          to="/public/admission/status"
          color="secondary"
          variant="outline"
          size="lg"
          icon="i-lucide-search"
        >
          স্ট্যাটাস দেখুন
        </UButton>
      </div>

      <!-- Help Text -->
      <p class="text-center text-sm text-gray-500 mt-6">
        সহায়তা লাগলে অফিস সময়ে ভর্তি অফিসে যোগাযোগ করুন।
      </p>
    </div>
  </UContainer>
</template>
