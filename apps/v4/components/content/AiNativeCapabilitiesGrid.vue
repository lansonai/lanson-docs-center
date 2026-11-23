<script setup lang="ts">
const capabilities = [
  {
    step: '01',
    title: 'StableStream™',
    description: 'Delivers stable, completed utterances rather than a stream of continuously changing word-by-word guesses.',
    href: '/docs/ai-native-transcription/stablestream',
  },
  {
    step: '02',
    title: 'Context-aware Refinement',
    description: 'Combines phonetic clues with conversational context inside the live pipeline to resolve ambiguous terms.',
    href: '/docs/ai-native-transcription/context-aware-refinement',
  },
  {
    step: '03',
    title: 'Conversation Context',
    description: 'Carries names, product terminology, and references across turns instead of treating audio fragments in isolation.',
    href: '/docs/ai-native-transcription/conversation-context',
  },
  {
    step: '04',
    title: 'LiveFinal™',
    description: 'Integrates AI review behind the finalization boundary so your app receives one clean completed handoff.',
    href: '/docs/ai-native-transcription/livefinal',
  },
  {
    step: '05',
    title: 'AI-ready Transcripts',
    description: 'Provides utterance ordering, transcript state, and readiness metadata designed for downstream AI agents.',
    href: '/docs/ai-native-transcription/ai-ready-transcripts',
  },
]
</script>

<template>
  <div class="not-prose my-6 grid gap-3.5 sm:grid-cols-2">
    <NuxtLink
      v-for="item in capabilities"
      :key="item.href"
      :to="item.href"
      class="glass-card group flex flex-col justify-between space-y-2.5 rounded-2xl p-5"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {{ item.step }}
          </span>
          <span class="text-[15px] font-semibold text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            {{ item.title }}
          </span>
        </div>
        <svg class="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p class="text-sm leading-relaxed text-muted-foreground">
        {{ item.description }}
      </p>
    </NuxtLink>
  </div>
</template>
