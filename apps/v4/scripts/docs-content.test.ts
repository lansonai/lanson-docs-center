import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))

function markdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : []
  })
}

describe('documentation structure', () => {
  it('lets the page template own the only top-level title, without changing code comments', () => {
    for (const file of markdownFiles(resolve(root, 'content/docs'))) {
      const body = readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '')
      const prose = body.replace(/```[^\n]*\n[\s\S]*?```/g, '')
      expect(prose, file).not.toMatch(/^# /m)
    }
  })

  it('places the six AI-Native Transcription pages in their own group before Start', () => {
    const aiNativeTitles = markdownFiles(resolve(root, 'content/docs/0.ai-native-transcription'))
      .sort()
      .map(file => readFileSync(file, 'utf8').match(/^title: (.+)$/m)?.[1])
    expect(aiNativeTitles).toEqual([
      'What is AI-native Transcription',
      'StableStream™',
      'Context-aware Refinement',
      'Conversation Context',
      'LiveFinal™',
      'AI-ready Transcripts',
    ])
  })

  it('keeps no "overview" wording anywhere in docs titles, headings, or AI docs', () => {
    const sources = [...markdownFiles(resolve(root, 'content/docs')), resolve(root, 'public/llms.txt')]
    for (const file of sources) {
      const body = readFileSync(file, 'utf8')
      const title = body.match(/^title: (.+)$/m)?.[1] ?? ''
      expect(title.toLowerCase(), `${file} title`).not.toContain('overview')
      const prose = body.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[^\n]*\n[\s\S]*?```/g, '')
      expect(prose, `${file} headings`).not.toMatch(/^## .*overview/im)
    }
  })

  it('keeps only the four requested Start pages', () => {
    const titles = markdownFiles(resolve(root, 'content/docs/1.start'))
      .sort()
      .map(file => readFileSync(file, 'utf8').match(/^title: (.+)$/m)?.[1])
    expect(titles).toEqual(['Get started with Lanson Live API', 'Authentication', 'Choose an API', 'Pricing'])
    const aiDocs = readFileSync(resolve(root, 'public/llms.txt'), 'utf8')
    expect(aiDocs).not.toContain('[Overview](/docs/start)')
    expect(aiDocs).not.toContain('[SDKs]')
  })

  it('retains redirect definitions for bookmarked Start and SDK URLs', () => {
    const config = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toMatch(/'\/docs\/start': \{ redirect: \{ to: '\/docs\/start\/quickstart', statusCode: 301 \}/)
    expect(config).toMatch(/'\/docs\/start\/sdks': \{ redirect: \{ to: '\/docs\/start\/quickstart', statusCode: 301 \}/)
  })

  it('closes the pricing component block before following Markdown sections', () => {
    const page = readFileSync(resolve(root, 'content/docs/1.start/6.pricing.md'), 'utf8')
    expect(page).toContain('::api-pricing\n::')
    expect(page.indexOf('::api-pricing\n::')).toBeLessThan(page.indexOf('## Credits, balance, and top-ups'))
    expect(page).not.toContain('<ApiPricing />')
  })

  it('keeps References and duplicate Concepts out of the Docs sidebar, without breaking routes', () => {
    const hidden = readFileSync(resolve(root, 'lib/docs-sidebar.ts'), 'utf8')
    expect(hidden).toContain(`'/docs/concepts/stablestream'`)
    expect(hidden).toContain(`'/docs/concepts/livefinal'`)
    expect(hidden).toContain(`'/docs/concepts/context-aware-processing'`)
    const sidebar = readFileSync(resolve(root, 'components/DocsSidebar.vue'), 'utf8')
    expect(sidebar).toContain('HIDDEN_DOC_SECTIONS')
    expect(sidebar).toContain('HIDDEN_DOC_PAGES')
    const mobile = readFileSync(resolve(root, 'components/MobileNav.vue'), 'utf8')
    expect(mobile).toContain('HIDDEN_DOC_SECTIONS')
    expect(mobile).toContain('HIDDEN_DOC_PAGES')
    const config = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toContain(`'/docs/concepts/stablestream': { redirect: { to: '/docs/ai-native-transcription/stablestream', statusCode: 301 } }`)
    expect(config).toContain(`'/docs/concepts/livefinal': { redirect: { to: '/docs/ai-native-transcription/livefinal', statusCode: 301 } }`)
    expect(config).toContain(`'/docs/concepts/context-aware-processing': { redirect: { to: '/docs/ai-native-transcription/context-aware-refinement', statusCode: 301 } }`)
  })

  it('keeps Markdown and AI documentation links on existing routes', () => {
    const docs = resolve(root, 'content')
    const files = markdownFiles(resolve(docs, 'docs'))
    const routes = new Set(files.map((file) => {
      const route = file.slice(docs.length).replaceAll('\\', '/').replace(/\/(\d+)\./g, '/').replace(/\.md$/, '')
      return route.replace(/\/index$/, '')
    }))
    const sources = [...files, resolve(root, 'public/llms.txt')]
    for (const file of sources) {
      for (const match of readFileSync(file, 'utf8').matchAll(/\]\((\/docs[^\s)#?]*)/g))
        expect(routes.has(match[1]!), `${file}: ${match[1]}`).toBe(true)
    }
  })
})
