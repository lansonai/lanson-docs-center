<script setup lang="ts">
import { computed, useSlots } from 'vue'

const slots = useSlots()

const METHOD_BADGE_CLASS: Record<string, string> = {
  GET: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  POST: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  PUT: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PATCH: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  DELETE: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  WS: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  WSS: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
}

const standaloneMethod = computed(() => {
  const nodes = slots.default?.() ?? []
  if (nodes.length !== 1 || typeof nodes[0]?.children !== 'string')
    return null
  const text = nodes[0].children.trim()
  return text in METHOD_BADGE_CLASS ? text : null
})
</script>

<template>
  <td class="whitespace-nowrap px-3.5 py-2.5 text-left align-middle leading-snug [&[align=center]]:text-center [&[align=right]]:text-right [&_code]:whitespace-nowrap">
    <span
      v-if="standaloneMethod"
      class="inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide"
      :class="METHOD_BADGE_CLASS[standaloneMethod]"
    >
      {{ standaloneMethod }}
    </span>
    <slot v-else />
  </td>
</template>
