<script setup lang="ts">
import { storeToRefs } from "pinia";

definePageMeta({
  layout: "admin",
  middleware: "auth",
  roles: ["Owner", "Admin", "Developer"],
});

useHead({ title: "Application Details" });

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));

const apps = useAdmissionApplicationStore();
const { current, loading, error, saving } = storeToRefs(apps);

const sections = useSectionStore();
const toast = useToast();

const statusForm = reactive({
  status: "" as "pending" | "accepted" | "rejected" | "admitted",
  status_note: "",
});

const admitOpen = ref(false);
const admitForm = reactive({
  section_id: null as number | null,
  roll_no: "",
  admission_date: new Date().toISOString().split("T")[0],
});

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
    return d as string;
  }
}

onMounted(async () => {
  if (!id.value || Number.isNaN(id.value)) {
    toast.add({
      title: "Invalid",
      description: "Invalid application id",
      color: "error",
    });
    router.replace("/admin/admissions/applications");
    return;
  }
  try {
    await apps.fetchOne(id.value);
    if (apps.current?.session_grade_id) {
      await sections.fetchListBySession(apps.current.session_grade_id);
    }
    statusForm.status = (apps.current?.status as any) || "pending";
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description:
        e?.data?.message || e?.message || "Could not load application",
      color: "error",
    });
  }
});

const sectionOptions = computed(() => {
  const sgId = apps.current?.session_grade_id || 0;
  return sections
    .itemsForSession(sgId)
    .map((s) => ({ label: s.name, value: s.id }));
});

async function submitStatus() {
  if (!id.value) return;
  try {
    await apps.updateStatus(
      id.value,
      statusForm.status,
      statusForm.status_note || undefined
    );
    toast.add({
      title: "Updated",
      description: "Status updated",
      color: "success",
    });
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description: e?.data?.message || e?.message || "Could not update status",
      color: "error",
    });
  }
}

