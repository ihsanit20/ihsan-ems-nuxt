<script setup lang="ts">
definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

useHead({ title: "Admissions" });

const steps = [
  {
    title: "Check eligibility",
    desc: "আবেদনের শর্ত ও প্রয়োজনীয় ডকুমেন্ট জেনে নিন।",
    icon: "i-lucide-badge-check",
  },
  {
    title: "Submit application",
    desc: "অনলাইনে আবেদন ফর্ম পূরণ করুন (শীঘ্রই চালু হবে)।",
    icon: "i-lucide-clipboard-list",
  },
  {
    title: "Track progress",
    desc: "স্ট্যাটাস, ইন্টারভিউ ও নোটিফিকেশন এখানেই দেখুন।",
    icon: "i-lucide-activity",
  },
];
</script>

<template>
  <UContainer class="space-y-6 pb-8">
    <UCard
      class="overflow-hidden border-none bg-gradient-to-r from-primary-600 to-blue-600 text-white"
    >
      <div class="flex flex-col md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <p class="text-sm text-white/80">Guardian Admissions</p>
          <h1 class="text-3xl font-bold leading-tight">ভর্তি সেকশন</h1>
          <p class="text-white/80 max-w-2xl">
            নতুন বা পুনঃভর্তি আবেদন এখান থেকে জমা ও ট্র্যাক করুন। আপাতত এই
            পেজটি স্ট্যাটিক ডিজাইন; কার্যকরী ফ্লো প্রস্তুত হচ্ছে।
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <UButton
              color="white"
              variant="solid"
              icon="i-lucide-list-checks"
              to="/guardian/admissions/applications"
            >
              আমার আবেদনগুলো দেখুন
            </UButton>
            <UButton
              color="white"
              variant="soft"
              icon="i-lucide-plus"
              disabled
            >
              নতুন আবেদন (শীঘ্রই)
            </UButton>
          </div>
        </div>
        <div class="mt-6 md:mt-0">
          <div
            class="rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-sm space-y-2"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-calendar" class="h-4 w-4" />
              <span>চলমান সেশন: ২০২৫</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-info" class="h-4 w-4" />
              <span>পরবর্তী ব্যাচের আসন সীমিত</span>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard v-for="step in steps" :key="step.title">
        <div class="flex items-start gap-3">
          <div
            class="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"
          >
            <UIcon :name="step.icon" class="h-5 w-5" />
          </div>
          <div class="space-y-1">
            <p class="font-semibold">{{ step.title }}</p>
            <p class="text-sm text-gray-500">
              {{ step.desc }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Guides</p>
            <p class="font-semibold">নতুনদের জন্য নির্দেশনা</p>
          </div>
          <UBadge color="info" variant="soft">Static preview</UBadge>
        </div>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl border border-dashed border-gray-200 p-4">
          <p class="font-semibold">ডকুমেন্ট চেকলিস্ট</p>
          <p class="text-sm text-gray-500 mt-1">
            জন্ম নিবন্ধন, পূর্ববর্তী মার্কশিট, ছবি ইত্যাদি আপলোডের নির্দেশনা।
          </p>
        </div>
        <div class="rounded-xl border border-dashed border-gray-200 p-4">
          <p class="font-semibold">ইন্টারভিউ প্রস্তুতি</p>
          <p class="text-sm text-gray-500 mt-1">
            শিক্ষক/অ্যাডমিনের সঙ্গে সম্ভাব্য প্রশ্ন ও সময়সূচি।
          </p>
        </div>
        <div class="rounded-xl border border-dashed border-gray-200 p-4">
          <p class="font-semibold">ফি ও পেমেন্ট</p>
          <p class="text-sm text-gray-500 mt-1">
            আবেদন ফি, পরবর্তী কিস্তি ও পেমেন্ট অপশন সম্পর্কে তথ্য।
          </p>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
