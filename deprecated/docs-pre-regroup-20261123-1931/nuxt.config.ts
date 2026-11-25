import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-05',
  devtools: { enabled: true },
  srcDir: '.',
  devServer: {
    allowedHosts: ['.trycloudflare.com', '.deth.us', '.lanson.dev'],
  },
  css: ['~/assets/css/main.css', 'vue-sonner/style.css'],
  modules: [
    '@nuxtjs/seo',
    '@nuxtjs/color-mode',
    '@nuxt/content',
    'nuxt-shiki',
    'nuxt-og-image',
    '@nuxt/image',
    '@nuxt/fonts',
  ],
  // Site-wide SEO defaults consumed by @nuxtjs/seo (robots, sitemap, schema.org,
  // canonical URLs, og-image). Keep in sync with lib/config.ts `siteConfig`.
  site: {
    url: 'https://docs.lansonai.com',
    name: 'LansonAI Docs',
    description:
      'Developer documentation for Lanson Live API — LansonAI\'s Voice Context Layer for Live Speech, powered by Trinity Engine, StableStream™, and LiveFinal™.',
    defaultLocale: 'en',
    indexable: true,
  },
  robots: {
    allow: '/',
    // API endpoints are not pages; keep crawlers out of them.
    disallow: ['/api/'],
    sitemap: '/sitemap.xml',
  },
  sitemap: {
    // /raw/** is agent-facing markdown and /api/** is JSON — neither belongs in
    // the HTML sitemap. Docs pages live behind a dynamic `[...slug]` route, so
    // they are enumerated from the content collection via this source.
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/api/**', '/raw/**'],
    autoLastmod: true,
  },
  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'LansonAI',
      url: 'https://www.lansonai.com',
      logo: 'https://docs.lansonai.com/logo.svg',
    },
  },
  // classSuffix must be empty so <html> gets `dark`/`light` classes —
  // the default `-mode` suffix (`dark-mode`) never matches the `.dark`
  // CSS variables and Tailwind `dark:` variant.
  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark',
  },
  components: [
    { path: '~/components', ignore: ['_internal/*', '_internal/**/*', 'examples/*', 'examples/**/*'] },
    { path: '~/components/demo', pathPrefix: false },
    { path: '~/components/content', global: true, pathPrefix: false },
    {
      path: '~/registry/new-york-v4/ui/accordion',
      global: true,
      pathPrefix: false,
      ignore: ['*.ts'],
    },
  ],
  content: {
    build: {
      markdown: {
        highlight: false,
      },
    },
    // No D1 database — content is baked into a SQLite file at build time and
    // queried through Nuxt Content's REST API (queryCollection & friends) at runtime.
    experimental: {
      sqliteConnector: 'native',
    },
  },
  shiki: {
    defaultTheme: {
      light: 'github-light-default',
      dark: 'github-dark',
    },
    bundledLangs: [
      'ts',
      'tsx',
      'js',
      'vue',
      'html',
      'json',
      'bash',
      'astro',
      'toml',
      'python',
    ],
  },
  vite: {
    server: {
      allowedHosts: ['.trycloudflare.com', '.deth.us', '.lanson.dev'],
      // Prevent dev module caching across dev-server restarts: Nuxt marks
      // /_nuxt/** immutable, so a restart changes ?v= hashes while browsers
      // keep serving stale modules -> silent hydration failure.
      headers: { 'Cache-Control': 'no-cache, must-revalidate' },
    },
    plugins: [
      tailwindcss() as any,
      {
        // Chrome's module loader percent-encodes `+` in import specifiers
        // (`@nuxt+kit` -> `@nuxt%2Bkit`), but Vite's module graph registers
        // the raw `+` path — the lookup misses, the request falls through to
        // the SSR renderer and returns HTML, and the module fails with
        // "Failed to fetch dynamically imported module" -> hydration dies.
        // Decode %2B back to + before Vite's transform middleware runs.
        name: 'decode-plus-in-module-paths',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url?.includes('%2B')) {
              req.url = req.url.replaceAll('%2B', '+')
            }
            if (req.url?.endsWith('.css') || req.url?.includes('.css?')) {
              console.log('[css-req]', req.url.slice(-50), '| accept:', req.headers.accept, '| dest:', req.headers['sec-fetch-dest'])
            }
            next()
          })
        },
      },
    ] as any,
    optimizeDeps: {
      include: [
        '@lucide/vue',
        '@vueuse/core',
        'class-variance-authority',
        'clsx',
        'reka-ui',
        'tailwind-merge',
      ],
    },
    ssr: {
      noExternal: [
        '@tabler/icons-vue',
        '@lucide/vue',
        '@hugeicons/vue',
        '@hugeicons/core-free-icons',
        '@phosphor-icons/vue',
        '@remixicon/vue',
      ],
    },
  },
  build: {
    transpile: ['vee-validate', 'vue-sonner'],
  },
  routeRules: {
    // Keep bookmarked Start/SDK URLs working without separate introductory pages.
    '/docs/start': { redirect: { to: '/docs/start/quickstart', statusCode: 301 } },
    '/docs/start/sdks': { redirect: { to: '/docs/start/quickstart', statusCode: 301 } },
    '/raw/docs/start.md': { redirect: { to: '/raw/docs/start/quickstart.md', statusCode: 301 } },
    '/raw/docs/start/sdks.md': { redirect: { to: '/raw/docs/start/quickstart.md', statusCode: 301 } },
    // NOTE: no immutable cache header for /_nuxt/** here — in dev it would
    // cache-bust Vite modules across server restarts and break hydration.
    // Production asset caching is handled at the CF layer (hashed filenames).
    // Pages - prerender as static (reset on each deploy)
    '/docs/**': { prerender: true },
    // Redirect legacy /status/lanson-audio path to /status
    '/status/lanson-audio': { redirect: { to: '/status', statusCode: 302 } },
    // Concept duplicates: explanation ownership sits with the AI-Native group.
    // Keep old URLs working, but land on the AI-Native counterpart.
    '/docs/concepts/stable-vs-partial-text': { redirect: { to: '/docs/ai-native-transcription/stablestream', statusCode: 301 } },
    '/docs/concepts/stablestream': { redirect: { to: '/docs/ai-native-transcription/stablestream', statusCode: 301 } },
    '/docs/concepts/context-aware-processing': { redirect: { to: '/docs/ai-native-transcription/context-aware-refinement', statusCode: 301 } },
    '/docs/concepts/live-translation': { redirect: { to: '/docs/realtime/realtime-translation', statusCode: 301 } },
    '/docs/concepts/trinity-engine': { redirect: { to: '/docs/concepts', statusCode: 301 } },
    '/docs/concepts/livefinal': { redirect: { to: '/docs/ai-native-transcription/livefinal', statusCode: 301 } },
    // JSON API - edge-cached at CF, survives across Worker invocations
    '/api/**': {
      headers: {
        'cache-control': 'public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400',
      },
    },
    // Live monitoring status endpoint - short cache for real-time status
    '/api/monitoring/**': {
      headers: {
        'cache-control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
      },
    },
    // Raw markdown endpoint
    '/raw/**': {
      headers: {
        'cache-control': 'public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400',
      },
    },
  },
  nitro: {
    preset: 'vercel',
    compressPublicAssets: true,
    prerender: {
      crawlLinks: true,
      // robots.txt / sitemap.xml are generated by @nuxtjs/seo at build time so
      // they are served as static assets instead of hitting the server function.
      routes: ['/', '/robots.txt', '/sitemap.xml'],
      failOnError: false,
      autoSubfolderIndex: false,
    },
    serverAssets: [
      { baseName: 'blocks', dir: '../registry/new-york-v4/blocks' },
    ],
  },
  app: {
    head: {
      link: [
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        // Geist/Geist Mono are emitted eagerly by @nuxt/fonts (see `fonts.families`).
        // Other fonts are resolved on demand via useFontLoader() + unifont, which
        // still hits Bunny at runtime — hence the preconnect.
        { rel: 'preconnect', href: 'https://fonts.bunny.net', crossorigin: '' },
      ],
      meta: [{ name: 'keywords', content: 'LansonAI,Docs,Speech API,Realtime Transcription,Voice Context Layer' }],
    },
  },
  fonts: {
    defaults: {
      subsets: ['latin'],
      styles: ['normal'],
    },
    // `global: true` emits the @font-face into nuxt-fonts-global.css, which is both
    // how the docs get Geist without a render-blocking external stylesheet and how
    // nuxt-og-image discovers the family at build time.
    families: [
      { name: 'Geist', weights: [400, 500, 600, 700], global: true },
      { name: 'Geist Mono', weights: [400, 500], global: true },
    ],
  },
})
