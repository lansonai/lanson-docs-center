<script setup lang="ts">
import type { PricePeriod, PricingItem } from '~/types/api-pricing'
import { availabilityLabel, priceAmount } from '~/lib/api-pricing'
import PriceAmount from './PriceAmount.vue'

withDefaults(defineProps<{
  item: PricingItem
  currency?: string
  period?: PricePeriod
  layout?: 'card' | 'row'
}>(), { currency: 'USD', period: 'minute', layout: 'row' })
</script>

<template>
  <article
    data-slot="pricing-item"
    :data-rate-id="item.id"
    :class="layout === 'card'
      ? 'flex h-full flex-col rounded-xl border bg-card p-5'
      : 'grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5 sm:px-5'"
  >
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h3 class="text-sm font-semibold leading-snug text-foreground">
          {{ item.name }}
        </h3>
        <span
          v-if="item.availability !== 'available'"
          class="shrink-0 whitespace-nowrap rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {{ availabilityLabel(item.availability) }}
        </span>
      </div>
      <p v-if="item.description" class="mt-2 text-xs leading-relaxed text-muted-foreground">
        {{ item.description }}
      </p>
      <div v-if="item.features.length" class="mt-2 flex flex-wrap gap-1.5">
        <span v-for="feature in item.features" :key="feature" class="rounded-md bg-muted/50 px-2 py-1 text-[10px] leading-none text-muted-foreground">
          {{ feature }}
        </span>
      </div>
      <details v-if="item.note" class="mt-2 text-xs text-muted-foreground">
        <summary class="w-fit cursor-pointer underline-offset-4 hover:underline">
          Billing details
        </summary>
        <p class="mt-2 max-w-lg leading-relaxed">
          {{ item.note }}
        </p>
      </details>
    </div>
    <PriceAmount
      :amount="priceAmount(item, period)"
      :currency="currency"
      :period="period"
      :additive="item.additive"
      :class="layout === 'card' ? 'mt-auto pt-5 text-2xl' : 'text-lg sm:justify-end'"
    />
  </article>
</template>
