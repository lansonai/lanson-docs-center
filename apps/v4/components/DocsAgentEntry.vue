<script setup lang="ts">
import {
  IconBrandOpenai,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconFileText,
  IconSparkles,
} from '@tabler/icons-vue'
import { useClipboard } from '@vueuse/core'

const docsBase = 'https://docs.lansonai.com'

// Served straight from public/ so the copy is byte-for-byte the current index.
const { data: llmsIndex } = await useFetch<string>('/llms.txt', {
  responseType: 'text',
  server: false,
})

const { copy, copied } = useClipboard({ copiedDuring: 2000 })

async function copyAgentIndex() {
  const text = llmsIndex.value ?? await $fetch<string>('/llms.txt', { responseType: 'text' })
  if (!text) {
    return
  }
  await copy(text)
}

const agentPrompt = `Use the Lanson Live API documentation at ${docsBase}/llms.txt to help me understand the API and build my integration.
Ground every answer in those docs, cite the page path, and prefer runnable code examples.`

const chatgptUrl = `https://chatgpt.com/?q=${encodeURIComponent(agentPrompt)}`
const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(agentPrompt)}`
</script>

<template>
  <section class="glass-card relative overflow-hidden rounded-2xl p-6 sm:p-8 text-left">
    <div class="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-emerald-500/10 blur-3xl" />

    <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
      <div class="max-w-xl space-y-2">
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
            AI-Native Workflow
          </span>
        </div>
        <h2 class="text-2xl font-semibold tracking-tight text-foreground">
          Get started with AI
        </h2>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Understand the Lanson Live API and build your integration with help from your AI assistant.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          class="btn-primary-emerald inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold sm:text-sm"
          @click="copyAgentIndex"
        >
          <IconCheck v-if="copied" class="size-4" />
          <IconCopy v-else class="size-4" />
          <span>{{ copied ? 'Copied to clipboard' : 'Copy for AI' }}</span>
        </button>

        <a
          :href="chatgptUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.03] px-4 py-2 text-xs font-medium text-foreground transition-all hover:border-emerald-500/30 hover:bg-foreground/[0.06] sm:text-sm"
        >
          <IconBrandOpenai class="size-4 text-muted-foreground" />
          <span>Ask ChatGPT</span>
        </a>

        <a
          :href="claudeUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.03] px-4 py-2 text-xs font-medium text-foreground transition-all hover:border-emerald-500/30 hover:bg-foreground/[0.06] sm:text-sm"
        >
          <IconSparkles class="size-4 text-amber-500/90 dark:text-amber-400/90" />
          <span>Ask Claude</span>
        </a>
      </div>
    </div>

    <div class="relative z-10 mt-6 flex flex-wrap items-center gap-6 border-t border-border pt-5 text-xs text-muted-foreground">
      <a
        href="/llms.txt"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 transition-colors hover:text-emerald-500 dark:hover:text-emerald-400"
      >
        <IconFileText class="size-3.5 opacity-75" />
        <span>AI documentation <span class="font-mono text-[11px] opacity-75">(llms.txt)</span></span>
      </a>
      <a
        href="https://audio.lansonai.com/openapi.json"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 transition-colors hover:text-emerald-500 dark:hover:text-emerald-400"
      >
        <span>OpenAPI spec</span>
        <IconExternalLink class="size-3 opacity-75" />
      </a>
    </div>
  </section>
</template>
