// Single source of truth for docs pages that exist by URL but are hidden from
// the desktop sidebar and the mobile menu. Routes keep working and stay
// searchable; they just don't take up sidebar space.
//
// - `reference` section: field dictionaries live under the top-nav Reference
//   entry (`/docs/api-reference`), not in the Docs sidebar.
// - Concept duplicates: explanation ownership sits with the AI-Native group;
//   these pages redirect to their AI-Native counterparts via nuxt.config.ts.

export const HIDDEN_DOC_SECTIONS: string[] = ['reference', 'api reference']

export const HIDDEN_DOC_PAGES: string[] = [
  '/docs/concepts/stable-vs-partial-text',
  '/docs/concepts/stablestream',
  '/docs/concepts/context-aware-processing',
  '/docs/concepts/live-translation',
  '/docs/concepts/trinity-engine',
  '/docs/concepts/livefinal',
]
