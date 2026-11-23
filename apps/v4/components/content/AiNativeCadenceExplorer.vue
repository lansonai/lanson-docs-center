<script setup lang="ts">
import { computed, ref } from 'vue'

const segmentSeconds = ref(3)

const speedPct = computed(() => Math.max(20, Math.min(95, Math.round(105 - segmentSeconds.value * 5.5))))
const contextPct = computed(() => Math.max(25, Math.min(96, Math.round(15 + segmentSeconds.value * 5.4))))

const activePreset = computed<'voice' | 'meeting' | 'broadcast'>(() => {
  if (segmentSeconds.value <= 4)
    return 'voice'
  if (segmentSeconds.value <= 10)
    return 'meeting'
  return 'broadcast'
})

const speedText = computed(() => {
  if (segmentSeconds.value <= 4)
    return 'Fast'
  if (segmentSeconds.value <= 10)
    return 'Balanced'
  return 'Relaxed'
})

const contextText = computed(() => {
  if (segmentSeconds.value <= 4)
    return 'Focused'
  if (segmentSeconds.value <= 10)
    return 'Broad'
  return 'Extended'
})

function selectPreset(preset: 'voice' | 'meeting' | 'broadcast') {
  segmentSeconds.value = preset === 'meeting' ? 7 : preset === 'broadcast' ? 13 : 3
}
</script>

<template>
  <div class="not-prose glass-card-static my-6 space-y-6 rounded-2xl p-6 sm:p-7">
    <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div class="space-y-1">
        <span class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Cadence &amp; Buffer Explorer</span>
        <div class="text-base font-semibold tracking-tight text-foreground">
          Scenario Presets &amp; Segment Duration
        </div>
      </div>

      <!-- Scenario Preset Pills -->
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="preset-btn cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
          :class="
            activePreset === 'voice'
              ? 'border border-emerald-500/35 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'border border-border bg-[var(--panel-inset)] text-muted-foreground hover:text-foreground'
          "
          @click="selectPreset('voice')"
        >
          Voice Interface (2–4s)
        </button>
        <button
          type="button"
          class="preset-btn cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
          :class="
            activePreset === 'meeting'
              ? 'border border-emerald-500/35 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'border border-border bg-[var(--panel-inset)] text-muted-foreground hover:text-foreground'
          "
          @click="selectPreset('meeting')"
        >
          Live Conversation (5–10s)
        </button>
        <button
          type="button"
          class="preset-btn cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
          :class="
            activePreset === 'broadcast'
              ? 'border border-emerald-500/35 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'border border-border bg-[var(--panel-inset)] text-muted-foreground hover:text-foreground'
          "
          @click="selectPreset('broadcast')"
        >
          Broadcast Feed (12s+)
        </button>
      </div>
    </div>

    <!-- Slider Track -->
    <div class="space-y-3 rounded-xl border border-border bg-[var(--panel-inset)] p-4 sm:p-5">
      <div class="flex items-center justify-between text-sm">
        <label for="segment-slider" class="font-medium text-foreground">Target Audio Collection Window</label>
        <span class="rounded-lg border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {{ segmentSeconds }} {{ segmentSeconds === 1 ? 'second' : 'seconds' }}
        </span>
      </div>
      <input
        id="segment-slider"
        v-model.number="segmentSeconds"
        type="range"
        min="2"
        max="15"
        class="emerald-slider w-full"
      >
      <div class="flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>2s · Frequent updates</span>
        <span>8s · Balanced context</span>
        <span>15s · Extended buffer</span>
      </div>
    </div>

    <!-- Live Trade-off Indicators -->
    <div class="grid gap-4 md:grid-cols-3">
      <div class="space-y-2.5 rounded-xl border border-border bg-[var(--panel-inset)] p-4">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">Update Cadence</span>
          <span class="font-mono font-medium text-emerald-600 dark:text-emerald-400">{{ speedText }}</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div class="h-full rounded-full bg-emerald-400 transition-all duration-300" :style="{ width: `${speedPct}%` }" />
        </div>
        <p class="text-xs text-muted-foreground">
          Frequency of completed utterance handoffs.
        </p>
      </div>

      <div class="space-y-2.5 rounded-xl border border-border bg-[var(--panel-inset)] p-4">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">Intra-Segment Context</span>
          <span class="font-mono font-medium text-sky-600 dark:text-sky-400">{{ contextText }}</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div class="h-full rounded-full bg-sky-400 transition-all duration-300" :style="{ width: `${contextPct}%` }" />
        </div>
        <p class="text-xs text-muted-foreground">
          Surrounding speech examined before finalization.
        </p>
      </div>

      <div class="space-y-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div class="font-mono text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Workflow Fit
        </div>
        <p v-if="activePreset === 'voice'" class="text-xs leading-relaxed text-muted-foreground">
          <strong class="font-medium text-foreground">Latency-sensitive workflows (2–4s):</strong> Ideal for voice-driven interfaces requiring frequent conversational turn-taking.
        </p>
        <p v-else-if="activePreset === 'meeting'" class="text-xs leading-relaxed text-muted-foreground">
          <strong class="font-medium text-foreground">Live conversations &amp; meetings (5–10s):</strong> Provides wider sentence boundaries for disambiguating domain terms and proper nouns.
        </p>
        <p v-else class="text-xs leading-relaxed text-muted-foreground">
          <strong class="font-medium text-foreground">Broadcasts &amp; caption feeds (12s+):</strong> Buffers longer passages when timing is flexible, maximizing surrounding speech context.
        </p>
      </div>
    </div>

    <p class="text-xs text-muted-foreground">
      * Segment durations shown above are illustrative configuration examples, not end-to-end latency guarantees.
    </p>
  </div>
</template>
