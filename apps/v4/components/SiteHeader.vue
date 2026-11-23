<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { siteConfig } from '@/lib/config'
import { Button } from '@/registry/new-york-v4/ui/button'
import { Separator } from '@/registry/new-york-v4/ui/separator'

const { data } = await useNavigation()
const docData = computed(() => data.value!.find(i => i.stem === 'docs')!)
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
    <div class="container-wrapper px-6 group-has-data-[slot=designer]/layout:max-w-none">
      <div class="flex h-(--header-height) items-center gap-3 **:data-[slot=separator]:h-4! group-has-data-[slot=designer]/layout:fixed:max-w-none 3xl:fixed:container">
        <MobileNav
          :tree="data ?? []"
          :items="siteConfig.navItems"
          class="flex lg:hidden"
        />

        <NuxtLink
          to="/"
          class="group flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          <img
            src="/lanson-live-logo.png"
            alt="Lanson Live API"
            class="size-6 object-contain"
          >
          <span class="tracking-tight">Lanson Live API</span>
        </NuxtLink>

        <Separator
          orientation="vertical"
          class="hidden lg:block"
        />

        <MainNav :items="siteConfig.navItems" class="hidden lg:flex" />

        <div class="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
          <div class="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
            <CommandMenu :tree="docData" :nav-items="siteConfig.navItems" />
          </div>
          <Separator
            orientation="vertical"
            class="ml-1 hidden md:block"
          />
          <Button variant="outline" size="sm" as-child class="hidden border-border/80 bg-background/60 sm:inline-flex">
            <a href="https://developer.lansonai.com" target="_blank" rel="noopener noreferrer">
              Console
              <ArrowUpRight class="size-3.5 opacity-70" />
            </a>
          </Button>
          <ModeSwitcher />
        </div>
      </div>
    </div>
  </header>
</template>
