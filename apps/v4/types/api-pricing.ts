export type PricePeriod = 'minute' | 'hour'

export interface RateCardLine {
  id: string
  name: string
  usd_per_minute: number
  usd_per_hour?: number
  availability?: string
  surface?: string
  description?: string
  billing_note?: string
}

export interface RateCardCombination extends RateCardLine {
  components: string[]
  example?: string
}

export interface RateCard {
  rate_card_status?: string
  rate_card_version?: string
  currency?: string
  base_transcription?: { tiers?: RateCardLine[] }
  addons?: RateCardLine[]
  combinations?: RateCardCombination[]
}

export interface PricingItem {
  id: string
  name: string
  description?: string
  perMinute: number | null
  perHour: number | null
  availability: string
  features: string[]
  note?: string
  additive?: boolean
}
