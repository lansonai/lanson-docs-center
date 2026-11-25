<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import { HIDDEN_DOC_PAGES, HIDDEN_DOC_SECTIONS } from '@/lib/docs-sidebar'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/registry/new-york-v4/ui/sidebar'

defineProps<{
  tree: ContentNavigationItem
}>()

const EXCLUDED_SECTIONS: string[] = HIDDEN_DOC_SECTIONS
const EXCLUDED_PAGES: string[] = HIDDEN_DOC_PAGES

const { path } = toRefs(useRoute())
</script>

<template>
  <Sidebar
    class="sticky top-[calc(var(--header-height)+1px)] z-30 hidden h-[calc(100svh-var(--header-height)-1px)] overflow-hidden overscroll-none border-r border-border/50 bg-transparent [--sidebar-menu-width:--spacing(56)] lg:flex"
    collapsible="none"
  >
    <SidebarContent class="w-(--sidebar-menu-width) scroll-fade scrollbar-none overflow-x-hidden pr-3 pt-5">
      <SidebarGroup
        v-for="item in tree.children?.filter(section => !EXCLUDED_SECTIONS.includes(section.title.toLocaleLowerCase()))"
        :key="item.title"
      >
        <SidebarGroupLabel class="text-[length:var(--doc-text-label)] font-semibold uppercase tracking-wider text-foreground/65">
          {{ item.title }}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu class="gap-0.5">
            <template
              v-for="childItem in item?.children?.filter(child => !EXCLUDED_PAGES.includes(child.path))"
              :key="String(childItem.url)"
            >
              <SidebarMenuItem>
                <SidebarMenuButton
                  as-child
                  :is-active="childItem?.path === path"
                  class="relative min-h-[30px] h-auto w-full overflow-visible rounded-md border border-transparent px-2.5 py-1 text-[length:var(--doc-text-sidebar)] leading-snug text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground data-[active=true]:border-primary/25 data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary"
                >
                  <NuxtLink :to="childItem?.path">
                    <span class="absolute inset-0 flex w-(--sidebar-width) bg-transparent" />
                    {{ childItem.title }}
                    <span
                      v-if="childItem.new"
                      class="flex size-2 rounded-full bg-green-500"
                      title="New"
                    />
                  </NuxtLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </template>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <div class="from-background via-background/80 to-background/50 sticky -bottom-1 z-10 h-16 shrink-0 bg-gradient-to-t blur-xs" />
    </SidebarContent>
  </Sidebar>
</template>
