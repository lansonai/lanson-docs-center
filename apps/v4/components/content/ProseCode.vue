<script setup lang="ts">
import { computed, useSlots } from 'vue'

const slots = useSlots()

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-sky-600 dark:text-sky-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  PATCH: 'text-amber-600 dark:text-amber-400',
  DELETE: 'text-rose-600 dark:text-rose-400',
  WS: 'text-violet-600 dark:text-violet-400',
  WSS: 'text-violet-600 dark:text-violet-400',
}

const methodEndpoint = computed(() => {
  const nodes = slots.default?.() ?? []
  if (nodes.length !== 1 || typeof nodes[0]?.children !== 'string')
    return null
  const match = nodes[0].children.trim().match(/^(GET|POST|PUT|PATCH|DELETE|WS|WSS)(\s+\/\S*)$/)
  if (!match)
    return null
  return { method: match[1]!, rest: match[2]! }
})
</script>

<template>
  <code class="relative whitespace-nowrap rounded-md border border-border/75 bg-muted/70 px-1.5 py-[0.15rem] font-mono text-[0.82em] text-foreground/95 outline-none">
    <template v-if="methodEndpoint">
      <span class="font-semibold" :class="METHOD_COLORS[methodEndpoint.method]">{{ methodEndpoint.method }}</span><span>{{ methodEndpoint.rest }}</span>
    </template>
    <slot v-else />
  </code>
</template>
