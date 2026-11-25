/**
 * Submit every sitemap URL to IndexNow after deployment.
 *
 * IndexNow is consumed by Bing (and therefore Copilot / ChatGPT search),
 * Yandex and Naver. Google ignores it, so this is a complement to Google
 * Search Console, not a replacement.
 *
 * The key file must be publicly reachable at `/<KEY>.txt` — it lives in
 * `public/` and is baked into the build.
 */

import process from 'node:process'

const SITE_URL = 'https://docs.lansonai.com'
const INDEXNOW_KEY = '02bb32ed06eafc42f41fd63f62cbcbad'
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`

async function sitemapUrls(): Promise<string[]> {
  const res = await fetch(`${SITE_URL}/sitemap.xml`)
  if (!res.ok) {
    throw new Error(`sitemap.xml returned ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]!)
}

console.log('Submitting sitemap URLs to IndexNow...')

const urlList = await sitemapUrls()

if (urlList.length === 0) {
  console.error('No URLs found in sitemap — skipping IndexNow submission.')
  process.exit(0)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: new URL(SITE_URL).host,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  }),
})

// 200 = accepted, 202 = accepted but key still being validated.
if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow accepted ${urlList.length} URLs (HTTP ${res.status}).`)
}
else {
  console.error(`IndexNow submission failed: HTTP ${res.status} ${await res.text()}`)
  process.exit(1)
}
