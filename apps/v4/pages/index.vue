<script setup lang="ts">
import {
  IconArrowRight,
  IconBook,
  IconBroadcast,
  IconHeadphones,
  IconListDetails,
  IconMicrophone,
  IconRocket,
  IconShieldCheck,
} from '@tabler/icons-vue'
import { Button } from '@/registry/new-york-v4/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card'

const title = 'Lanson Live API'
const description
  = 'Build with LansonAI\'s Voice Context Layer for Live Speech. Stream speech, receive stable text, and add translation to your application.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image',
})

const sections = [
  {
    title: 'Start',
    description: 'Get an API key, make your first request in five minutes, and choose the right API.',
    href: '/docs/start/quickstart',
    icon: IconRocket,
  },
  {
    title: 'Realtime',
    description: 'Stream PCM audio over WebSocket and receive stable transcript events while the person is still speaking.',
    href: '/docs/realtime',
    icon: IconBroadcast,
  },
  {
    title: 'Recorded',
    description: 'Submit a public audio URL for async batch transcription with timestamps, review, and webhooks.',
    href: '/docs/recorded',
    icon: IconHeadphones,
  },
  {
    title: 'Concepts',
    description: 'How Trinity Engine, StableStream™, and LiveFinal™ turn live speech into usable context.',
    href: '/docs/concepts',
    icon: IconBook,
  },
  {
    title: 'Guides',
    description: 'Browser live captions, server-side streaming, reconnection, and translation UI patterns.',
    href: '/docs/guides',
    icon: IconMicrophone,
  },
  {
    title: 'API Reference',
    description: 'Endpoints, client messages, server events, errors, and rate limits — schema-accurate.',
    href: '/docs/api-reference',
    icon: IconListDetails,
  },
  {
    title: 'Production',
    description: 'Checklists, retries, latency practices, security, and data retention before going live.',
    href: '/docs/production',
    icon: IconShieldCheck,
  },
]
</script>

<template>
  <div class="flex flex-1 flex-col">
    <PageHeader class="md:**:[.container]:pb-8 lg:**:[.container]:pb-12">
      <p class="text-xs font-medium tracking-wide text-muted-foreground">
        LansonAI Developer Docs
      </p>
      <PageHeaderHeading class="max-w-4xl">
        {{ title }}
      </PageHeaderHeading>
      <PageHeaderDescription>{{ description }}</PageHeaderDescription>
      <PageActions>
        <Button as-child size="sm" class="h-[1.9375rem] rounded-lg">
          <NuxtLink href="/docs/start/quickstart">
            Get started <IconArrowRight data-icon="inline-end" />
          </NuxtLink>
        </Button>
        <Button as-child size="sm" variant="outline" class="h-[1.9375rem] rounded-lg">
          <NuxtLink href="/docs/start/quickstart">
            5-minute quickstart
          </NuxtLink>
        </Button>
      </PageActions>
      <DocsAgentEntry />
    </PageHeader>

    <div class="container-wrapper flex-1">
      <div class="container">
        <section class="py-8 lg:py-12">
          <h2 class="text-2xl font-semibold tracking-tight">
            What do you want to build?
          </h2>
          <p class="text-muted-foreground mt-2 text-base">
            Choose your use case — each path has a dedicated guide and API reference.
          </p>
          <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="section in sections"
              :key="section.href"
              :to="section.href"
              class="group"
            >
              <Card class="h-full transition-colors group-hover:border-foreground/20">
                <CardHeader>
                  <div class="flex items-center gap-2">
                    <component :is="section.icon" class="size-4 text-muted-foreground" />
                    <CardTitle class="text-base">
                      {{ section.title }}
                    </CardTitle>
                  </div>
                  <CardDescription class="mt-2">
                    {{ section.description }}
                  </CardDescription>
                </CardHeader>
              </Card>
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
