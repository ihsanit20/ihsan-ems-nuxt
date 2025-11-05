<script setup lang="ts">
import { ref, computed, watch, onMounted, h, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { useUserStore, type User } from "@/stores/user";
import { useToast } from "#imports";
import { useDebounceFn } from "@vueuse/core";
import type { TableColumn } from "@nuxt/ui";

// Nuxt UI dynamic resolves (optional but keeps TS happy for h())
const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UInput = resolveComponent("UInput");
const USelect = resolveComponent("USelect");
const UTable = resolveComponent("UTable");
const UCard = resolveComponent("UCard");
const UAvatar = resolveComponent("UAvatar");
const UIcon = resolveComponent("UIcon");
const UModal = resolveComponent("UModal");

definePageMeta({ layout: "admin", middleware: ["auth"] });

const toast = useToast();
const store = useUserStore();
const {
  items,
  loading,
  page,
  last_page,
  total,
  per_page,
  q,
  role,
  sort_by,
  sort_dir,
  error,
} = storeToRefs(store);

const ROLES = [
  "Developer",
  "Owner",
  "Admin",
  "Teacher",
  "Accountant",
  "Guardian",
  "Student",
];

// ---------- filters & fetch ----------
const debouncedFetch = useDebounceFn(
  () => store.fetchList().catch(() => {}),
  300
);

watch([q, role, per_page, sort_by, sort_dir], () => {
  store.setPage(1);
  debouncedFetch();
});

watch(page, () => store.fetchList().catch(() => {}));

onMounted(() => {
  store.fetchList().catch(() => {});
});

// sorting (server-driven via store)
function toggleSort(key: NonNullable<typeof sort_by.value>) {
  if (sort_by.value === key)
    store.setSort(key, sort_dir.value === "asc" ? "desc" : "asc");
  else store.setSort(key, "asc");
  store.fetchList().catch(() => {});
}

// ---------- create / edit modal ----------
const createOpen = ref(false);
const editOpen = ref(false);
const editing: Ref<User | null> = ref(null);

function openCreate() {
  createOpen.value = true;
}
function openEdit(row: User) {
  editing.value = row;
  editOpen.value = true;
}
function onCreated() {
  toast.add({ title: "User created" });
  createOpen.value = false;
  store.fetchList().catch(() => {});
}
function onUpdated() {
  toast.add({ title: "User updated" });
  editOpen.value = false;
  store.fetchList().catch(() => {});
}

// ---------- delete ----------
const confirmOpen = ref(false);
const deleting: Ref<User | null> = ref(null);

function askDelete(row: User) {
  deleting.value = row;
  confirmOpen.value = true;
}
async function confirmDelete() {
  if (!deleting.value) return;
  try {
    await store.remove(deleting.value.id);
    toast.add({ title: "User deleted" });
  } catch {
    toast.add({ color: "error", title: "Delete failed" });
  } finally {
    confirmOpen.value = false;
    deleting.value = null;
  }
}

// helpers
function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// ---------- columns (add `id` for any non-string header) ----------
type Row = User;
const columns: TableColumn<Row>[] = [
  {
    id: "user",
    accessorKey: "name",
    header: ({ column }) =>
      h(UButton as any, {
        color: "neutral",
        variant: "ghost",
        label: "User",
        icon:
          column.getIsSorted() === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : column.getIsSorted() === "desc"
            ? "i-lucide-arrow-down-wide-narrow"
            : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      }),
    cell: ({ row }) => {
      const r = row.original as User;
      return h("div", { class: "flex items-center gap-2" }, [
        h(UAvatar as any, {
          src: r.photo_url || undefined,
          alt: r.name,
          text: r.name?.[0] || "U",
          size: "sm",
        }),
        h("div", { class: "leading-tight" }, [
          h("div", { class: "font-medium" }, r.name),
          h("div", { class: "text-xs text-gray-500" }, `#${r.id}`),
        ]),
      ]);
    },
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: ({ column }) =>
      h(UButton as any, {
        color: "neutral",
        variant: "ghost",
        label: "Phone",
        icon:
          column.getIsSorted() === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : column.getIsSorted() === "desc"
            ? "i-lucide-arrow-down-wide-narrow"
            : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      }),
    cell: ({ row }) =>
      h("span", { class: "font-medium" }, row.getValue("phone") as string),
  },
  {
    id: "email",
    accessorKey: "email",
    header: ({ column }) =>
      h(UButton as any, {
        color: "neutral",
        variant: "ghost",
        label: "Email",
        icon:
          column.getIsSorted() === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : column.getIsSorted() === "desc"
            ? "i-lucide-arrow-down-wide-narrow"
            : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      }),
    cell: ({ row }) => (row.getValue("email") as string) || "—",
  },
  {
    id: "role",
    accessorKey: "role",
    header: ({ column }) =>
      h(UButton as any, {
        color: "neutral",
        variant: "ghost",
        label: "Role",
        icon:
          column.getIsSorted() === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : column.getIsSorted() === "desc"
            ? "i-lucide-arrow-down-wide-narrow"
            : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      }),
    cell: ({ row }) => {
      const r = row.getValue("role") as string | null;
      return r ? h(UBadge as any, { label: r }) : "—";
    },
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) =>
      h(UButton as any, {
        color: "neutral",
        variant: "ghost",
        label: "Created",
        icon:
          column.getIsSorted() === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : column.getIsSorted() === "desc"
            ? "i-lucide-arrow-down-wide-narrow"
            : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      }),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-xs text-gray-600" },
        fmtDate(row.getValue("created_at") as string)
      ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const r = row.original as User;
      const items = [
        { type: "label", label: "Actions" },
        { type: "separator" as const },
        { label: "Edit", icon: "i-lucide-pencil", onSelect: () => openEdit(r) },
        {
          label: "Delete",
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => askDelete(r),
        },
      ];
      return h("div", { class: "flex justify-end items-center" }, [
        h(
          UDropdownMenu as any,
          { items, content: { align: "end" } },
          {
            default: () =>
              h(UButton as any, {
                color: "neutral",
                variant: "ghost",
                icon: "i-lucide-ellipsis-vertical",
                "aria-label": "Actions",
              }),
          }
        ),
      ]);
    },
  },
];
</script>

