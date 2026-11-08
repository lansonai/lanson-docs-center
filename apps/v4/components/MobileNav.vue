<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Button } from '@/registry/new-york-v4/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/registry/new-york-v4/ui/popover'

const props = defineProps<{
  class?: HTMLAttributes['class']
  tree: ContentNavigationItem[]
  items: { href: string, label: string }[]
}>()
const router = useRouter()
const open = ref(false)

function handleNavigate(path: string) {
  router.push(path)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        :class="cn(
          'extend-touch-target h-8 touch-manipulation items-center justify-start gap-2.5 !p-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent',
          props.class,
        )"
      >
        <div class="relative flex h-8 w-4 items-center justify-center">
          <div class="relative size-4">
            <span
              :class="cn(
                'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                open ? 'top-[0.4rem] -rotate-45' : 'top-1',
              )"
            />
            <span
              :class="cn(
                'bg-foreground absolute left-0 block h-0.5 w-4 transition-all duration-100',
                open ? 'top-[0.4rem] rotate-45' : 'top-2.5',
              )"
            />
          </div>
          <span class="sr-only">Toggle Menu</span>
        </div>
        <span class="flex h-8 items-center text-lg leading-none font-medium">
          Menu
        </span>
      </Button>
    </PopoverTrigger>

    <PopoverContent
      class="bg-background/95 no-scrollbar h-(--reka-popper-available-height) w-(--reka-popper-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur duration-100"
      align="start"
      side="bottom"
      :align-offset="-16"
      :side-offset="14"
    >
      <div class="flex flex-col gap-8 overflow-auto px-6 py-6">
        <div class="flex flex-col gap-3">
          <div class="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Menu
          </div>
          <div class="flex flex-col gap-2.5">
            <NuxtLink
              v-for="(item, index) in items"
              :key="index"
              class="text-lg font-medium"
              :to="item.href"
              @click="handleNavigate(item.href)"
            >
              {{ item.label }}
            </NuxtLink>
            <a
              href="https://developer.lansonai.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-lg font-medium"
              @click="open = false"
            >
              Console ↗
            </a>
          </div>
        </div>

        <div class="flex flex-col gap-6 border-t border-border/60 pt-6">
          <template v-for="(group, index) in tree[0]?.children" :key="index">
            <div class="flex flex-col gap-3">
              <div class="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {{ group.title }}
              </div>
              <div class="flex flex-col gap-2.5">
                <NuxtLink
                  v-for="item in group.children"
                  :key="item.path"
                  class="flex items-center gap-2 text-base font-medium text-foreground/90 hover:text-foreground"
                  :to="item.path"
                  @click="handleNavigate(item.path)"
                >
                  {{ item.title }}
                  <span v-if="item.new" class="flex size-2 rounded-full bg-green-500" />
                </NuxtLink>
              </div>
            </div>
          </template>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
