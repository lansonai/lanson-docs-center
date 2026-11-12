# Shared API pricing UI

Last updated: 2026-11-08

- `components/content/ApiPricing.vue` loads the public rate card, keeps a saved fallback, and owns the display-period/workflow controls. Embed it in Markdown with an explicitly closed MDC block:

  ```md
  ::api-pricing
  ::
  ```

- `PricingCollection.vue` accepts normalized `PricingItem[]`, `currency`, `period` (`minute` or `hour`), and `layout` (`cards` or `list`). Both layouts use the same `PricingItem.vue` renderer.
- `PricingItem.vue` renders names, feature labels, availability, billing details, and amounts. Add-on amounts use the `additive` flag; it does not change the underlying price.
- `PriceAmount.vue` is the shared amount/unit renderer, including inline use. Do not duplicate currency formatting in cards, lists, or tables.
- `lib/api-pricing.ts` validates source data and converts source rate-card lines with `pricingItem()`. Known display labels are separate from billing IDs. Preserve source prices and availability; never mark an unknown status as available.
- `components/content/ApiPricingTable.vue` is a compatibility wrapper for old embeds, not a second pricing implementation.

For example, a Vue caller imports `PricingCollection` from this directory, converts source lines with `pricingItem`, then passes the items and selected period. All rates come from `https://audio.lansonai.com/v1/pricing`; `data/api-rate-card.json` is a fallback, not a reason to call a draft rate published.

Regression coverage: `scripts/api-pricing.test.ts` and `scripts/docs-content.test.ts` (included in the app's `test` script).
