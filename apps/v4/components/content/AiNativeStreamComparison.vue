<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const draftBadge = ref('Unstable Revisions')
const draftStage = ref<'initial' | 'step1' | 'step2' | 'step3' | 'final'>('initial')
const draftLog = ref('4 interim rewrites exposed to UI / downstream agent')

const stableBadge = ref('LiveFinal™ Ready')
const stableStage = ref<'initial' | 'reviewing' | 'delivered'>('initial')
const stableLog = ref('1 completed, reasoning-reviewed utterance delivered')

let simTimers: ReturnType<typeof setTimeout>[] = []

function clearSimTimers() {
  for (const timer of simTimers) {
    clearTimeout(timer)
  }
  simTimers = []
}

function runStreamSimulation() {
  clearSimTimers()

  draftBadge.value = 'Streaming Drafts...'
  draftStage.value = 'step1'
  draftLog.value = 'event #1 (partial) emitted'

  stableBadge.value = 'Reasoning Review...'
  stableStage.value = 'reviewing'
  stableLog.value = 'Evaluating candidate against conversation context'

  simTimers.push(setTimeout(() => {
    draftStage.value = 'step2'
    draftLog.value = 'event #2 (partial) — layout shifts'
  }, 650))

  simTimers.push(setTimeout(() => {
    draftStage.value = 'step3'
    draftLog.value = 'event #3 (partial) — phonetic mismatch exposed'
  }, 1350))

  simTimers.push(setTimeout(() => {
    draftStage.value = 'final'
    draftLog.value = 'event #4 (final) — requires post-patch if corrected'
    draftBadge.value = 'Unstable Revisions'

    stableBadge.value = 'LiveFinal™ Ready'
    stableStage.value = 'delivered'
    stableLog.value = 'event #1 (completed) — reasoning-reviewed before handoff'
  }, 2200))
}

onBeforeUnmount(() => {
  clearSimTimers()
})
</script>

<template>
  <div class="not-prose glass-card-static my-6 overflow-hidden rounded-2xl shadow-xl">
    <!-- Terminal Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-foreground/[0.02] px-5 py-3.5">
      <div class="flex items-center gap-2.5">
        <div class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-foreground/15" />
          <span class="size-2.5 rounded-full bg-foreground/15" />
          <span class="size-2.5 rounded-full bg-foreground/15" />
        </div>
        <span class="ml-1 font-mono text-xs text-muted-foreground">Live delivery simulation</span>
      </div>

      <button
        id="replay-comparison-btn"
        type="button"
        class="btn-primary-emerald inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold"
        @click="runStreamSimulation"
      >
        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Simulate Live Utterance</span>
      </button>
    </div>

    <!-- Side-by-Side Comparison Grid -->
    <div class="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
      <!-- Left: Conventional Draft Streaming -->
      <div class="space-y-4 p-6">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-xs uppercase tracking-wider text-muted-foreground">Provisional Draft Stream</span>
          <span class="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-600 dark:text-amber-400">
            {{ draftBadge }}
          </span>
        </div>

        <div class="flex min-h-[116px] flex-col justify-between rounded-xl border border-border bg-[var(--panel-inset)] p-4">
          <p v-if="draftStage === 'step1'" class="text-[14.5px] leading-relaxed text-foreground">
            "We need..."
          </p>
          <p v-else-if="draftStage === 'step2'" class="text-[14.5px] leading-relaxed text-foreground">
            "We need to fix the <span class="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-xs text-amber-700 dark:text-amber-300">land</span>..."
          </p>
          <p v-else-if="draftStage === 'step3'" class="text-[14.5px] leading-relaxed text-foreground">
            "We need to fix the <span class="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-xs text-amber-700 dark:text-amber-300">land sun live</span>..."
          </p>
          <p v-else class="text-[14.5px] leading-relaxed text-foreground">
            "We need to fix the <span class="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-xs text-amber-700 dark:text-amber-300">land sun live</span> API."
          </p>

          <div class="mt-3 border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
            {{ draftLog }}
          </div>
        </div>

        <p class="text-xs leading-relaxed text-muted-foreground">
          Exposes raw phonetic guesses immediately, forcing your UI or downstream agent to handle flickering text and retroactive patches.
        </p>
      </div>

      <!-- Right: Lanson Live StableStream™ -->
      <div class="space-y-4 bg-emerald-500/[0.02] p-6">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Lanson Live (StableStream™)</span>
          <span class="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            {{ stableBadge }}
          </span>
        </div>

        <div class="flex min-h-[116px] flex-col justify-between rounded-xl border border-emerald-500/25 bg-[var(--panel-inset)] p-4">
          <p v-if="stableStage === 'reviewing'" class="text-[14.5px] italic leading-relaxed text-muted-foreground">
            Collecting acoustic candidate &amp; running live reasoning review...
          </p>
          <p v-else class="text-[14.5px] leading-relaxed text-foreground">
            "We need to fix the <span class="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">Lanson Live</span> API."
          </p>

          <div class="mt-3 border-t border-border pt-3 font-mono text-[11px] text-emerald-600/90 dark:text-emerald-400/90">
            {{ stableLog }}
          </div>
        </div>

        <p class="text-xs leading-relaxed text-muted-foreground">
          Holds the acoustic candidate briefly for full-context reasoning review, delivering one clean, final transcript event.
        </p>
      </div>
    </div>
  </div>
</template>
