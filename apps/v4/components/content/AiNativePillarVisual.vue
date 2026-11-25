<script setup lang="ts">
defineProps<{
  pillar: 'stablestream' | 'refinement' | 'context' | 'livefinal' | 'downstream'
}>()
</script>

<template>
  <div class="not-prose glass-card-static my-6 rounded-2xl p-6">
    <!-- 01. StableStream™ -->
    <div v-if="pillar === 'stablestream'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">01 · Foundation</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Delivery Contract</span>
      </div>
      <div class="space-y-2.5 rounded-xl border border-border bg-[var(--panel-inset)] p-4 font-mono text-xs">
        <div class="text-muted-foreground">
          // Single-handoff stream
        </div>
        <div class="flex items-center justify-between border-b border-border/60 py-1.5">
          <span class="text-foreground">utterance_01</span>
          <span class="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">completed · final</span>
        </div>
        <div class="flex items-center justify-between pt-1">
          <span class="text-foreground">utterance_02</span>
          <span class="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">completed · final</span>
        </div>
      </div>
      <p class="text-xs leading-relaxed text-muted-foreground">
        No flickering interim revisions to reconcile in your UI or downstream state machine.
      </p>
    </div>

    <!-- 02. Context-aware Refinement -->
    <div v-else-if="pillar === 'refinement'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">02 · In-Pipeline Reasoning</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Review Guardrails</span>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-xs">
          <div class="font-mono font-medium text-emerald-600 dark:text-emerald-400">
            Targeted Disambiguation
          </div>
          <p class="leading-relaxed text-muted-foreground">
            Resolves phonetic lookalikes (<code class="font-mono text-foreground">"land sun" → "Lanson"</code>) using global session context.
          </p>
        </div>
        <div class="space-y-1.5 rounded-xl border border-border bg-[var(--panel-inset)] p-4 text-xs">
          <div class="font-mono font-medium text-foreground">
            Zero Paraphrasing
          </div>
          <p class="leading-relaxed text-muted-foreground">
            Preserves speaker phrasing verbatim when recognized words are already accurate.
          </p>
        </div>
      </div>
    </div>

    <!-- 03. Conversation Context -->
    <div v-else-if="pillar === 'context'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">03 · Conversational Memory</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Multi-Turn Continuity</span>
      </div>
      <div class="space-y-2.5 font-mono text-xs">
        <div class="rounded-xl border border-border bg-[var(--panel-inset)] p-3.5 text-muted-foreground">
          Turn 1: "We're deploying <span class="font-semibold text-emerald-600 dark:text-emerald-400">LiveFinal</span> today."
        </div>
        <div class="text-center text-[11px] text-emerald-600 dark:text-emerald-400">
          ↓ context carried forward
        </div>
        <div class="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5 text-foreground">
          Turn 2: "Check <span class="font-semibold text-emerald-600 dark:text-emerald-400">LiveFinal</span> latency metrics."
        </div>
      </div>
    </div>

    <!-- 04. LiveFinal™ -->
    <div v-else-if="pillar === 'livefinal'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">04 · Finalization Boundary</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Single-Handoff Pipeline</span>
      </div>
      <div class="space-y-2.5 font-mono text-xs">
        <div class="rounded-xl border border-border bg-[var(--panel-inset)] p-3.5 text-muted-foreground">
          1. Acoustic Signal (ASR Candidate)
        </div>
        <div class="text-[11px] text-emerald-600 dark:text-emerald-400">
          ↓
        </div>
        <div class="rounded-xl border border-sky-500/25 bg-sky-500/[0.04] p-3.5 text-sky-700 dark:text-sky-300">
          2. Live Reasoning Review (LLM)
        </div>
        <div class="text-[11px] text-emerald-600 dark:text-emerald-400">
          ↓
        </div>
        <div class="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-foreground">
          3. LiveFinal™ Event Handoff
        </div>
      </div>
    </div>

    <!-- 05. AI-ready Transcripts -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">05 · Downstream Integration</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Structured Event Payload</span>
      </div>
      <pre class="overflow-x-auto rounded-xl border border-border bg-[var(--panel-inset)] p-4 font-mono text-xs leading-relaxed text-foreground">{
  "event": "transcript.completed",
  "utterance_order": 4,
  "transcript_state": "final",
  "text": "We need to fix the Lanson Live API.",
  "ai_reviewed": true
}</pre>
    </div>
  </div>
</template>
