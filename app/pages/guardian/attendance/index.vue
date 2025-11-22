<script setup lang="ts">
definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

useHead({ title: "Attendance" });

const summary = [
  { label: "This week", value: "4 / 5", sub: "80% present", icon: "i-lucide-calendar-check" },
  { label: "This month", value: "18 / 22", sub: "82% present", icon: "i-lucide-activity" },
  { label: "Late arrivals", value: "1", sub: "Last 30 days", icon: "i-lucide-clock-3" },
  { label: "Absences", value: "3", sub: "Last 30 days", icon: "i-lucide-alert-triangle" },
];

const weekLog = [
  { day: "Mon", date: "Feb 10", status: "Present", notes: "" },
  { day: "Tue", date: "Feb 11", status: "Present", notes: "" },
  { day: "Wed", date: "Feb 12", status: "Late", notes: "Arrived 10:05 AM" },
  { day: "Thu", date: "Feb 13", status: "Present", notes: "" },
  { day: "Fri", date: "Feb 14", status: "Absent", notes: "Sick leave (example)" },
];

function statusColor(status: string) {
  if (status === "Present") return "success";
  if (status === "Late") return "warning";
  if (status === "Absent") return "error";
  return "neutral";
}
</script>

<template>
  <UContainer class="space-y-6 pb-8">
    <UCard
      class="border-none bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 text-white"
    >
      <div class="space-y-2">
        <p class="text-sm text-white/80">Guardian · Attendance</p>
        <h1 class="text-3xl font-bold">উপস্থিতি</h1>
        <p class="text-white/80 max-w-3xl">
          এটি একটি স্ট্যাটিক প্রিভিউ। উপস্থিতির লাইভ ডাটা যুক্ত হলে এখানে
          দিনের ভিত্তিতে উপস্থিতি, দেরি ও অনুপস্থিতি দেখা যাবে।
        </p>
        <div class="flex gap-3 pt-2">
          <UButton color="white" variant="solid" icon="i-lucide-refresh-ccw" disabled>
            Sync attendance (coming soon)
          </UButton>
          <UButton color="white" variant="soft" icon="i-lucide-download" disabled>
            Download report
          </UButton>
        </div>
      </div>
    </UCard>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <UCard v-for="item in summary" :key="item.label">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">{{ item.label }}</p>
            <p class="text-2xl font-bold">{{ item.value }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ item.sub }}</p>
          </div>
          <div
            class="h-10 w-10 rounded-lg bg-white text-primary flex items-center justify-center shadow-sm"
          >
            <UIcon :name="item.icon" class="h-5 w-5 text-primary" />
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">This week</p>
            <p class="font-semibold">সাপ্তাহিক উপস্থিতি লগ</p>
          </div>
          <UBadge color="info" variant="soft">Static sample</UBadge>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500">
              <th class="py-2">Day</th>
              <th class="py-2">Date</th>
              <th class="py-2">Status</th>
              <th class="py-2">Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="entry in weekLog" :key="entry.day">
              <td class="py-2 font-medium text-gray-900">{{ entry.day }}</td>
              <td class="py-2 text-gray-600">{{ entry.date }}</td>
              <td class="py-2">
                <UBadge :color="statusColor(entry.status)" variant="subtle">
                  {{ entry.status }}
                </UBadge>
              </td>
              <td class="py-2 text-gray-600">
                {{ entry.notes || "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-info" class="h-4 w-4 text-primary" />
          <p class="font-semibold">পরবর্তী আপডেট</p>
        </div>
      </template>
      <ul class="list-disc pl-5 space-y-1 text-sm text-gray-600">
        <li>রিয়েল-টাইম উপস্থিতি ও দেরির নোটিফিকেশন।</li>
        <li>ছুটির আবেদন ও অনুমোদন ফ্লো।</li>
        <li>ডাউনলোডযোগ্য মাসিক/ত্রৈমাসিক রিপোর্ট।</li>
      </ul>
    </UCard>
  </UContainer>
</template>