async function submitAdmit() {
  if (!id.value) return;
  try {
    await apps.admit(id.value, {
      section_id: admitForm.section_id || undefined,
      roll_no: admitForm.roll_no || undefined,
      admission_date: admitForm.admission_date || undefined,
    });
    toast.add({
      title: "Admitted",
      description: "Student admitted successfully",
      color: "success",
    });
    admitOpen.value = false;
    await apps.fetchOne(id.value);
  } catch (e: any) {
    toast.add({
      title: "Failed",
      description: e?.data?.message || e?.message || "Could not admit student",
      color: "error",
    });
  }
}
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Application Details</h1>
        <p class="text-sm text-gray-500">Review and manage this application.</p>
      </div>
      <UButton
        color="secondary"
        variant="outline"
        icon="i-lucide-arrow-left"
        to="/admin/admissions/applications"
        >Back</UButton
      >
    </div>

    <UAlert
      v-if="error"
      title="Error"
      :description="error"
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
        Loading...
      </div>
    </UCard>

    <template v-else>
      <!-- Header summary -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <div class="text-sm text-gray-500">Application No</div>
              <div class="text-xl font-semibold">
                {{ current?.application_no }}
              </div>
            </div>
            <UBadge
              :color="statusColor(current?.status)"
              variant="soft"
              size="lg"
            >
              <UIcon :name="statusIcon(current?.status)" class="h-4 w-4 mr-1" />
              {{ current?.status?.toUpperCase() }}
            </UBadge>
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
        <template #header
          ><h2 class="text-lg font-semibold">Basic Information</h2></template
        >
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
            <div class="text-sm text-gray-500">Phone</div>
            <div class="font-medium">{{ current?.student_phone || "-" }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Email</div>
            <div class="font-medium">{{ current?.student_email || "-" }}</div>
          </div>
        </div>
      </UCard>

      <!-- Parents & Guardian -->
      <UCard class="mb-6">
        <template #header
          ><h2 class="text-lg font-semibold">Parents & Guardian</h2></template
        >
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
        <template #header
          ><h2 class="text-lg font-semibold">Addresses</h2></template
        >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div class="text-sm text-gray-500">Present Address</div>
            <div class="font-medium">
              {{
                current?.present_address
                  ? [
                      current?.present_address?.house,
                      current?.present_address?.road,
                      current?.present_address?.village,
                      current?.present_address?.post_office,
                      current?.present_address?.upazila,
                      current?.present_address?.district,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "-"
              }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Permanent Address</div>
            <div class="font-medium">
              {{
                current?.permanent_address
                  ? [
                      current?.permanent_address?.house,
                      current?.permanent_address?.road,
                      current?.permanent_address?.village,
                      current?.permanent_address?.post_office,
                      current?.permanent_address?.upazila,
                      current?.permanent_address?.district,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "-"
              }}
            </div>
          </div>
        </div>
      </UCard>

      <!-- Previous & Notes / Status -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <UCard class="md:col-span-2">
          <template #header
            ><h2 class="text-lg font-semibold">
              Previous / Additional
            </h2></template
          >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div class="text-sm text-gray-500">Previous Institution</div>
              <div class="font-medium">
                {{ current?.previous_institution_name || "-" }}
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Previous Class</div>
              <div class="font-medium">
                {{ current?.previous_class || "-" }}
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Result</div>
              <div class="font-medium">
                {{ current?.previous_result || "-" }}
              </div>
            </div>
            <div>
              <div class="text-sm text-gray-500">Residential Type</div>
              <div class="font-medium capitalize">
                {{ current?.residential_type || "-" }}
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header
            ><h2 class="text-lg font-semibold">Update Status</h2></template
          >
          <div class="space-y-4">
            <UFormField label="Status">
              <USelect
                v-model="statusForm.status"
                :options="[
                  { label: 'Pending', value: 'pending' },
                  { label: 'Accepted', value: 'accepted' },
                  { label: 'Admitted', value: 'admitted' },
                  { label: 'Rejected', value: 'rejected' },
                ]"
              />
            </UFormField>
            <UFormField label="Note">
              <UTextarea
                v-model="statusForm.status_note"
                placeholder="Optional note"
              />
            </UFormField>
            <div class="flex justify-end">
              <UButton
                :loading="saving"
                :disabled="saving"
                icon="i-lucide-save"
                @click="submitStatus"
                >Save</UButton
              >
            </div>
          </div>
        </UCard>
      </div>

      <!-- Admit student -->
      <UCard class="mb-10">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <div class="text-sm text-gray-500">Admit Student</div>
            <div class="text-sm text-gray-500">
              Create student record & enrollment from this application.
            </div>
          </div>
          <UButton
            color="primary"
            icon="i-lucide-check"
            :disabled="current?.status === 'admitted'"
            @click="admitOpen = true"
            >Admit</UButton
          >
        </div>
      </UCard>

      <UModal v-model="admitOpen">
        <UCard>
          <template #header
            ><h3 class="text-lg font-semibold">Admit Student</h3></template
          >
          <div class="space-y-4">
            <UAlert
              v-if="!current?.session_grade_id"
              title="Missing class"
              description="Class information not available on this application."
              color="warning"
              variant="soft"
            />
            <UFormField label="Section">
              <USelect
                v-model="admitForm.section_id"
                :options="sectionOptions"
                :disabled="!current?.session_grade_id"
                placeholder="Select section"
                clearable
              />
            </UFormField>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Roll No">
                <UInput v-model="admitForm.roll_no" placeholder="Optional" />
              </UFormField>
              <UFormField label="Admission Date">
                <UInput v-model="admitForm.admission_date" type="date" />
              </UFormField>
            </div>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="outline"
                color="secondary"
                @click="admitOpen = false"
                >Cancel</UButton
              >
              <UButton
                color="primary"
                :loading="saving"
                :disabled="saving || !current?.session_grade_id"
                @click="submitAdmit"
                >Admit</UButton
              >
            </div>
          </template>
        </UCard>
      </UModal>
    </template>
  </UContainer>
</template>
