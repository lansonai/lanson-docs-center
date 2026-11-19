// Static docs navigation IA — 4 task-path groups.
// Hidden pages (sdks, production/*, some concepts/guides, api-reference/admin)
// are intentionally omitted here but keep working by URL and remain searchable
// via CommandMenu (which uses the full content tree, not this).

export interface DocsNavItem {
  label: string
  href: string
  new?: boolean
}

export interface DocsNavSubGroup {
  label: string
  items: DocsNavItem[]
}

export type DocsNavLeaf
  = | { kind: 'item', label: string, href: string, new?: boolean }
    | { kind: 'subgroup', label: string, items: DocsNavItem[] }

export interface DocsNavGroup {
  label: string
  children: DocsNavLeaf[]
}

export const DOCS_NAV: DocsNavGroup[] = [
  {
    label: 'Get Started',
    children: [
      { kind: 'item', label: 'Overview', href: '/docs/start' },
      { kind: 'item', label: 'Quickstart', href: '/docs/start/quickstart' },
      { kind: 'item', label: 'Authentication', href: '/docs/start/authentication' },
      { kind: 'item', label: 'Choose an API', href: '/docs/start/choose-an-api' },
    ],
  },
  {
    label: 'Transcription',
    children: [
      {
        kind: 'subgroup',
        label: 'Realtime',
        items: [
          { label: 'Overview', href: '/docs/realtime' },
          { label: 'Quickstart', href: '/docs/realtime/quickstart' },
          { label: 'Audio Input', href: '/docs/realtime/audio-input' },
          { label: 'Session Configuration', href: '/docs/realtime/session-configuration' },
          { label: 'Transcript Lifecycle', href: '/docs/realtime/transcript-lifecycle' },
          { label: 'Connection Lifecycle', href: '/docs/realtime/connection-lifecycle' },
        ],
      },
      {
        kind: 'subgroup',
        label: 'Recorded',
        items: [
          { label: 'Overview', href: '/docs/recorded' },
          { label: 'Transcribe Audio', href: '/docs/recorded/transcribe-audio' },
          { label: 'Timestamps & Speakers', href: '/docs/recorded/timestamps-speakers' },
          { label: 'Subtitles', href: '/docs/recorded/subtitles' },
          { label: 'Structured Results', href: '/docs/recorded/structured-results' },
        ],
      },
      {
        kind: 'subgroup',
        label: 'Translation',
        items: [
          { label: 'Realtime Translation', href: '/docs/realtime/realtime-translation' },
          { label: 'Recorded Translation', href: '/docs/recorded/translation' },
        ],
      },
    ],
  },
  {
    label: 'Build with Lanson',
    children: [
      { kind: 'item', label: 'Stable vs Partial Text', href: '/docs/concepts/stable-vs-partial-text' },
      { kind: 'item', label: 'Context-Aware Processing', href: '/docs/concepts/context-aware-processing' },
      { kind: 'item', label: 'Latency', href: '/docs/concepts/latency' },
      { kind: 'item', label: 'Stable Caption UI', href: '/docs/guides/stable-caption-ui' },
      { kind: 'item', label: 'Server-side Streaming', href: '/docs/guides/server-side-streaming' },
      { kind: 'item', label: 'Save Transcript', href: '/docs/guides/save-transcript' },
      { kind: 'item', label: 'Client-VAD Speech Segments', href: '/docs/guides/client-vad-segments' },
    ],
  },
  {
    label: 'API Reference',
    children: [
      { kind: 'item', label: 'Overview', href: '/docs/api-reference' },
      {
        kind: 'subgroup',
        label: 'Realtime API',
        items: [
          { label: 'Overview', href: '/docs/api-reference/realtime-api' },
          { label: 'Client Messages', href: '/docs/api-reference/client-messages' },
          { label: 'Server Events', href: '/docs/api-reference/server-events' },
        ],
      },
      {
        kind: 'subgroup',
        label: 'Transcription API',
        items: [
          { label: 'Segment Transcription', href: '/docs/api-reference/segment-transcription' },
          { label: 'Batch Jobs', href: '/docs/api-reference/batch-jobs' },
        ],
      },
      { kind: 'item', label: 'Languages', href: '/docs/api-reference/languages' },
      { kind: 'item', label: 'Errors', href: '/docs/api-reference/errors' },
      { kind: 'item', label: 'Rate Limits', href: '/docs/api-reference/rate-limits' },
    ],
  },
]
