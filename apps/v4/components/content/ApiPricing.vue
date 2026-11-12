<script setup lang="ts">
import type { PricePeriod, RateCard } from '~/types/api-pricing'
import { computed, onMounted, ref } from 'vue'
import PricingCollection from '~/components/pricing/PricingCollection.vue'
import rateCardFallback from '~/data/api-rate-card.json'
import { isRateCard, pricingItem } from '~/lib/api-pricing'

const RATE_CARD_URL = 'https://audio.lansonai.com/v1/pricing'
const card = ref<RateCard>(rateCardFallback)
const stale = ref(false)
const period = ref<PricePeriod>('minute')
const workflow = ref<'realtime' | 'recorded'>('realtime')
const currency = computed(() => card.value.currency ?? 'USD')
const draft = computed(() => card.value.rate_card_status !== 'published')

const tiers = computed(() => (card.value.base_transcription?.tiers ?? []).map(line => pricingItem(line)))
const availableTiers = computed(() => tiers.value.filter(item => item.availability === 'available'))
const upcomingTiers = computed(() => tiers.value.filter(item => item.availability !== 'available'))
const addons = computed(() => (card.value.addons ?? []).map(line => pricingItem(line, true)))
const combinations = computed(() => (card.value.combinations ?? [])
  .filter(line => line.components.some(id => workflow.value === 'recorded'
    ? id === 'offline_transcription'
    : id.startsWith('realtime_')))
  .map(line => pricingItem(line)))

async function refreshRateCard() {
  try {
    const response = await fetch(RATE_CARD_URL, { headers: { accept: 'application/json' } })
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`)
    const payload: unknown = await response.json()
    if (!isRateCard(payload))
      throw new Error('Invalid rate card')
    card.value = payload
    stale.value = false
  }
  catch {
    stale.value = true
  }
}

onMounted(() => void refreshRateCard())
</script>

<template>
  <div data-slot="api-pricing" class="not-prose mt-6 space-y-7">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold tracking-tight">
          Lanson Live API rates
        </h2>
        <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
          {{ currency }} · Billed by processed audio seconds
        </p>
      </div>
      <div class="inline-flex shrink-0 rounded-lg border bg-muted/30 p-1" role="group" aria-label="Display prices per audio minute or hour">
        <button
          v-for="unit in (['minute', 'hour'] as const)"
          :key="unit"
          type="button"
          :aria-pressed="period === unit"
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring"
          :class="period === unit ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
          @click="period = unit"
        >
          Per {{ unit }}
        </button>
      </div>
    </div>

    <div v-if="draft || stale" class="rounded-lg border bg-muted/25 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <p v-if="draft">
        <span class="font-medium text-foreground">Pricing preview.</span>
        These rates are a draft and may change before publication.
      </p>
      <p v-if="stale" :class="draft ? 'mt-1.5' : ''">
        Live rates are temporarily unavailable. Showing the saved rate card from {{ card.rate_card_version ?? 'an unconfirmed date' }}.
      </p>
    </div>

    <section aria-labelledby="speech-rates" class="space-y-3">
      <div>
        <h3 id="speech-rates" class="text-sm font-semibold">
          Speech processing
        </h3>
        <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
          The base rate follows your workflow: recorded audio or live streaming.
        </p>
      </div>
      <PricingCollection v-if="availableTiers.length" :items="availableTiers" :currency="currency" :period="period" layout="cards" />
      <PricingCollection v-if="upcomingTiers.length" :items="upcomingTiers" :currency="currency" :period="period" />
    </section>

    <section v-if="addons.length" aria-labelledby="optional-rates" class="space-y-3">
      <div>
        <h3 id="optional-rates" class="text-sm font-semibold">
          Optional features
        </h3>
        <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
          Added to the base rate when enabled. Translation is charged for each target language.
        </p>
      </div>
      <PricingCollection :items="addons" :currency="currency" :period="period" />
    </section>

    <section v-if="card.combinations?.length" aria-labelledby="combined-rates" class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="combined-rates" class="text-sm font-semibold">
            Example configurations
          </h3>
          <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
            Total rates, including the features shown below.
          </p>
        </div>
        <div class="inline-flex shrink-0 rounded-lg border bg-muted/30 p-1" role="group" aria-label="Example audio workflow">
          <button
            v-for="option in ([{ value: 'realtime', label: 'Live' }, { value: 'recorded', label: 'Recorded' }] as const)"
            :key="option.value"
            type="button"
            :aria-pressed="workflow === option.value"
            class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            :class="workflow === option.value ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
            @click="workflow = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <PricingCollection :items="combinations" :currency="currency" :period="period" />
    </section>

    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
      <span>Rate card {{ card.rate_card_version ?? 'version unconfirmed' }}</span>
      <a :href="RATE_CARD_URL" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 transition-colors hover:text-foreground">
        View rate details ↗
      </a>
    </div>
  </div>
</template>
