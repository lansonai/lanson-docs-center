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
import { Button } from '@/registry/new-york-v4/ui/button'

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
  <section class="agent-entry relative mx-auto mt-7 w-full max-w-3xl overflow-hidden rounded-2xl border text-left">
    <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.09] via-transparent to-transparent" />
    <div class="relative grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
      <div class="min-w-0">
        <h2 class="text-lg font-semibold tracking-tight sm:text-xl">
          Get started with AI
        </h2>
        <p class="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Understand the Lanson Live API and build your integration with help from your AI assistant.
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:items-end">
        <Button size="sm" class="h-9 w-full sm:w-auto" @click="copyAgentIndex">
          <IconCheck v-if="copied" /> <IconCopy v-else />
          {{ copied ? 'Copied' : 'Copy for AI' }}
        </Button>
        <div class="grid grid-cols-2 gap-2">
          <Button as-child size="sm" variant="outline" class="h-9">
            <a :href="chatgptUrl" target="_blank" rel="noopener noreferrer">
              <IconBrandOpenai /> Ask ChatGPT
            </a>
          </Button>
          <Button as-child size="sm" variant="outline" class="h-9">
            <a :href="claudeUrl" target="_blank" rel="noopener noreferrer">
              <IconSparkles /> Ask Claude
            </a>
          </Button>
        </div>
      </div>
    </div>

    <div class="relative flex flex-wrap items-center gap-x-5 gap-y-2 border-t bg-background/35 px-5 py-3 text-xs text-muted-foreground sm:px-6">
      <a
        href="/llms.txt"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <IconFileText class="size-3.5" /> AI documentation
      </a>
      <a
        href="https://audio.lansonai.com/openapi.json"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        OpenAPI spec <IconExternalLink class="size-3.5" />
      </a>
    </div>
  </section>
</template>

<style scoped>
.agent-entry {
  background: color-mix(in oklab, var(--card) 92%, transparent);
  box-shadow: 0 18px 50px -34px color-mix(in oklab, var(--primary) 35%, transparent);
}
</style>
