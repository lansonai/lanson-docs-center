<script setup lang="ts">
import type { Technology } from '~/types/technology'
import { Activity, Braces } from '@lucide/vue'

defineProps<{ technology: Technology }>()

// Existing visual associations, not newly invented logos:
// Trinity: lanson-offical-react/src/components/landing/ThreeEnginesShowcase.tsx.
// LiveFinal: lanson-flow-web/app/components/flow/FlowHomePage.vue.
// StableStream SVG: lanson-flow-web/app/components/ui/EngineBadge.vue (stream).
</script>

<template>
  <span class="technology-icon inline-flex size-9 shrink-0 items-center justify-center rounded-lg border" :data-technology="technology" aria-hidden="true">
    <Braces v-if="technology === 'trinity'" class="size-5" :stroke-width="1.5" />
    <Activity v-else-if="technology === 'livefinal'" class="size-5" :stroke-width="1.5" />
    <svg v-else class="size-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 8h14" />
      <path d="M4 8c2.5 0 2.5-2.5 5-2.5s2.5 2.5 5 2.5" stroke-width="1.2" />
    </svg>
  </span>
</template>

<style scoped>
.technology-icon {
  --technology-color: #6b3fd4;
  color: var(--technology-color);
  border-color: color-mix(in srgb, var(--technology-color) 20%, transparent);
  background: color-mix(in srgb, var(--technology-color) 6%, transparent);
}
.technology-icon[data-technology="stablestream"] { --technology-color: #0078a8; }
.technology-icon[data-technology="livefinal"] { --technology-color: #007a5e; }
:global(.dark) .technology-icon { --technology-color: #b088ff; }
:global(.dark) .technology-icon[data-technology="stablestream"] { --technology-color: #00d4ff; }
:global(.dark) .technology-icon[data-technology="livefinal"] { --technology-color: #00ffc8; }
</style>
