import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-05',
  devtools: { enabled: true },
  srcDir: '.',
  devServer: {
    allowedHosts: ['.trycloudflare.com', '.deth.us'],
  },
  css: ['~/assets/css/main.css', 'vue-sonner/style.css'],
  modules: ['@nuxtjs/color-mode', '@nuxt/content', 'nuxt-shiki', 'nuxt-og-image', '@nuxt/image', '@nuxt/fonts'],
  // classSuffix must be empty so <html> gets `dark`/`light` classes —
  // the default `-mode` suffix (`dark-mode`) never matches the `.dark`
  // CSS variables and Tailwind `dark:` variant.
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
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
    database: {
      type: 'd1',
      bindingName: 'DB',
    },
    // required to prevent error related to better-sqlite3 during build and deploy
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
      allowedHosts: ['.trycloudflare.com', '.deth.us'],
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
    // NOTE: no immutable cache header for /_nuxt/** here — in dev it would
    // cache-bust Vite modules across server restarts and break hydration.
    // Production asset caching is handled at the CF layer (hashed filenames).
    // Pages - prerender as static (reset on each deploy)
    '/docs/**': { prerender: true },
    // JSON API - edge-cached at CF, survives across Worker invocations
    '/api/**': {
      headers: {
        'cache-control': 'public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400',
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
    preset: 'cloudflare-module',
    compressPublicAssets: true,
    prerender: {
      crawlLinks: true,
      routes: ['/'],
      failOnError: false,
      autoSubfolderIndex: false,
    },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        name: 'lanson-docs-center',
        d1_databases: [
          {
            binding: 'DB',
            database_id: '4c26cb33-9277-4c9b-8433-42f0a6e84b69',
          },
        ],
        observability: {
          logs: {
            enabled: true,
            head_sampling_rate: 1,
            invocation_logs: true,
          },
        },
      },
    },
    serverAssets: [
      { baseName: 'blocks', dir: '../registry/new-york-v4/blocks' },
    ],
  },
  app: {
    head: {
      link: [
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'shortcut icon', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
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
