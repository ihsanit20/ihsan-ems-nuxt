<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { AddressData } from "~/stores/address";

definePageMeta({
  layout: "admin",
  middleware: "auth",
  roles: ["Owner", "Admin", "Developer"],
});

useHead({ title: "Offline Application Entry" });

const router = useRouter();
const toast = useToast();

const sessions = useSessionStore();
const { items: sessionItems, loading: loadingSessions } = storeToRefs(sessions);

const apps = useAdmissionApplicationStore();
const { saving, meta } = storeToRefs(apps);

// Address stores - we'll use filters for separate present/permanent tracking
const addressStore = useAddressStore();
const { divisionItems, loadingDivisions, loadingDistricts, loadingAreas } =
  storeToRefs(addressStore);

// Separate district/area lists for present and permanent
const presentDistricts = ref<any[]>([]);
const presentAreas = ref<any[]>([]);
const permanentDistricts = ref<any[]>([]);
const permanentAreas = ref<any[]>([]);

const form = reactive({
  session_grade_id: null as number | null,
  applicant_name: "",
  gender: "",
  date_of_birth: "",
  student_phone: "",
  student_email: "",
  father_name: "",
  father_phone: "",
  father_occupation: "",
  mother_name: "",
  mother_phone: "",
  mother_occupation: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_relation: "",
  present_address: {
    division_id: undefined,
    district_id: undefined,
    area_id: undefined,
    village_house_holding: "",
  } as AddressData,
  permanent_address: {
    division_id: undefined,
    district_id: undefined,
    area_id: undefined,
    village_house_holding: "",
  } as AddressData,
  is_present_same_as_permanent: false,
  residential_type: "non_residential" as
    | "residential"
    | "new_musafir"
    | "non_residential",
  previous_institution_name: "",
  previous_class: "",
  previous_result: "",
});

// Watch for cascading dropdown changes - Present Address
watch(
  () => form.present_address.division_id,
  async (newVal) => {
    form.present_address.district_id = undefined;
    form.present_address.area_id = undefined;
    if (newVal) {
      await addressStore.fetchDistricts(newVal);
      presentDistricts.value = addressStore
        .getDistrictsByDivision(newVal)
        .map((d) => ({ label: d.name, value: d.id }));
    } else {
      presentDistricts.value = [];
    }
    presentAreas.value = [];
  }
);

watch(
  () => form.present_address.district_id,
  async (newVal) => {
    form.present_address.area_id = undefined;
    if (newVal) {
      await addressStore.fetchAreas(newVal);
      presentAreas.value = addressStore
        .getAreasByDistrict(newVal)
        .map((a) => ({ label: a.name, value: a.id }));
    } else {
      presentAreas.value = [];
    }
  }
);

// Watch for cascading dropdown changes - Permanent Address
watch(
  () => form.permanent_address.division_id,
  async (newVal) => {
    form.permanent_address.district_id = undefined;
    form.permanent_address.area_id = undefined;
    if (newVal) {
      await addressStore.fetchDistricts(newVal);
      permanentDistricts.value = addressStore
        .getDistrictsByDivision(newVal)
        .map((d) => ({ label: d.name, value: d.id }));
    } else {
      permanentDistricts.value = [];
    }
    permanentAreas.value = [];
  }
);

watch(
  () => form.permanent_address.district_id,
  async (newVal) => {
    form.permanent_address.area_id = undefined;
    if (newVal) {
      await addressStore.fetchAreas(newVal);
      permanentAreas.value = addressStore
        .getAreasByDistrict(newVal)
        .map((a) => ({ label: a.name, value: a.id }));
    } else {
      permanentAreas.value = [];
    }
  }
);

// Watch for "same as present" checkbox
watch(
  () => form.is_present_same_as_permanent,
  async (isSame) => {
    if (isSame) {
      form.permanent_address = { ...form.present_address };
      permanentDistricts.value = [...presentDistricts.value];
      permanentAreas.value = [...presentAreas.value];
    }
  }
);

onMounted(async () => {
  if (!sessionItems.value.length) await sessions.fetchList();
  if (!meta.value || !(meta.value as any).session_grades?.length)
    await apps.fetchMeta();

  // Load divisions
  await addressStore.fetchDivisions();
});

const sessionOptions = computed(() => {
  // Flatten from meta.session_grades, label: Session — Class
  const grades = (meta.value?.session_grades || []) as any[];
  const opts: { label: string; value: number }[] = [];
  for (const sg of grades) {
    const sess = sessionItems.value.find(
      (s) => s.id === sg.academic_session_id
    ) as any;
    const sessionName = sess?.name || `Session #${sg.academic_session_id}`;
    const gradeName = sg?.grade?.name || `Class #${sg?.grade_id}`;
    opts.push({ label: `${sessionName} — ${gradeName}`, value: sg.id });
  }
  return opts;
});

