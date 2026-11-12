<script setup lang="ts">
import type { PricePeriod, PricingItem } from '~/types/api-pricing'
import PricingItemView from './PricingItem.vue'

withDefaults(defineProps<{
  items: PricingItem[]
  currency?: string
  period?: PricePeriod
  layout?: 'cards' | 'list'
}>(), { currency: 'USD', period: 'minute', layout: 'list' })
</script>

<template>
  <div :class="layout === 'cards' ? 'grid gap-3 sm:grid-cols-2' : 'divide-y overflow-hidden rounded-xl border bg-card'">
    <PricingItemView
      v-for="item in items"
      :key="item.id"
      :item="item"
      :currency="currency"
      :period="period"
      :layout="layout === 'cards' ? 'card' : 'row'"
    />
  </div>
</template>
