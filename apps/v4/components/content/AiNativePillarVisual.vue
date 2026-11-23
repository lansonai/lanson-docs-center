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
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">01 · Foundation &amp; Trade-off</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Delivery Contract</span>
      </div>
      <div class="space-y-2.5 rounded-xl border border-border bg-[var(--panel-inset)] p-4 font-mono text-xs">
        <div class="text-muted-foreground">
          // Hold bounded segment window → review in-pipeline → emit once
        </div>
        <div class="flex items-center justify-between border-b border-border/60 py-1.5">
          <span class="text-foreground">utterance_01 (window collected &amp; reviewed)</span>
          <span class="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">completed · stable</span>
        </div>
        <div class="flex items-center justify-between pt-1">
          <span class="text-foreground">utterance_02 (window collected &amp; reviewed)</span>
          <span class="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">completed · stable</span>
        </div>
      </div>
      <p class="text-xs leading-relaxed text-muted-foreground">
        Trading raw 100ms draft flicker for a bounded segment window is the structural price that makes real-time AI review possible.
      </p>
    </div>

    <!-- 02. Context-aware Refinement -->
    <div v-else-if="pillar === 'refinement'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">02 · In-Pipeline Discipline</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Why Naive AI Fails vs. Lanson Guardrails</span>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="space-y-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-xs">
          <div class="font-mono font-medium text-emerald-600 dark:text-emerald-400">
            Phonetic + Context Match
          </div>
          <p class="leading-relaxed text-muted-foreground">
            Resolves acoustic lookalikes (<code class="font-mono text-foreground">"land sun" → "Lanson"</code>) only when backed by conversational evidence.
          </p>
        </div>
        <div class="space-y-1.5 rounded-xl border border-border bg-[var(--panel-inset)] p-4 text-xs">
          <div class="font-mono font-medium text-foreground">
            Zero Paraphrasing
          </div>
          <p class="leading-relaxed text-muted-foreground">
            Never rewrites grammar, summarizes, or alters speaker intent—avoiding the hallucination trap of unconstrained LLMs.
          </p>
        </div>
        <div class="space-y-1.5 rounded-xl border border-border bg-[var(--panel-inset)] p-4 text-xs">
          <div class="font-mono font-medium text-foreground">
            Restrained Non-Intervention
          </div>
          <p class="leading-relaxed text-muted-foreground">
            Leaves already-accurate recognition and ultra-short acknowledgments untouched so AI never makes a good transcript worse.
          </p>
        </div>
      </div>
    </div>

    <!-- 03. Conversation Context -->
    <div v-else-if="pillar === 'context'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">03 · Cross-Utterance Memory</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Multi-Turn Continuity</span>
      </div>
      <div class="space-y-2.5 font-mono text-xs">
        <div class="rounded-xl border border-border bg-[var(--panel-inset)] p-3.5 text-muted-foreground">
          Turn 1 ( establishes entity ): "We're deploying <span class="font-semibold text-emerald-600 dark:text-emerald-400">LiveFinal</span> on the realtime gateway today."
        </div>
        <div class="text-center text-[11px] text-emerald-600 dark:text-emerald-400">
          ↓ distilled session memory carried into short 3s follow-up turn
        </div>
        <div class="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5 text-foreground">
          Turn 2 ( resolves phonetic "life final" ): "Check <span class="font-semibold text-emerald-600 dark:text-emerald-400">LiveFinal</span> latency metrics."
        </div>
      </div>
    </div>

    <!-- 04. LiveFinal™ -->
    <div v-else-if="pillar === 'livefinal'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">04 · Finalization Boundary</span>
        <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Single-Handoff Pipeline</span>
      </div>
      <div class="grid gap-2.5 font-mono text-xs sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-[var(--panel-inset)] p-3.5 text-muted-foreground">
          <div class="mb-1 text-[10px] uppercase text-muted-foreground/80">
            Stage 1 · Internal
          </div>
          Bounded Segment Collected
        </div>
        <div class="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-amber-700 dark:text-amber-300">
          <div class="mb-1 text-[10px] uppercase text-amber-600 dark:text-amber-400">
            Stage 2 · Behind Boundary
          </div>
          Candidate + Context Review
        </div>
        <div class="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-foreground">
          <div class="mb-1 text-[10px] uppercase text-emerald-600 dark:text-emerald-400">
            Stage 3 · Published Event
          </div>
          One Immutable Completed Handoff
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
  "type": "conversation.item.input_audio_transcription.completed",
  "utterance_index": 4,
  "text": "We need to fix the Lanson Live API.",
  "raw_text": "We need to fix the land sun live API.",
  "transcript": {
    "state": "stable",
    "revision": 0,
    "correction_applied": true,
    "safe_for_downstream": true
  }
}</pre>
    </div>
  </div>
</template>
