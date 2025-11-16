<script setup lang="ts">
import { storeToRefs } from "pinia";

definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

useHead({ title: "Application Details" });

const route = useRoute();
const id = computed(() => Number(route.params.id));
const store = useAdmissionApplicationStore();
const { current, loading, error: storeError } = storeToRefs(store);
const toast = useToast();
const router = useRouter();

function statusColor(status?: string) {
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

function statusIcon(status?: string) {
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

function formatDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

function formatAddress(a?: any) {
  if (!a) return "-";
  const parts = [
    a.house,
    a.road,
    a.village,
    a.post_office,
    a.upazila,
    a.district,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}

onMounted(async () => {
  if (!id.value || Number.isNaN(id.value)) {
    toast.add({
      title: "Invalid ID",
      description: "No application id provided",
      color: "error",
    });
    router.replace("/guardian/admissions/applications");
    return;
  }
  try {
    await store.fetchOne(id.value);
  } catch (e: any) {
    toast.add({
      title: "Failed to load",
      description:
        e?.data?.message || e?.message || "Could not load application",
      color: "error",
    });
  }
});
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Application Details</h1>
        <p class="text-sm text-gray-500">
          View your submitted application information.
        </p>
      </div>
      <UButton
        color="secondary"
        variant="outline"
        icon="i-lucide-arrow-left"
        to="/guardian/admissions/applications"
        >Back to list</UButton
      >
    </div>

    <UAlert
      v-if="storeError"
      title="Error"
      :description="storeError"
      color="error"
      icon="i-lucide-alert-circle"
      variant="soft"
      class="mb-4"
    />

    <!-- Loading -->
    <UCard v-if="loading" class="mb-6">
      <div class="py-10 text-center text-gray-500">
        <UIcon
          name="i-lucide-loader-2"
          class="h-6 w-6 animate-spin inline-block mr-2"
        />
        Loading application...
      </div>
    </UCard>

    <template v-else>
      <!-- Top Summary Card -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <div class="text-sm text-gray-500">Application No</div>
              <div class="text-xl font-semibold">
                {{ current?.application_no }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge
                :color="statusColor(current?.status)"
                size="lg"
                variant="soft"
              >
                <UIcon
                  :name="statusIcon(current?.status)"
                  class="h-4 w-4 mr-1"
                />
                {{ current?.status?.toUpperCase() }}
              </UBadge>
            </div>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div class="text-sm text-gray-500">Session</div>
            <div class="font-medium">{{ current?.session?.name || "-" }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Class</div>
            <div class="font-medium">
              {{
                current?.session_grade?.grade?.name ||
                `#${current?.session_grade_id}`
              }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Applied On</div>
            <div class="font-medium">{{ formatDate(current?.created_at) }}</div>
          </div>
        </div>
      </UCard>

      <!-- Basic Info -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-lg font-semibold">Student Information</h2>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div class="text-sm text-gray-500">Applicant Name</div>
            <div class="font-medium">{{ current?.applicant_name }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Gender</div>
            <div class="font-medium capitalize">
              {{ current?.gender || "-" }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Date of Birth</div>
            <div class="font-medium">
              {{ formatDate(current?.date_of_birth) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Student Phone</div>
            <div class="font-medium">{{ current?.student_phone || "-" }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Student Email</div>
            <div class="font-medium">{{ current?.student_email || "-" }}</div>
          </div>
        </div>
      </UCard>

      <!-- Guardian & Parents Info -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-lg font-semibold">Parents & Guardian</h2>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div class="text-sm text-gray-500">Father's Name</div>
            <div class="font-medium">{{ current?.father_name || "-" }}</div>
            <div class="text-sm text-gray-500 mt-2">Phone</div>
            <div class="font-medium">{{ current?.father_phone || "-" }}</div>
            <div class="text-sm text-gray-500 mt-2">Occupation</div>
            <div class="font-medium">
              {{ current?.father_occupation || "-" }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Mother's Name</div>
            <div class="font-medium">{{ current?.mother_name || "-" }}</div>
            <div class="text-sm text-gray-500 mt-2">Phone</div>
            <div class="font-medium">{{ current?.mother_phone || "-" }}</div>
            <div class="text-sm text-gray-500 mt-2">Occupation</div>
            <div class="font-medium">
              {{ current?.mother_occupation || "-" }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Guardian</div>
            <div class="font-medium">
              {{ current?.guardian_name || "-"
              }}<span v-if="current?.guardian_type">
                ({{ current?.guardian_type }})</span
              >
            </div>
            <div class="text-sm text-gray-500 mt-2">Phone</div>
            <div class="font-medium">{{ current?.guardian_phone || "-" }}</div>
            <div class="text-sm text-gray-500 mt-2">Relation</div>
            <div class="font-medium">
              {{ current?.guardian_relation || "-" }}
            </div>
          </div>
        </div>
      </UCard>

      <!-- Addresses -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-lg font-semibold">Addresses</h2>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div class="text-sm text-gray-500">Present Address</div>
            <div class="font-medium">
              {{ formatAddress(current?.present_address) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Permanent Address</div>
            <div class="font-medium">
              {{ formatAddress(current?.permanent_address) }}
            </div>
          </div>
        </div>
      </UCard>

      <!-- Previous & Residential -->
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-lg font-semibold">Additional Information</h2>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div class="text-sm text-gray-500">Previous Institution</div>
            <div class="font-medium">
              {{ current?.previous_institution_name || "-" }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Previous Class</div>
            <div class="font-medium">{{ current?.previous_class || "-" }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Previous Result</div>
            <div class="font-medium">{{ current?.previous_result || "-" }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Residential Type</div>
            <div class="font-medium capitalize">
              {{ current?.residential_type || "-" }}
            </div>
          </div>
        </div>
      </UCard>

      <!-- Admitted Info -->
      <UCard
        v-if="current?.status === 'admitted' && current?.admitted_student"
        class="mb-6"
      >
        <template #header>
          <h2 class="text-lg font-semibold">Admission Info</h2>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div class="text-sm text-gray-500">Student Code</div>
            <div class="font-medium">
              {{ current?.admitted_student?.student_code }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Student Name (BN)</div>
            <div class="font-medium">
              {{ current?.admitted_student?.name_bn || "-" }}
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UContainer>
</template>
