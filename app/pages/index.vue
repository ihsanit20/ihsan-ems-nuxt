<template>
  <div>
    <h2 style="margin-bottom: 8px">হোম</h2>
    <div v-if="status === 'loading'">টেন্যান্ট মেটা লোড হচ্ছে…</div>
    <div v-else-if="status === 'error'" style="color: #b91c1c">
      লোডে সমস্যা: {{ error }}
    </div>
    <div v-else>
      <p><b>Tenant:</b> {{ meta?.name }} ({{ meta?.domain }})</p>
      <p>
        <b>Locale:</b> {{ meta?.locale?.default }} | <b>Currency:</b>
        {{ meta?.currency?.code }}
      </p>
      <p>
        <b>Features:</b> admission: {{ meta?.features?.admission }}, attendance:
        {{ meta?.features?.attendance }}, fees: {{ meta?.features?.fees }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
definePageMeta({ layout: "default" });
const store = useTenantStore();
const { meta, status, error } = storeToRefs(store);
</script>
