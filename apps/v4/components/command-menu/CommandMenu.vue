<script setup lang="ts">

import type { NavigationItem } from '~/composables/useNavigation'
import { CornerDownLeft } from '@lucide/vue'
import { IconArrowRight } from '@tabler/icons-vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useIsMac } from '@/composables/useIsMac'
import { useConfig } from '@/composables/useUserConfig'
import { cn } from '@/lib/utils'
import { Button } from '@/registry/new-york-v4/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/registry/new-york-v4/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/registry/new-york-v4/ui/dialog'
import { Separator } from '@/registry/new-york-v4/ui/separator'
import CommandMenuItem from './CommandItem.vue'
import CommandMenuKbd from './CommandMenuKbd.vue'

interface Props {
  tree?: {
    children: NavigationItem[]
    title: string
    path: string
    stem?: string
  }
  navItems?: { href: string, label: string }[]
}

const props = withDefaults(defineProps<Props>(), {
  navItems: undefined,
})

const router = useRouter()
const open = ref(false)
const selectedType = ref<'page' | null>(null)

function handlePageHighlight() {
  selectedType.value = 'page'
}

function runCommand(command: () => unknown) {
  open.value = false
  command()
}

onMounted(() => {
  const down = (e: KeyboardEvent) => {
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
      if (
        (e.target instanceof HTMLElement && e.target.isContentEditable)
        || e.target instanceof HTMLInputElement
        || e.target instanceof HTMLTextAreaElement
        || e.target instanceof HTMLSelectElement
      ) {
        return
      }
      e.preventDefault()
      open.value = !open.value
    }
  }
  document.addEventListener('keydown', down)
  onUnmounted(() => document.removeEventListener('keydown', down))
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'relative h-8 w-full justify-start rounded-lg border-none bg-muted pl-3 text-foreground shadow-none transition-colors hover:bg-muted/50 md:w-48 lg:w-40 xl:w-64 dark:bg-card',
        )"
        @click="open = true"
      >
        <span class="hidden xl:inline-flex">Search documentation...</span>
        <span class="inline-flex xl:hidden">Search...</span>
      </Button>
    </DialogTrigger>
    <DialogContent
      class="rounded-xl border-none bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800"
      :show-close-button="false"
    >
      <DialogHeader class="sr-only">
        <DialogTitle>Search documentation...</DialogTitle>
        <DialogDescription>Search for a command to run...</DialogDescription>
      </DialogHeader>
      <Command
        highlight-on-hover
        class="**:data-[slot=command-input-wrapper]:bg-input/50 **:data-[slot=command-input-wrapper]:border-input rounded-none bg-transparent **:data-[slot=command-input]:!h-9 **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:!h-9 **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border"
        :filter="(value: string, search: string, keywords?: string[]) => {
          const extendValue = `${value} ${keywords?.join(' ') || ''}`
          if (extendValue.toLowerCase().includes(search.toLowerCase())) {
            return 1
          }
          return 0
        }"
      >
        <CommandInput placeholder="Search documentation..." />
        <CommandList class="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
          <CommandEmpty class="text-muted-foreground py-12 text-center text-sm">
            No results found.
          </CommandEmpty>
          <CommandGroup
            v-if="navItems && navItems.length > 0"
            heading="Pages"
            class="!p-0 [&_[data-slot=command-group-heading]]:scroll-mt-16 [&_[data-slot=command-group-heading]]:!p-3 [&_[data-slot=command-group-heading]]:!pb-1"
          >
            <CommandMenuItem
              v-for="item in navItems"
              :key="item.href"
              :value="`Navigation ${item.label}`"
              @select="() => runCommand(() => router.push(item.href))"
              @highlight="() => handlePageHighlight()"
            >
              <IconArrowRight />
              {{ item.label }}
            </CommandMenuItem>
          </CommandGroup>
          <CommandGroup
            v-for="group in tree?.children"
            :key="group.title"
            :heading="group.title"
            class="!p-0 [&_[data-slot=command-group-heading]]:scroll-mt-16 [&_[data-slot=command-group-heading]]:!p-3 [&_[data-slot=command-group-heading]]:!pb-1"
          >
            <template v-if="group.type === 'group'">
              <CommandMenuItem
                v-for="item in group.children?.filter((i: NavigationItem) => i.type === 'page')"
                :key="item.title"
                :value="item.title?.toString() ? `${group.title} ${item.title}` : ''"
                @highlight="() => handlePageHighlight()"
                @select="() => runCommand(() => router.push(item.path))"
              >
                <IconArrowRight />
                {{ item.title }}
              </CommandMenuItem>
            </template>
          </CommandGroup>
        </CommandList>
      </Command>
      <div class="text-muted-foreground absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium dark:border-t-neutral-700 dark:bg-neutral-800">
        <div class="flex items-center gap-2">
          <CommandMenuKbd>
            <CornerDownLeft />
          </CommandMenuKbd>
          <span>Go to Page</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
