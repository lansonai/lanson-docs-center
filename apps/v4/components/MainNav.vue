<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Button } from '@/registry/new-york-v4/ui/button'

const props = defineProps<{
  items: { href: string, label: string }[]
  class?: HTMLAttributes['class']
}>()

const { path } = toRefs(useRoute())

function isActive(href: string): boolean {
  if (href === '/')
    return path.value === '/'
  if (href.startsWith('/docs/ai-native-transcription') || href.startsWith('/docs/start'))
    return path.value.startsWith('/docs') && !path.value.startsWith('/docs/api-reference')
  return path.value === href || path.value.startsWith(`${href}/`)
}
</script>

<template>
  <nav :class="cn('items-center gap-0.5', props.class)">
    <Button
      v-for="item in items"
      :key="item.href"
      variant="ghost"
      as-child
      size="sm"
      class="px-2.5 text-[13px] transition-colors"
      :class="isActive(item.href) ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'"
    >
      <NuxtLink
        :to="item.href"
        class="relative items-center"
      >
        {{ item.label }}
        <span
          v-if="isActive(item.href)"
          class="pointer-events-none absolute inset-x-2 -bottom-[11px] h-[2px] rounded-full bg-primary"
        />
      </NuxtLink>
    </Button>
  </nav>
</template>
