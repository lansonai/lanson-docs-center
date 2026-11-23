<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div class="scrollbar-thin my-6 w-full overflow-x-auto rounded-lg border border-border/80 bg-card/40 shadow-2xs">
    <table
      :class="cn(
        'relative w-max min-w-full border-collapse border-none text-[13.5px] [&_thead]:bg-muted/55 [&_thead_tr]:border-b [&_thead_tr]:border-border/80 [&_tbody_tr:last-child]:border-b-0',
        props.class,
      )"
      v-bind="$attrs"
    >
      <slot />
    </table>
  </div>
</template>