<template>
  <div class="p-4 md:p-6 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UInput
          v-model="q"
          placeholder="Search name/phone/email…"
          class="w-64"
        />
        <USelect
          v-model="role"
          :options="[
            { label: 'All roles', value: null },
            ...ROLES.map((r) => ({ label: r, value: r })),
          ]"
        />
        <USelect
          v-model="per_page"
          :options="
            [10, 15, 25, 50].map((n) => ({ label: String(n), value: n }))
          "
          class="w-24"
        />
        <UButton
          variant="soft"
          icon="i-lucide-rotate-cw"
          @click="store.fetchList()"
          >Refresh</UButton
        >
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-plus" @click="openCreate">Add user</UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-semibold">Users</div>
          <div class="text-sm text-gray-500">Total: {{ total }}</div>
        </div>
      </template>

      <UTable
        :data="items"
        :columns="columns"
        :loading="loading"
        class="min-w-max"
      >
        <!-- no extra slots needed; headers are provided via column.header -->
      </UTable>

      <div class="flex items-center justify-between mt-4">
        <div class="text-sm text-gray-500">
          Page {{ page }} of {{ last_page }}
        </div>
        <UPagination v-model="page" :page-count="last_page" />
      </div>
    </UCard>

    <!-- Add Modal -->
    <UserAddModal
      v-model:open="createOpen"
      :roles="ROLES"
      @created="onCreated"
    />

    <!-- Edit Modal -->
    <UserEditModal
      v-model:open="editOpen"
      :roles="ROLES"
      :user="editing"
      @updated="onUpdated"
    />

    <!-- Delete Confirm -->
    <UModal v-model:open="confirmOpen">
      <template #header><div class="font-semibold">Delete user</div></template>
      <p v-if="deleting">
        Are you sure you want to delete <b>{{ deleting.name }}</b
        >?
      </p>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton variant="ghost" @click="confirmOpen = false">Cancel</UButton>
          <UButton
            color="error"
            :loading="store.removing"
            @click="confirmDelete"
            >Delete</UButton
          >
        </div>
      </template>
    </UModal>
  </div>
</template>
