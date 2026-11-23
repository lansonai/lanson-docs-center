<script setup lang="ts">
import {
  IconArrowRight,
  IconBolt,
  IconBook,
  IconBroadcast,
  IconChevronRight,
  IconCode,
  IconHeadphones,
  IconRocket,
  IconShieldCheck,
} from '@tabler/icons-vue'

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

const primarySections = [
  {
    title: 'AI-Native Transcription',
    description: 'Understand why Lanson Live delivers AI-reviewed, finalized speech instead of flickering draft words.',
    href: '/docs/ai-native-transcription',
    icon: IconRocket,
    badge: 'Why Lanson Live',
  },
  {
    title: 'Realtime',
    description: 'Stream PCM audio over WebSocket and receive stable transcript events while the person is still speaking.',
    href: '/docs/realtime',
    icon: IconBroadcast,
    badge: 'WebSocket',
  },
  {
    title: 'Recorded',
    description: 'Submit a public audio URL for async batch transcription with timestamps, review, and webhooks.',
    href: '/docs/recorded',
    icon: IconHeadphones,
    badge: 'Async Batch',
  },
]

const secondarySections = [
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
    icon: IconBook,
  },
  {
    title: 'API Reference',
    description: 'Endpoints, client messages, server events, errors, and rate limits — schema-accurate.',
    href: '/docs/api-reference',
    icon: IconCode,
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
  <div class="relative flex flex-1 flex-col overflow-x-clip">
    <!-- Background Atmosphere -->
    <div class="ambient-glow pointer-events-none fixed inset-0 z-0" />
    <div class="bg-dot-grid pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px]" />

    <div class="relative z-10 mx-auto w-full max-w-6xl px-6 pt-14 pb-24">
      <!-- HERO SECTION: Asymmetric Editorial + Live Context Preview -->
      <section class="grid items-center gap-12 pb-16 lg:grid-cols-12">
        <!-- Left Copy -->
        <div class="space-y-6 lg:col-span-7">
          <div class="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-600 dark:text-emerald-400">
            <span class="live-dot relative flex size-2">
              <span class="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            <span>LansonAI Developer Docs</span>
          </div>

          <h1 class="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[52px]">
            {{ title }}
          </h1>

          <p class="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {{ description }}
          </p>

          <div class="flex flex-wrap items-center gap-3.5 pt-2">
            <NuxtLink
              to="/docs/ai-native-transcription"
              class="btn-primary-emerald inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              <span>Why AI-Native Transcription</span>
              <IconArrowRight class="size-4" />
            </NuxtLink>

            <NuxtLink
              to="/docs/start/quickstart"
              class="inline-flex items-center gap-2 rounded-xl border border-border bg-[var(--glass-surface)] px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-emerald-500/40"
            >
              <IconBolt class="size-4 text-emerald-500 dark:text-emerald-400" />
              <span>5-minute quickstart</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Right Interactive Live Context Terminal -->
        <div class="lg:col-span-5">
          <div class="glass-card overflow-hidden rounded-2xl shadow-2xl">
            <div class="flex items-center justify-between border-b border-border bg-foreground/[0.02] px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="size-2.5 rounded-full bg-foreground/15" />
                <span class="size-2.5 rounded-full bg-foreground/15" />
                <span class="size-2.5 rounded-full bg-foreground/15" />
                <span class="ml-2 font-mono text-[11px] text-muted-foreground">wss://api.lansonai.com/v1/live</span>
              </div>
              <span class="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                StableStream™
              </span>
            </div>

            <div class="flex items-center justify-between border-b border-border px-5 py-3 text-xs">
              <span class="font-mono text-muted-foreground">PCM 16kHz · 1ch</span>
              <div class="flex h-4 items-center gap-1" aria-hidden="true">
                <span class="h-2 w-0.5 animate-pulse rounded-full bg-emerald-400/60" />
                <span class="h-3.5 w-0.5 animate-pulse rounded-full bg-emerald-400" style="animation-delay: 120ms" />
                <span class="h-2.5 w-0.5 animate-pulse rounded-full bg-emerald-400/80" style="animation-delay: 240ms" />
                <span class="h-4 w-0.5 animate-pulse rounded-full bg-emerald-400" style="animation-delay: 360ms" />
                <span class="h-1.5 w-0.5 animate-pulse rounded-full bg-emerald-400/50" style="animation-delay: 480ms" />
              </div>
            </div>

            <div class="space-y-4 p-5 font-mono text-xs leading-relaxed">
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-emerald-600 dark:text-emerald-400">event: transcript.final</span>
                  <span class="text-muted-foreground">LiveFinal™ · 48ms</span>
                </div>
                <p class="rounded-xl border border-border bg-foreground/[0.03] p-3 font-sans text-[14px] text-foreground">
                  "We need real-time speech context without layout jitter during live enterprise calls."
                </p>
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-sky-600 dark:text-sky-400">event: translation.delta</span>
                  <span class="text-muted-foreground">zh-CN</span>
                </div>
                <p class="rounded-xl border border-border bg-foreground/[0.02] p-3 font-sans text-[13.5px] text-muted-foreground">
                  “我们需要在企业实时通话中获得无排版抖动的语音上下文。”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- AI ASSISTANT BANNER -->
      <div class="mb-20">
        <DocsAgentEntry />
      </div>

      <!-- WHAT DO YOU WANT TO BUILD? -->
      <section class="space-y-8">
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            What do you want to build?
          </h2>
          <p class="text-sm text-muted-foreground sm:text-[15px]">
            Choose your use case — each path has a dedicated guide and API reference.
          </p>
        </div>

        <!-- Primary 3-Column Row -->
        <div class="grid gap-5 md:grid-cols-3">
          <NuxtLink
            v-for="section in primarySections"
            :key="section.href"
            :to="section.href"
            class="glass-card group flex flex-col justify-between rounded-2xl p-6"
          >
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex size-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-105 dark:text-emerald-400">
                  <component :is="section.icon" class="size-4" />
                </div>
                <span
                  v-if="section.badge"
                  class="rounded border border-border bg-foreground/[0.04] px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {{ section.badge }}
                </span>
                <IconChevronRight
                  v-else
                  class="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"
                />
              </div>
              <div class="space-y-1.5">
                <h3 class="text-[16px] font-semibold text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  {{ section.title }}
                </h3>
                <p class="text-sm leading-relaxed text-muted-foreground">
                  {{ section.description }}
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>

        <!-- Secondary 4-Column Row -->
        <div class="grid gap-5 pt-1 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="section in secondarySections"
            :key="section.href"
            :to="section.href"
            class="glass-card group flex flex-col justify-between rounded-2xl p-5"
          >
            <div class="space-y-3">
              <div class="flex size-8 items-center justify-center rounded-lg border border-border bg-foreground/[0.04] text-muted-foreground transition-colors group-hover:border-emerald-500/30 group-hover:text-emerald-500 dark:group-hover:text-emerald-400">
                <component :is="section.icon" class="size-4" />
              </div>
              <h3 class="text-[15px] font-semibold text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                {{ section.title }}
              </h3>
              <p class="text-[13.5px] leading-relaxed text-muted-foreground">
                {{ section.description }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
