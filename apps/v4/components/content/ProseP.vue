<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <p :class="cn('leading-[var(--doc-leading-body)] [&:not(:first-child)]:mt-[var(--doc-space-block)]', props.class)">
    <slot />
  </p>
</template>
