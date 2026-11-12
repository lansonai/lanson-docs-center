import { queryCollection } from '@nuxt/content/server'

/**
 * Sitemap source for @nuxtjs/sitemap.
 *
 * Docs pages are rendered by the dynamic route `pages/docs/[...slug].vue`, so
 * the router only exposes a single `[...slug]` entry and the sitemap module
 * cannot enumerate them on its own. Query the `content` collection instead so
 * every published Markdown page ends up in `sitemap.xml`.
 */
export default defineSitemapEventHandler(async (event) => {
  const pages = await queryCollection(event, 'content')
    .select('path', 'title')
    .all()

  return pages
    .filter(page => page.path && !page.path.startsWith('/raw'))
    .map(page => ({ loc: page.path }))
})
