<script setup lang="ts">
import { siteConfig } from '@/lib/config'
</script>

<template>
  <footer class="relative z-10 border-t border-border group-has-[.docs-nav]/body:pb-20 group-has-[[data-slot=designer]]/body:hidden group-has-[[data-slot=docs]]/body:hidden group-has-[.docs-nav]/body:sm:pb-0">
    <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
      <div class="flex items-center gap-3">
        <span>
          © {{ new Date().getFullYear() }}
          <a
            :href="siteConfig.links.website"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LansonAI website"
            class="transition-colors hover:text-foreground"
          >LansonAI</a>. All rights reserved.
        </span>
        <span class="hidden text-border sm:inline">·</span>
        <span class="hidden sm:inline">The voice context layer between People and machine.</span>
      </div>
      <div class="flex items-center gap-5">
        <NuxtLink to="/docs/ai-native-transcription" class="transition-colors hover:text-foreground">
          Docs
        </NuxtLink>
        <NuxtLink to="/docs/api-reference" class="transition-colors hover:text-foreground">
          Reference
        </NuxtLink>
        <NuxtLink to="/status" class="flex items-center gap-1.5 transition-colors hover:text-foreground">
          <span class="size-1.5 rounded-full bg-emerald-400" />
          <span>All systems operational</span>
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>
