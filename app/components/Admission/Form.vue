<!-- components/AdmissionForm.vue -->
<script setup lang="ts">
const props = defineProps<{
  mode?: "public" | "admin"; // public=online, admin=offline
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}>();

const emit = defineEmits<{
  (e: "submit", payload: any): void;
  (e: "cancel"): void;
}>();

const mode = computed(() => props.mode ?? "public");
const appliedVia = computed(() =>
  mode.value === "admin" ? "offline" : "online"
);

const applicationType = ref<"new" | "re_admission">("new");

function forwardSubmit(payload: any) {
  emit("submit", payload);
}
</script>

<template>
  <div class="space-y-4">
    <!-- Type switch (common) -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Application Type</h2>
      </template>

      <URadioGroup
        v-model="applicationType"
        :items="[
          { label: 'New Admission', value: 'new' },
          {
            label: 'Re-admission (Existing Student)',
            value: 're_admission',
          },
        ]"
      />
    </UCard>

    <!-- Child form -->
    <AdmissionFormNew
      v-if="applicationType === 'new'"
      :applied-via="appliedVia"
      :saving="saving"
      :submit-label="submitLabel"
      :cancel-label="cancelLabel"
      :show-cancel="showCancel"
      @submit="forwardSubmit"
      @cancel="emit('cancel')"
    />

    <AdmissionFormReadmit
      v-else
      :applied-via="appliedVia"
      :saving="saving"
      :submit-label="submitLabel"
      :cancel-label="cancelLabel"
      :show-cancel="showCancel"
      @submit="forwardSubmit"
      @cancel="emit('cancel')"
    />
  </div>
</template>
