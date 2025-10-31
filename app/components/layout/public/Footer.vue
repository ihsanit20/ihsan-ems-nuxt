<!-- app/components/public/Footer.vue -->
<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useTenantStore } from "~/stores/tenant";
import { useInstituteStore } from "~/stores/institute";

/** Stores */
const tenantStore = useTenantStore();
const instituteStore = useInstituteStore();

const { meta } = storeToRefs(tenantStore);
const { profile } = storeToRefs(instituteStore);

/** Best-effort load (public page; profile may require auth — silently ignore errors) */
onMounted(async () => {
  if (!meta.value) {
    try {
      await tenantStore.fetchMeta();
    } catch {}
  }
  if (!profile.value) {
    try {
      await instituteStore.fetchProfile();
    } catch {}
  }
});

/** Derived UI data */
const title = computed(
  () =>
    meta.value?.shortName ||
    meta.value?.name ||
    profile.value?.names?.en ||
    "Ihsan EMS"
);

const logoUrl = computed(() => meta.value?.branding?.logoUrl || null);

const contact = computed(() => profile.value?.contact || null);

const addressLines = computed<string[]>(() =>
  (contact.value?.address || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
);

const phoneHref = computed(() =>
  contact.value?.phone ? `tel:${contact.value.phone}` : null
);
const emailHref = computed(() =>
  contact.value?.email ? `mailto:${contact.value.email}` : null
);
const websiteHref = computed(() => contact.value?.website || null);

const social = computed(() => ({
  facebook: contact.value?.social?.facebook || null,
  youtube: contact.value?.social?.youtube || null,
  whatsapp: contact.value?.social?.whatsapp || null,
}));

const mapHref = computed(() =>
  contact.value?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        contact.value.address
      )}`
    : null
);
</script>

<template>
  <footer class="mt-10 border-t py-4">
    <UContainer class="grid gap-8 md:grid-cols-3">
      <!-- Brand -->
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <img
            v-if="logoUrl"
            :src="logoUrl || undefined"
            alt="Logo"
            class="h-8 w-auto"
            loading="lazy"
            decoding="async"
          />
          <NuxtLink to="/" class="text-base font-semibold hover:underline">
            {{ title }}
          </NuxtLink>
        </div>

        <!-- Address with icon + map link -->
        <div v-if="addressLines.length" class="flex items-start gap-2">
          <Icon name="i-heroicons-map-pin" class="h-4 w-4 mt-0.5" />
          <address class="not-italic leading-relaxed">
            <template v-if="mapHref">
              <a
                :href="mapHref!"
                target="_blank"
                rel="noopener"
                class="hover:underline"
              >
                <span
                  v-for="(line, i) in addressLines"
                  :key="i"
                  class="block"
                  >{{ line }}</span
                >
              </a>
            </template>
            <template v-else>
              <span v-for="(line, i) in addressLines" :key="i" class="block">{{
                line
              }}</span>
            </template>
          </address>
        </div>
      </div>

      <!-- Contact -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium">Contact</h3>
        <div class="text-sm text-gray-600 space-y-2">
          <div class="flex items-center gap-2" v-if="contact?.phone">
            <Icon name="i-heroicons-phone" class="h-4 w-4" />
            <a :href="phoneHref!" class="hover:underline">{{
              contact!.phone
            }}</a>
          </div>

          <div class="flex items-center gap-2" v-if="contact?.email">
            <Icon name="i-heroicons-envelope" class="h-4 w-4" />
            <a :href="emailHref!" class="hover:underline">{{
              contact!.email
            }}</a>
          </div>

          <div class="flex items-center gap-2" v-if="contact?.website">
            <Icon name="i-heroicons-globe-alt" class="h-4 w-4" />
            <a
              :href="websiteHref!"
              target="_blank"
              rel="noopener"
              class="hover:underline break-all"
            >
              {{ contact!.website }}
            </a>
          </div>
        </div>
      </div>

      <!-- Social -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium">Follow us</h3>
        <div class="flex items-center gap-3">
          <a
            v-if="social.facebook"
            :href="social.facebook!"
            target="_blank"
            rel="noopener"
            aria-label="Facebook"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-gray-50"
          >
            <Icon name="i-simple-icons-facebook" class="h-5 w-5" />
          </a>
          <a
            v-if="social.youtube"
            :href="social.youtube!"
            target="_blank"
            rel="noopener"
            aria-label="YouTube"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-gray-50"
          >
            <Icon name="i-simple-icons-youtube" class="h-5 w-5" />
          </a>
          <a
            v-if="social.whatsapp"
            :href="social.whatsapp!"
            target="_blank"
            rel="noopener"
            aria-label="WhatsApp"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-gray-50"
          >
            <Icon name="i-simple-icons-whatsapp" class="h-5 w-5" />
          </a>
        </div>
      </div>
    </UContainer>
  </footer>
  <hr class="w-full" />
  <footer class="">
    <div class="flex justify-center gap-4 mx-auto max-w-7xl px-4 py-4">
      <p class="text-sm text-gray-500">
        © {{ new Date().getFullYear() }} {{ title }}. All rights reserved.
      </p>
      <p class="text-xs text-gray-500/90">
        Developed by
        <a
          href="https://ihsanit.com"
          target="_blank"
          rel="noopener"
          class="underline hover:no-underline"
        >
          Ihsan IT
        </a>
      </p>
    </div>
  </footer>
</template>
