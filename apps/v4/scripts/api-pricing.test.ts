import { describe, expect, it } from 'vitest'
import rates from '../data/api-rate-card.json'
import { availabilityLabel, formatPrice, isRateCard, priceAmount, pricingItem } from '../lib/api-pricing'

describe('shared pricing presentation', () => {
  it('preserves authoritative rates and availability without mutating source data', () => {
    const before = JSON.stringify(rates)
    for (const line of [...rates.base_transcription.tiers, ...rates.addons, ...rates.combinations]) {
      const item = pricingItem(line)
      expect(item.perMinute).toBe(line.usd_per_minute)
      expect(item.perHour).toBe(line.usd_per_hour)
      expect(item.availability).toBe(line.availability)
    }
    expect(JSON.stringify(rates)).toBe(before)
  })

  it('formats exact per-minute and hourly amounts consistently', () => {
    const item = pricingItem(rates.base_transcription.tiers[0]!)
    expect(formatPrice(priceAmount(item, 'minute'))).toBe('$0.0043')
    expect(formatPrice(priceAmount(item, 'hour'))).toBe('$0.258')
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(0.01)).toBe('$0.01')
  })

  it('derives the hourly equivalent only when the source does not supply it', () => {
    const item = pricingItem({ id: 'future', name: 'Future feature', usd_per_minute: 0.02 })
    expect(item.perHour).toBe(1.2)
    expect(item.name).toBe('Future feature')
  })

  it('does not turn unknown availability into available', () => {
    const item = pricingItem({ id: 'future', name: 'Future feature', usd_per_minute: 0.02 })
    expect(item.availability).toBe('unknown')
    expect(availabilityLabel(item.availability)).toBe('Availability unconfirmed')
    expect(availabilityLabel('coming_soon')).toBe('Coming soon')
  })

  it('shows missing/invalid amounts as unavailable instead of free', () => {
    for (const value of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, -1])
      expect(formatPrice(value)).toBe('—')
    expect(formatPrice(1, 'invalid currency')).toBe('—')
  })

  it('gives combinations concise titles and readable feature names', () => {
    const line = rates.combinations.find(item => item.id === 'realtime_refinement_translation')!
    const item = pricingItem(line)
    expect(item.name).toBe('Refinement + translation')
    expect(item.features).toEqual(['Live speech', 'Refinement', 'Translation × 1 language'])
    expect(item.perMinute).toBe(0.0297)
  })

  it('marks add-on amounts without applying another charge', () => {
    const line = rates.addons[0]!
    const item = pricingItem(line, true)
    expect(item.additive).toBe(true)
    expect(item.perMinute).toBe(line.usd_per_minute)
  })

  it('rejects malformed live data so the saved fallback stays usable', () => {
    expect(isRateCard(rates)).toBe(true)
    expect(isRateCard(null)).toBe(false)
    expect(isRateCard({})).toBe(false)
    expect(isRateCard({ ...rates, addons: {} })).toBe(false)
    expect(isRateCard({ ...rates, combinations: [{ ...rates.combinations[0], components: null }] })).toBe(false)
    expect(isRateCard({ ...rates, base_transcription: { tiers: [{ id: 'bad', name: 'Bad', usd_per_minute: -1 }] } })).toBe(false)
  })
})
