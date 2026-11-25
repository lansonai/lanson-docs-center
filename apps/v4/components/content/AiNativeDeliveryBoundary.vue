<script setup lang="ts">
import { ref } from 'vue'

const internalVisible = ref(true)
</script>

<template>
  <div class="not-prose glass-card-static my-6 space-y-6 rounded-2xl p-6 sm:p-7">
    <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <div class="space-y-0.5">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Utterance Lifecycle</span>
        <div class="text-base font-semibold tracking-tight text-foreground">
          Acoustic Signal + Live Reasoning Review vs. Published Event
        </div>
      </div>

      <button
        id="toggle-internal-btn"
        type="button"
        class="cursor-pointer rounded-xl border border-border bg-[var(--panel-inset)] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-emerald-500/40 hover:text-foreground"
        @click="internalVisible = !internalVisible"
      >
        {{ internalVisible ? 'Dim Internal Pipeline Steps' : 'Highlight Internal Pipeline Steps' }}
      </button>
    </div>

    <div class="grid items-stretch gap-4 lg:grid-cols-3">
      <!-- Step 1: Acoustic Signal (ASR) -->
      <div
        class="flex flex-col justify-between space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4 transition-all duration-300"
        :class="!internalVisible ? 'opacity-25 blur-[2px]' : ''"
      >
        <div class="flex items-center justify-between gap-1">
          <span class="font-mono text-[11px] text-amber-600 dark:text-amber-400">01 · ACOUSTIC SIGNAL (ASR)</span>
          <span class="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-300">Internal</span>
        </div>
        <div class="rounded-lg border border-amber-500/20 bg-background/60 p-3 font-mono text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          “We need to fix the <span class="underline decoration-amber-400 decoration-wavy">land sun live</span> API.”
        </div>
        <p class="text-xs text-muted-foreground">
          Acoustic decoding produces a phonetic candidate from local audio—treated as one input signal, never emitted as a draft.
        </p>
      </div>

      <!-- Step 2: Live Reasoning Review (LLM) -->
      <div
        class="flex flex-col justify-between space-y-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.04] p-4 transition-all duration-300"
        :class="!internalVisible ? 'opacity-25 blur-[2px]' : ''"
      >
        <div class="flex items-center justify-between gap-1">
          <span class="font-mono text-[11px] text-sky-600 dark:text-sky-400">02 · LIVE REASONING REVIEW</span>
          <span class="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] text-sky-700 dark:text-sky-300">Internal · LLM</span>
        </div>
        <div class="rounded-lg border border-sky-500/20 bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-foreground">
          <div class="text-muted-foreground">
            context: <span class="text-sky-600 dark:text-sky-400">["Lanson Live API"]</span>
          </div>
          <div class="mt-1 text-foreground">
            eval: <span class="text-amber-700 dark:text-amber-300">"land sun live"</span> → <span class="font-semibold text-emerald-600 dark:text-emerald-400">"Lanson Live"</span>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          A separate reasoning model evaluates the candidate with full conversation visibility—resolving ambiguity without paraphrasing.
        </p>
      </div>

      <!-- Step 3: Published Event -->
      <div class="flex flex-col justify-between space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4">
        <div class="flex items-center justify-between gap-1">
          <span class="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">03 · COMPLETED TRANSCRIPT</span>
          <span class="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">Delivered Event</span>
        </div>
        <div class="rounded-lg border border-emerald-500/25 bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground">
          “We need to fix the <span class="rounded bg-emerald-500/15 px-1 font-semibold text-emerald-600 dark:text-emerald-400">Lanson Live</span> API.”
        </div>
        <p class="text-xs text-muted-foreground">
          Delivered once via LiveFinal™ with utterance sequence, transcript state, and review metadata.
        </p>
      </div>
    </div>

    <div class="flex flex-col justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
      <span>Illustrative example of delivery boundary behavior—not a measured benchmark or accuracy guarantee.</span>
      <span class="font-mono text-emerald-600/80 dark:text-emerald-400/80">AI-native by default</span>
    </div>
  </div>
</template>
