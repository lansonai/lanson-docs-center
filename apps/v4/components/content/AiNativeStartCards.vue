<script setup lang="ts">
const startBuildingLinks = [
  {
    title: 'Realtime Quickstart',
    description: 'Stream live speech over WebSocket and receive completed utterances.',
    href: '/docs/realtime/quickstart',
  },
  {
    title: 'Context-aware Refinement',
    description: 'What context-aware refinement is — conversational context improving recognition while preserving speaker intent.',
    href: '/docs/ai-native-transcription/context-aware-refinement',
  },
  {
    title: 'StableStream™ and LiveFinal™',
    description: 'What StableStream™ and LiveFinal™ are — stable segments and utterance finalization boundaries.',
    href: '/docs/ai-native-transcription/stablestream',
  },
  {
    title: 'Server Events',
    description: 'Integrate utterance sequence, transcript state, and refinement metadata.',
    href: '/docs/api-reference/server-events',
  },
]
</script>

<template>
  <div class="not-prose my-6 space-y-6">
    <!-- Callout Card -->
    <div class="glass-card-static flex flex-col items-start gap-4 rounded-2xl border-emerald-500/25 bg-emerald-500/[0.03] p-6 sm:flex-row">
      <div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="space-y-1.5">
        <div class="text-[15px] font-semibold text-foreground">
          AI-native by default
        </div>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Live reasoning review is built directly into Lanson Live transcription. Developers can start with a standard transcription request and get full-context verification without wiring up a separate post-processing pipeline. The result remains the speaker's words—not an AI-generated paraphrase.
        </p>
      </div>
    </div>

    <!-- Links Grid -->
    <div class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="link in startBuildingLinks"
        :key="link.href"
        :to="link.href"
        class="glass-card group flex flex-col justify-between space-y-2.5 rounded-2xl p-5"
      >
        <div class="flex items-center justify-between">
          <span class="text-[15px] font-semibold text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            {{ link.title }}
          </span>
          <svg class="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <p class="text-sm leading-relaxed text-muted-foreground">
          {{ link.description }}
        </p>
      </NuxtLink>
    </div>
  </div>
</template>
