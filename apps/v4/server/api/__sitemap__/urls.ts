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
    .filter((page) => {
      if (!page.path || page.path.startsWith('/raw'))
        return false
      // Unlisted engineering archive: pages under `z.archive/` are reachable
      // at a stable URL but must not surface in the sitemap (and are also
      // covered by `robots.txt`). See content/docs/z.archive/README.
      if (page.path.startsWith('/docs/z.archive/'))
        return false
      return true
    })
    .map(page => ({ loc: page.path }))
})
