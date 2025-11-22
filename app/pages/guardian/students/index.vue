<script setup lang="ts">
definePageMeta({
  layout: "guardian",
  middleware: "auth",
  requiresAuth: true,
  roles: ["Guardian", "Owner", "Admin", "Developer"],
});

useHead({ title: "Students" });

const sampleStudents = [
  {
    name: "Nusrat Jahan",
    code: "STU-2025-101",
    grade: "Grade 6",
    section: "A",
    status: "active",
  },
  {
    name: "Tahmid Rahman",
    code: "STU-2025-077",
    grade: "Grade 3",
    section: "B",
    status: "pending",
  },
];

function statusLabel(status: string) {
  if (status === "active") return { label: "Active", color: "success" };
  if (status === "pending") return { label: "Pending", color: "warning" };
  return { label: status || "Unknown", color: "neutral" };
}
</script>

<template>
  <UContainer class="space-y-6 pb-8">
    <UCard
      class="border-none bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white"
    >
      <div class="flex flex-col md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <p class="text-sm text-white/80">Guardian · Students</p>
          <h1 class="text-3xl font-bold leading-tight">ছাত্রছাত্রী প্রোফাইল</h1>
          <p class="text-white/80 max-w-2xl">
            এই পেজটি এখনো স্ট্যাটিক ডিজাইন। শীঘ্রই এখানে আপনার সন্তানের
            প্রোফাইল, এনরোলমেন্ট ও ফি তথ্য দেখা যাবে।
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <UButton
              color="white"
              variant="solid"
              icon="i-lucide-clipboard-list"
              to="/guardian/fees"
            >
              ফি দেখুন
            </UButton>
            <UButton color="white" variant="soft" icon="i-lucide-plus" disabled>
              নতুন লিংক (শীঘ্রই)
            </UButton>
          </div>
        </div>
        <div
          class="mt-6 md:mt-0 rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-sm space-y-2"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shield-check" class="h-4 w-4" />
            <span>ডেটা নিরাপদ ও প্রাইভেট রাখা হবে</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-lock-keyhole" class="h-4 w-4" />
            <span>শুধু অনুমোদিত অভিভাবক দেখেতে পারবেন</span>
          </div>
        </div>
      </div>
    </UCard>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UCard v-for="student in sampleStudents" :key="student.code">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-gray-500">{{ student.code }}</p>
            <p class="text-lg font-semibold">{{ student.name }}</p>
            <p class="text-sm text-gray-500">
              {{ student.grade }} · Section {{ student.section }}
            </p>
          </div>
          <UBadge
            :color="statusLabel(student.status).color"
            variant="subtle"
            class="capitalize"
          >
            {{ statusLabel(student.status).label }}
          </UBadge>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
          <div class="rounded-lg border border-dashed border-gray-200 p-3">
            <p class="font-medium text-gray-900">Attendance</p>
            <p class="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>
          <div class="rounded-lg border border-dashed border-gray-200 p-3">
            <p class="font-medium text-gray-900">Results</p>
            <p class="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <UButton size="sm" variant="outline" icon="i-lucide-eye" disabled>
            View profile
          </UButton>
          <UButton size="sm" variant="ghost" icon="i-lucide-link-2" disabled>
            Manage link
          </UButton>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-info" class="h-4 w-4 text-primary" />
          <p class="font-semibold">কীভাবে কাজ করবে?</p>
        </div>
      </template>
      <ul class="list-disc pl-5 space-y-1 text-sm text-gray-600">
        <li>স্কুল অনুমোদনের পর সন্তানের প্রোফাইল স্বয়ংক্রিয়ভাবে যোগ হবে।</li>
        <li>লিঙ্কড স্টুডেন্ট ছাড়া অন্য কোনো ডেটা দেখার সুযোগ থাকবে না।</li>
        <li>অ্যাক্সেস অনুরোধ ও ট্রান্সফারের জন্য আলাদা ফ্লো যুক্ত হবে।</li>
      </ul>
    </UCard>
  </UContainer>
</template>
