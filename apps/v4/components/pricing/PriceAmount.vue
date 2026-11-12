<script setup lang="ts">
import type { PricePeriod } from '~/types/api-pricing'
import { formatPrice } from '~/lib/api-pricing'

withDefaults(defineProps<{
  amount: number | null
  currency?: string
  period?: PricePeriod
  additive?: boolean
}>(), { currency: 'USD', period: 'minute', additive: false })
</script>

<template>
  <div data-slot="price-amount" class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
    <span class="whitespace-nowrap font-semibold tracking-tight tabular-nums">
      {{ additive && amount !== null ? '+' : '' }}{{ formatPrice(amount, currency) }}
    </span>
    <span class="whitespace-nowrap text-xs font-normal text-muted-foreground">
      / audio {{ period }}
    </span>
  </div>
</template>
