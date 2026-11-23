<script lang="ts" setup>
import {
  IconArrowLeft,
  IconArrowRight,
  IconArrowUpRight,
} from '@tabler/icons-vue'
import { Badge } from '@/registry/new-york-v4/ui/badge'
import { Button } from '@/registry/new-york-v4/ui/button'
import TechnologyIcon from '~/components/brand/TechnologyIcon.vue'

const route = useRoute()

const { data: page } = await useAsyncData(route.path, () => {
  return queryCollection('content').path(route.path).first()
})

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const { data: neighbours } = await useAsyncData(`surround-${route.path}`, () => {
  return queryCollectionItemSurroundings('content', route.path)
})

useSeoMeta({
  title: page.value.title,
  description: page.value.description,
  ogTitle: page.value.title,
  ogDescription: page.value.description,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <template v-if="page">
    <div
      data-slot="docs"
      class="flex scroll-mt-24 items-stretch pb-10 text-[length:var(--doc-text-body)] leading-[var(--doc-leading-body)] xl:w-full"
    >
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="h-(--top-spacing) shrink-0" />
        <div class="mx-auto flex w-full max-w-[var(--doc-measure)] min-w-0 flex-1 flex-col gap-5 px-4 py-6 text-foreground md:px-8 lg:py-7 dark:text-foreground">
          <div class="flex flex-col gap-2">
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <TechnologyIcon v-if="page.technology" :technology="page.technology" />
                  <h1 class="scroll-m-24 text-[length:var(--doc-text-h1)] font-semibold tracking-tight leading-tight">
                    {{ page.title }}
                  </h1>
                </div>
                <div class="docs-nav flex shrink-0 items-center gap-2">
                  <div class="hidden sm:block">
                    <DocsCopyPage :page="page" />
                  </div>
                  <Button
                    v-if="neighbours?.[0]"
                    variant="secondary"
                    size="icon"
                    class="extend-touch-target ml-auto size-8 shadow-none md:size-7"
                    as-child
                  >
                    <NuxtLink :to="neighbours[0].path">
                      <IconArrowLeft />
                      <span class="sr-only">Previous</span>
                    </NuxtLink>
                  </Button>
                  <Button
                    v-if="neighbours?.[1]"
                    variant="secondary"
                    size="icon"
                    class="extend-touch-target size-8 shadow-none md:size-7"
                    as-child
                  >
                    <NuxtLink :to="neighbours[1].path">
                      <span class="sr-only">Next</span>
                      <IconArrowRight />
                    </NuxtLink>
                  </Button>
                </div>
              </div>
              <p v-if="page.description" class="text-[1.05rem] text-muted-foreground sm:text-base sm:text-balance md:max-w-[80%]">
                {{ page.description }}
              </p>
            </div>
            <div v-if="page.links" class="flex items-center space-x-2 pt-4">
              <Badge v-if="page.links.doc" as-child variant="secondary">
                <NuxtLink :to="page.links.doc" target="_blank" rel="noreferrer">
                  Docs <IconArrowUpRight />
                </NuxtLink>
              </Badge>
              <Badge v-if="page.links.api" as-child variant="secondary">
                <NuxtLink :to="page.links.api" target="_blank" rel="noreferrer">
                  API Reference <IconArrowUpRight />
                </NuxtLink>
              </Badge>
            </div>
          </div>

          <ContentRenderer :value="page" class="w-full flex-1 *:data-[slot=alert]:first:mt-0" />
        </div>
        <div class="mx-auto flex h-16 w-full max-w-[var(--doc-measure)] items-center gap-2 px-4 md:px-8">
          <Button
            v-if="neighbours?.[0]"
            variant="secondary"
            size="sm"
            as-child
            class="shadow-none"
          >
            <NuxtLink :to="neighbours[0].path">
              <IconArrowLeft /> {{ neighbours[0].title }}
            </NuxtLink>
          </Button>
          <Button
            v-if="neighbours?.[1]"
            variant="secondary"
            size="sm"
            class="ml-auto shadow-none"
            as-child
          >
            <NuxtLink :to="neighbours[1].path">
              {{ neighbours[1].title }} <IconArrowRight />
            </NuxtLink>
          </Button>
        </div>
      </div>

      <div class="sticky top-[calc(var(--header-height)+1px)] z-30 ml-auto hidden h-[calc(100svh-var(--header-height)-var(--footer-height))] w-[var(--doc-toc-width)] shrink-0 flex-col gap-4 overflow-hidden overscroll-none border-l border-border/40 pb-8 xl:flex">
        <div class="h-(--top-spacing) shrink-0" />
        <div v-if="page.body.toc?.links.length" class="no-scrollbar overflow-y-auto px-5">
          <DocsTableOfContents :toc="page.body.toc" />
          <div class="h-12" />
        </div>
      </div>
    </div>
  </template>
</template>
