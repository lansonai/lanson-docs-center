// Current version of Nuxt Content has limitation to render grouped content, thus required manual mapping
// https://github.com/nuxt/content/issues/3119

import type { ContentNavigationItem } from '@nuxt/content'

export type NavigationItemType = 'page' | 'component' | 'block' | 'group'

// @see ContentNavigationItem
export interface NavigationItem {
  title: string
  path: string
  stem?: string
  children?: NavigationItem[]
  page?: false
  type?: NavigationItemType
  [key: string]: unknown
}

const SECTION_TITLES: Record<string, string> = {
  '/docs/ai-native-transcription': 'AI-Native Transcription',
  '/docs/start': 'Start',
  '/docs/realtime': 'Realtime',
  '/docs/recorded': 'Recorded',
  '/docs/concepts': 'Concepts',
  '/docs/guides': 'Guides',
  '/docs/api-reference': 'API Reference',
  '/docs/production': 'Production',
}

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

// TODO: Find a better heuristic to determine item type
function navigationItemType(item: ContentNavigationItem, parent: ContentNavigationItem | null): 'component' | 'block' | 'group' | 'page' {
  if (parent) {
    if (parent.title === 'Components') {
      return 'component'
    }
    if (parent.title === 'Blocks') {
      return 'block'
    }
  }
  if (item.children && item.children.length > 0) {
    return 'group'
  }
  return 'page'
}

function sortByStem<T extends { stem?: string, path?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    naturalCollator.compare(String(a.stem ?? a.path ?? ''), String(b.stem ?? b.path ?? '')),
  )
}

function mapWithType(item: ContentNavigationItem, parent: ContentNavigationItem | null): NavigationItem {
  const isGroup = Boolean(item.children && item.children.length > 0)
  const sortedChildren = item.children ? sortByStem(item.children) : undefined
  return {
    ...item,
    title: isGroup ? (SECTION_TITLES[item.path] ?? item.title) : item.title,
    type: navigationItemType(item, parent),
    children: sortedChildren?.map(child => mapWithType(child, item)),
  }
}

export async function useNavigation() {
  const { data } = useAsyncData('navigation', () => {
    return queryCollectionNavigation('content', ['new'])
  }, {
    default: () => ([]),
    transform: (data) => {
      const doc = data.find(i => i.stem === 'docs')!
      const sortedSections = sortByStem(doc.children ?? [])
      return [{ ...doc, children: sortedSections.map(i => mapWithType(i, doc)) }]
    },
  })

  return {
    data,
  }
}
