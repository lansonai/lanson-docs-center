<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue'
import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'
import {
  Alert,
  AlertDescription,
} from '@/registry/new-york-v4/ui/alert'

const props = withDefaults(defineProps<{
  /** Iconify-style icon name, e.g. `i-lucide-triangle-alert` */
  icon?: string
  /** Semantic color of the callout */
  color?: 'default' | 'primary' | 'amber' | 'red'
  class?: HTMLAttributes['class']
}>(), {
  color: 'default',
})

const ICON_MAP: Record<string, Component> = {
  'i-lucide-triangle-alert': TriangleAlertIcon,
  'i-lucide-circle-alert': CircleAlertIcon,
  'i-lucide-info': InfoIcon,
}

const iconComponent = computed(() => props.icon ? ICON_MAP[props.icon] ?? InfoIcon : InfoIcon)

const COLOR_CLASSES: Record<string, string> = {
  default: '',
  primary: 'border-primary/30 bg-primary/5 [&_svg]:text-primary',
  amber: 'border-amber-500/40 bg-amber-500/5 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400',
  red: 'border-red-500/40 bg-red-500/5 [&_svg]:text-red-600 dark:[&_svg]:text-red-400',
}
</script>

<template>
  <Alert
    :class="cn(
      'mt-6 w-auto rounded-xl border-surface bg-surface text-surface-foreground md:-mx-1 **:[code]:border',
      COLOR_CLASSES[props.color],
      props.class,
    )"
  >
    <component :is="iconComponent" />
    <AlertDescription class="text-card-foreground/80">
      <slot />
    </AlertDescription>
  </Alert>
</template>
