<!-- app/pages/admin/setup/institute/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { reactive, ref, onMounted, computed } from "vue";
import { useToast, useHead, useNuxtApp } from "#imports";
import { useInstituteStore, type InstituteProfile } from "~/stores/institute";

useHead({ title: "Institute Setup" });

const toast = useToast();
const { $api } = useNuxtApp();
const institute = useInstituteStore();

const brand = reactive<{ name: string; logoUrl: string | null }>({
  name: "",
  logoUrl: null,
});

const form = reactive<InstituteProfile>({
  names: { en: "", bn: "", ar: "" },
  contact: {
    address: "",
    phone: null,
    email: null,
    website: null,
    social: { facebook: null, youtube: null, whatsapp: null },
  },
});

const loading = ref(true);
const saving = computed(() => institute.saving);
const isEditing = ref(false);

const errors = reactive<Record<string, string>>({});

function resetFormFromStore() {
  const p = institute.profile;
  if (!p) return;

  form.names = {
    en: p.names?.en ?? "",
    bn: p.names?.bn ?? "",
    ar: p.names?.ar ?? "",
  };

  form.contact = {
    address: p.contact?.address ?? "",
    phone: p.contact?.phone ?? null,
    email: p.contact?.email ?? null,
    website: p.contact?.website ?? null,
    social: {
      facebook: p.contact?.social?.facebook ?? null,
      youtube: p.contact?.social?.youtube ?? null,
      whatsapp: p.contact?.social?.whatsapp ?? null,
    },
  };
}

async function loadBrand() {
  try {
    const meta = await $api<any>("/v1/tenant/meta");
    brand.name = meta?.name ?? "";
    brand.logoUrl = meta?.branding?.logoUrl ?? null;
  } catch {
    brand.name = "";
    brand.logoUrl = null;
  }
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k]);

  if (!form.contact.address || !form.contact.address.trim()) {
    errors["contact.address"] = "ঠিকানা প্রয়োজন";
  }
  const email = form.contact.email?.trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors["contact.email"] = "ইমেইল ঠিক নয়";
  }
  const urlFields: Array<[string, string | null | undefined]> = [
    ["contact.website", form.contact.website ?? ""],
    ["contact.social.facebook", form.contact.social?.facebook ?? ""],
    ["contact.social.youtube", form.contact.social?.youtube ?? ""],
    ["contact.social.whatsapp", form.contact.social?.whatsapp ?? ""],
  ];
  for (const [key, val] of urlFields) {
    const v = (val || "").toString().trim();
    if (v && !/^https?:\/\//i.test(v)) {
      errors[key] = "পূর্ণ URL দিন, যেমন https://example.com";
    }
  }
  return Object.keys(errors).length === 0;
}

async function handleSave() {
  if (!validate()) {
    toast.add({
      title: "ফর্মে ভুল আছে",
      description: "চেক করে আবার চেষ্টা করুন",
      color: "error",
    });
    return;
  }
  try {
    await institute.updateProfile({
      names: {
        en: form.names?.en || null,
        bn: form.names?.bn || null,
        ar: form.names?.ar || null,
      },
      contact: form.contact,
    });
    toast.add({ title: "সেভ হয়েছে", color: "success" });
    isEditing.value = false; // ✅ সেভ হলে এডিট মোড বন্ধ
  } catch (e: any) {
    toast.add({
      title: "সেভ ব্যর্থ",
      description: e?.data?.message || e?.message || "কিছু ভুল হয়েছে",
      color: "error",
    });
  }
}

function handleCancel() {
  resetFormFromStore();
  Object.keys(errors).forEach((k) => delete errors[k]);
  isEditing.value = false; // ✅ ক্যানসেলে এডিট মোড বন্ধ
}

function handlePrimaryClick() {
  if (!isEditing.value) {
    isEditing.value = true; // Edit → enable fields
  } else {
    // Save
    if (!saving.value) handleSave();
  }
}

