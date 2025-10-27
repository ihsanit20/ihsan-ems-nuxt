<script setup lang="ts">
import { reactive, watch, computed } from "vue";
import { useUserStore } from "@/stores/user";
import { useToast } from "#imports";
import type { FormError, FormSubmitEvent } from "@nuxt/ui";

const props = defineProps<{
  open: boolean;
  roles: string[];
}>();
const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "created"): void;
}>();

const store = useUserStore();
const toast = useToast();

const modalOpen = computed({
  get: () => props.open,
  set: (v) => emit("update:open", v),
});

type FormState = {
  name: string;
  phone: string;
  email?: string | null;
  role?: string | null;
  password?: string | null;
  photo?: File | null;
};
const state = reactive<FormState>({
  name: "",
  phone: "",
  email: "",
  role: null,
  password: "",
  photo: null,
});

function reset() {
  state.name = "";
  state.phone = "";
  state.email = "";
  state.role = null;
  state.password = "";
  state.photo = null;
}
watch(modalOpen, (v) => {
  if (!v) reset();
});

function validate(s: FormState): FormError[] {
  const e: FormError[] = [];
  if (!s.name?.trim()) e.push({ name: "name", message: "Name is required" });
  if (!s.phone?.trim()) e.push({ name: "phone", message: "Phone is required" });
  return e;
}

async function onSubmit(_: FormSubmitEvent<FormState>) {
  try {
    await store.create({ ...state });
    emit("created");
    modalOpen.value = false;
  } catch {
    toast.add({
      color: "error",
      title: "Failed",
      description: store.error || "Something went wrong",
    });
  }
}
</script>

<template>
  <UModal
    :open="modalOpen"
    @update:open="emit('update:open', $event)"
    title="Add User"
    :prevent-close="store.saving"
    :closeable="!store.saving"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm
        :state="state"
        :validate="validate"
        id="user-add-form"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" placeholder="Full name" />
        </UFormField>

        <UFormField label="Phone" name="phone">
          <UInput v-model="state.phone" placeholder="e.g., 017..." />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="name@example.com"
          />
        </UFormField>

        <UFormField label="Role" name="role">
          <USelect
            v-model="state.role"
            :items="[
              { label: '(none)', value: null },
              ...props.roles.map((r) => ({ label: r, value: r })),
            ]"
            placeholder="Select role"
          />
        </UFormField>

        <UFormField label="Password (optional)" name="password">
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
          />
        </UFormField>

        <UFormField label="Photo" name="photo">
          <input
            type="file"
            class="block w-full text-sm"
            @change="(e:any)=>{ state.photo = e?.target?.files?.[0] || null }"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Cancel"
        color="neutral"
        variant="outline"
        @click="
          () => {
            close();
            emit('update:open', false);
          }
        "
      />
      <UButton
        label="Create"
        color="primary"
        :loading="store.saving"
        type="submit"
        form="user-add-form"
      />
    </template>
  </UModal>
</template>
