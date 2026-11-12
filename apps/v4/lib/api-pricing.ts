import type { PricePeriod, PricingItem, RateCard, RateCardCombination, RateCardLine } from '~/types/api-pricing'

// Labels are presentation only: source IDs, rates and availability are not rewritten.
const labels: Record<string, string> = {
  offline_transcription: 'Recorded speech',
  realtime_transcription: 'Live speech',
  realtime_semantic_turn_detection: 'Live speech + turn detection',
  context_aware_refinement_offline: 'Recorded speech refinement',
  context_aware_refinement_realtime: 'Live speech refinement',
  context_aware_translation: 'Live translation',
  context_aware_translation_offline: 'Recorded translation',
  offline: 'Speech only',
  offline_refinement: 'With refinement',
  offline_refinement_translation: 'Refinement + translation',
  realtime: 'Speech only',
  realtime_turn: 'With turn detection',
  realtime_refinement: 'With refinement',
  realtime_translation: 'With translation',
  realtime_refinement_translation: 'Refinement + translation',
  realtime_turn_refinement_translation: 'Turn detection + refinement + translation',
}

const descriptions: Record<string, string> = {
  offline_transcription: 'Speech clips and recorded audio, through Segment or Batch.',
  realtime_transcription: 'Live captions and speech streamed over WebSocket.',
  realtime_semantic_turn_detection: 'Live speech with semantic turn detection for conversational applications.',
  context_aware_refinement_offline: 'Improve wording, punctuation, and terminology in recordings.',
  context_aware_refinement_realtime: 'Refine each utterance before its transcript is delivered.',
  context_aware_translation: 'Translate live speech into your chosen languages.',
  context_aware_translation_offline: 'Add translated tracks to a recording.',
}

const featureLabels: Record<string, string> = {
  offline_transcription: 'Recorded speech',
  realtime_transcription: 'Live speech',
  realtime_semantic_turn_detection: 'Live speech + turn detection',
  context_aware_refinement_offline: 'Refinement',
  context_aware_refinement_realtime: 'Refinement',
  context_aware_translation: 'Translation × 1 language',
  context_aware_translation_offline: 'Translation × 1 language',
}

function validAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function isRateCard(value: unknown): value is RateCard {
  if (!value || typeof value !== 'object')
    return false
  const card = value as RateCard
  const validLine = (line: RateCardLine): boolean => Boolean(line
    && typeof line.id === 'string'
    && typeof line.name === 'string'
    && validAmount(line.usd_per_minute) !== null
    && (line.usd_per_hour === undefined || validAmount(line.usd_per_hour) !== null)
    && (line.availability === undefined || typeof line.availability === 'string'))
  return Array.isArray(card.base_transcription?.tiers)
    && card.base_transcription.tiers.length > 0
    && card.base_transcription.tiers.every(validLine)
    && (card.addons === undefined || (Array.isArray(card.addons) && card.addons.every(validLine)))
    && (card.combinations === undefined || (Array.isArray(card.combinations) && card.combinations.every(line => validLine(line) && Array.isArray(line.components) && line.components.every(id => typeof id === 'string'))))
    && (card.currency === undefined || (typeof card.currency === 'string' && /^[A-Z]{3}$/.test(card.currency)))
}

export function pricingItem(line: RateCardLine | RateCardCombination, additive = false): PricingItem {
  const perMinute = validAmount(line.usd_per_minute)
  const perHour = validAmount(line.usd_per_hour) ?? (perMinute === null ? null : perMinute * 60)
  const components = 'components' in line ? line.components : []
  return {
    id: line.id,
    name: labels[line.id] ?? line.name,
    description: descriptions[line.id] ?? line.description,
    perMinute,
    perHour,
    availability: line.availability ?? 'unknown',
    features: components.map(id => featureLabels[id] ?? labels[id] ?? id),
    note: line.billing_note,
    additive,
  }
}

export function priceAmount(item: PricingItem, period: PricePeriod): number | null {
  return period === 'hour' ? item.perHour : item.perMinute
}

export function formatPrice(value: number | null | undefined, currency = 'USD'): string {
  if (validAmount(value) === null)
    return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value!)
  }
  catch {
    return '—'
  }
}

export function availabilityLabel(status: string): string {
  if (status === 'available')
    return 'Available'
  if (status === 'coming_soon')
    return 'Coming soon'
  return 'Availability unconfirmed'
}