async function submit() {
  if (!form.session_grade_id) {
    toast.add({
      title: "Missing class",
      description: "Please select session & class",
      color: "warning",
    });
    return;
  }
  try {
    const payload: any = { ...form, applied_via: "offline" };
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
        >Back</UButton
      >
    </div>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Applicant Information</h2>
      </template>

      <div class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UFormField label="Session & Class" required>
            <USelect
              v-model="form.session_grade_id"
              :loading="loadingSessions"
              :options="sessionOptions"
              placeholder="Select session and class"
            />
          </UFormField>
          <UFormField label="Applicant Name" required>
            <UInput
              v-model="form.applicant_name"
              placeholder="Applicant full name"
            />
          </UFormField>
          <UFormField label="Gender">
            <USelect
              v-model="form.gender"
              :options="[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Other', value: 'other' },
              ]"
            />
          </UFormField>
          <UFormField label="Date of Birth">
            <UInput v-model="form.date_of_birth" type="date" />
          </UFormField>
          <UFormField label="Student Phone">
            <UInput v-model="form.student_phone" placeholder="01XXXXXXXXX" />
          </UFormField>
          <UFormField label="Student Email">
            <UInput
              v-model="form.student_email"
              type="email"
              placeholder="name@example.com"
            />
          </UFormField>
        </div>

        <UDivider label="Parents & Guardian" />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-4">
            <UFormField label="Father's Name"
              ><UInput v-model="form.father_name"
            /></UFormField>
            <UFormField label="Phone"
              ><UInput v-model="form.father_phone"
            /></UFormField>
            <UFormField label="Occupation"
              ><UInput v-model="form.father_occupation"
            /></UFormField>
          </div>
          <div class="space-y-4">
            <UFormField label="Mother's Name"
              ><UInput v-model="form.mother_name"
            /></UFormField>
            <UFormField label="Phone"
              ><UInput v-model="form.mother_phone"
            /></UFormField>
            <UFormField label="Occupation"
              ><UInput v-model="form.mother_occupation"
            /></UFormField>
          </div>
          <div class="space-y-4">
            <UFormField label="Guardian Name"
              ><UInput v-model="form.guardian_name"
            /></UFormField>
            <UFormField label="Phone"
              ><UInput v-model="form.guardian_phone"
            /></UFormField>
            <UFormField label="Relation"
              ><UInput v-model="form.guardian_relation"
            /></UFormField>
          </div>
        </div>

        <UDivider label="Addresses" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Present Address -->
          <div class="space-y-4">
            <h3 class="font-medium">Present Address</h3>
            <UFormField label="Division" required>
              <USelect
                v-model="form.present_address.division_id"
                :items="divisionItems"
                :loading="loadingDivisions"
                placeholder="Select division"
                :popper="{ strategy: 'fixed' }"
              />
            </UFormField>
            <UFormField label="District" required>
              <USelect
                v-model="form.present_address.district_id"
                :items="presentDistricts"
                :loading="loadingDistricts"
                :disabled="!form.present_address.division_id"
                placeholder="Select district"
                :popper="{ strategy: 'fixed' }"
              />
            </UFormField>
            <UFormField label="Area/Upazila">
              <USelect
                v-model="form.present_address.area_id"
                :items="presentAreas"
                :loading="loadingAreas"
                :disabled="!form.present_address.district_id"
                placeholder="Select area"
                :popper="{ strategy: 'fixed' }"
              />
            </UFormField>
            <UFormField label="Village/House/Holding">
              <UTextarea
                v-model="form.present_address.village_house_holding"
                placeholder="Village, House no, Holding no, etc."
                :rows="3"
                :maxlength="500"
              />
            </UFormField>
          </div>

          <!-- Permanent Address -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-medium">Permanent Address</h3>
              <UFormField>
                <div class="flex items-center gap-2">
                  <USwitch v-model="form.is_present_same_as_permanent" />
                  <span class="text-sm text-gray-600">Same as present</span>
                </div>
              </UFormField>
            </div>
            <UFormField label="Division" required>
              <USelect
                v-model="form.permanent_address.division_id"
                :items="divisionItems"
                :loading="loadingDivisions"
                :disabled="form.is_present_same_as_permanent"
                placeholder="Select division"
                :popper="{ strategy: 'fixed' }"
              />
            </UFormField>
            <UFormField label="District" required>
              <USelect
                v-model="form.permanent_address.district_id"
                :items="permanentDistricts"
                :loading="loadingDistricts"
                :disabled="
                  !form.permanent_address.division_id ||
                  form.is_present_same_as_permanent
                "
                placeholder="Select district"
                :popper="{ strategy: 'fixed' }"
              />
            </UFormField>
            <UFormField label="Area/Upazila">
              <USelect
                v-model="form.permanent_address.area_id"
                :items="permanentAreas"
                :loading="loadingAreas"
                :disabled="
                  !form.permanent_address.district_id ||
                  form.is_present_same_as_permanent
                "
                placeholder="Select area"
                :popper="{ strategy: 'fixed' }"
              />
            </UFormField>
            <UFormField label="Village/House/Holding">
              <UTextarea
                v-model="form.permanent_address.village_house_holding"
                placeholder="Village, House no, Holding no, etc."
                :rows="3"
                :maxlength="500"
                :disabled="form.is_present_same_as_permanent"
              />
            </UFormField>
          </div>
        </div>

        <UDivider label="Other Details" />
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UFormField label="Residential Type">
            <USelect
              v-model="form.residential_type"
              :options="[
                { label: 'Day', value: 'day' },
                { label: 'Residential', value: 'residential' },
              ]"
            />
          </UFormField>
          <UFormField label="Previous Institution"
            ><UInput v-model="form.previous_institution_name"
          /></UFormField>
          <UFormField label="Previous Class"
            ><UInput v-model="form.previous_class"
          /></UFormField>
          <UFormField label="Previous Result"
            ><UInput v-model="form.previous_result"
          /></UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            variant="outline"
            color="secondary"
            to="/admin/admission/applications"
            >Cancel</UButton
          >
          <UButton
            color="primary"
            :loading="saving"
            :disabled="saving"
            icon="i-lucide-save"
            @click="submit"
            >Create</UButton
          >
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