onMounted(async () => {
  try {
    await Promise.all([institute.fetchProfile(), loadBrand()]);
    resetFormFromStore();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <UContainer class="max-w-5xl">
    <!-- Header -->
    <div class="flex items-center justify-between py-4">
      <div>
        <h1 class="text-2xl font-semibold">Institute Setup</h1>
        <p class="text-sm text-muted-foreground">প্রোফাইল তথ্য আপডেট করুন</p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Cancel: only in edit mode -->
        <UButton
          v-if="isEditing"
          variant="soft"
          color="neutral"
          :disabled="saving"
          @click="handleCancel"
        >
          <Icon name="i-heroicons-x-mark" class="h-5 w-5 mr-1" />
          Cancel
        </UButton>

        <!-- Edit / Save toggle -->
        <UButton :loading="saving" color="primary" @click="handlePrimaryClick">
          <Icon
            :name="
              isEditing ? 'i-heroicons-check' : 'i-heroicons-pencil-square'
            "
            class="h-5 w-5 mr-1"
          />
          {{ isEditing ? "Save changes" : "Edit" }}
        </UButton>
      </div>
    </div>

    <!-- Brand (read-only) -->
    <UCard class="my-4">
      <div class="flex items-center gap-4">
        <UAvatar
          :src="brand.logoUrl || undefined"
          size="xl"
          alt="Institute Logo"
        />
        <div class="min-w-0">
          <p class="text-lg font-medium truncate">{{ brand.name || "—" }}</p>
          <p class="text-xs text-muted-foreground">
            Name & Logo — centrally managed (read-only)
          </p>
        </div>
      </div>
    </UCard>

    <!-- Content -->
    <div v-if="loading" class="grid gap-4">
      <UCard>
        <USkeleton class="h-6 w-1/3 mb-3" />
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full mt-2" />
      </UCard>
      <UCard>
        <USkeleton class="h-6 w-1/4 mb-3" />
        <USkeleton class="h-32 w-full" />
      </UCard>
    </div>

    <div v-else class="grid gap-4">
      <!-- Names (optional) -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Names (optional)</h3>
          </div>
        </template>

        <div class="grid gap-3">
          <UFormGroup label="English name" :error="errors['names.en']">
            <UInput
              v-model="form.names!.en"
              :disabled="!isEditing || saving"
              placeholder="English Name: e.g., Al-Noor Madrasah"
              class="w-full"
            >
              <template #leading>
                <Icon name="i-heroicons-language" class="h-5 w-5" />
              </template>
            </UInput>
          </UFormGroup>

          <UFormGroup label="Bangla name" :error="errors['names.bn']">
            <UInput
              v-model="form.names!.bn"
              :disabled="!isEditing || saving"
              placeholder="বাংলা নাম: যেমন আল-নূর মাদরাসা"
              class="w-full"
            >
              <template #leading>
                <Icon name="i-heroicons-language" class="h-5 w-5" />
              </template>
            </UInput>
          </UFormGroup>

          <UFormGroup label="Arabic name" :error="errors['names.ar']">
            <UInput
              v-model="form.names!.ar"
              :disabled="!isEditing || saving"
              placeholder="مدرسة النور"
              dir="rtl"
              class="w-full"
            >
              <template #leading>
                <Icon name="i-heroicons-language" class="h-5 w-5" />
              </template>
            </UInput>
          </UFormGroup>
        </div>
      </UCard>

      <!-- Contact -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Contact</h3>
            <span class="text-xs text-muted-foreground">* address আবশ্যক</span>
          </div>
        </template>

        <div class="grid gap-3">
          <UFormGroup label="Address *" :error="errors['contact.address']">
            <UTextarea
              v-model="form.contact.address"
              :disabled="!isEditing || saving"
              :rows="2"
              placeholder="House 12, Road 5&#10;Mirpur-10, Dhaka-1216"
              class="w-full"
            />
          </UFormGroup>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormGroup label="Phone" :error="errors['contact.phone']">
              <UInput
                v-model="form.contact.phone"
                :disabled="!isEditing || saving"
                placeholder="+8801XXXXXXXXX"
                class="w-full"
              >
                <template #leading>
                  <Icon name="i-heroicons-phone" class="h-5 w-5" />
                </template>
              </UInput>
            </UFormGroup>

            <UFormGroup label="Email" :error="errors['contact.email']">
              <UInput
                v-model="form.contact.email"
                :disabled="!isEditing || saving"
                placeholder="info@example.com"
                type="email"
                class="w-full"
              >
                <template #leading>
                  <Icon name="i-heroicons-envelope" class="h-5 w-5" />
                </template>
              </UInput>
            </UFormGroup>
          </div>

          <UFormGroup label="Website" :error="errors['contact.website']">
            <UInput
              v-model="form.contact.website"
              :disabled="!isEditing || saving"
              placeholder="https://example.com"
              class="w-full"
            >
              <template #leading>
                <Icon name="i-heroicons-globe-alt" class="h-5 w-5" />
              </template>
            </UInput>
          </UFormGroup>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormGroup
              label="Facebook"
              :error="errors['contact.social.facebook']"
            >
              <UInput
                v-model="form.contact.social!.facebook"
                :disabled="!isEditing || saving"
                placeholder="https://facebook.com/..."
                class="w-full"
              >
                <template #leading>
                  <Icon name="i-simple-icons-facebook" class="h-5 w-5" />
                </template>
              </UInput>
            </UFormGroup>

            <UFormGroup
              label="YouTube"
              :error="errors['contact.social.youtube']"
            >
              <UInput
                v-model="form.contact.social!.youtube"
                :disabled="!isEditing || saving"
                placeholder="https://youtube.com/@..."
                class="w-full"
              >
                <template #leading>
                  <Icon name="i-simple-icons-youtube" class="h-5 w-5" />
                </template>
              </UInput>
            </UFormGroup>
          </div>

          <UFormGroup
            label="WhatsApp"
            :error="errors['contact.social.whatsapp']"
          >
            <UInput
              v-model="form.contact.social!.whatsapp"
              :disabled="!isEditing || saving"
              placeholder="https://wa.me/8801XXXXXXXXX"
              class="w-full"
            >
              <template #leading>
                <Icon name="i-simple-icons-whatsapp" class="h-5 w-5" />
              </template>
            </UInput>
          </UFormGroup>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
