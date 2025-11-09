<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Owner", "Admin", "Developer"],
});

import { useHead, useToast } from "#imports";
import { computed, ref, onMounted } from "vue";
import { useRouter } from "vue-router";

useHead({ title: "Session Details" });

const toast = useToast();
const router = useRouter();
const route = useRoute();

const sessionStore = useSessionStore();

const sessionId = computed<number>(() => Number(route.params.id));
const sessionTitle = computed(
  () => sessionStore.current?.name ?? `Session #${sessionId.value}`
);

// classes → sections select sync
const selectedClassId = ref<number | null>(null);

// tabs
type TabKey = "classes" | "sections";
const activeTab = ref<TabKey>("classes");
const tabItems = [
  {
    label: "Classes",
    icon: "i-lucide-graduation-cap",
    slot: "classes" as const,
  },
  { label: "Sections", icon: "i-lucide-layers", slot: "sections" as const },
];

onMounted(async () => {
  try {
    await sessionStore.fetchOne(sessionId.value);
  } catch {
    toast.add({ title: "Failed to load session", color: "error" });
  }
});

function goBack() {
  router.back();
}
</script>

<template>
  <div class="space-y-4">
    <UCard>
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        <!-- Left: Back + Title -->
        <div class="flex items-start gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            aria-label="Go back"
            @click="goBack"
          />
          <div>
            <p class="text-sm text-neutral-500">Session</p>
            <h1 class="text-xl font-semibold">{{ sessionTitle }}</h1>
            <p class="text-xs text-neutral-500" v-if="sessionStore.current">
              {{ sessionStore.current.start_date }} →
              {{ sessionStore.current.end_date }} ·
              <span
                :class="
                  sessionStore.current.is_active
                    ? 'text-green-600'
                    : 'text-neutral-500'
                "
              >
                {{ sessionStore.current.is_active ? "Active" : "Inactive" }}
              </span>
            </p>
          </div>
        </div>

        <!-- Right: (removed the two redundant buttons) -->
        <div />
      </div>
    </UCard>

    <UTabs v-model="activeTab" :items="tabItems">
      <template #classes>
        <SessionClassesTab
          :session-id="sessionId"
          @select-class="(id:number) => { selectedClassId = id; activeTab = 'sections' }"
        />
      </template>

      <template #sections>
        <SessionSectionsTab
          v-model:class-id="selectedClassId"
          :session-id="sessionId"
        />
      </template>
    </UTabs>
  </div>
</template>
