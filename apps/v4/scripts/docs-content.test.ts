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
