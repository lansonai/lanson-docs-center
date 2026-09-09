<script setup lang="ts">
import { siteConfig } from '@/lib/config'
import { Separator } from '@/registry/new-york-v4/ui/separator'
import { Button } from '@/styles/reka-nova/ui/button'

const { data } = await useNavigation()
const docData = computed(() => data.value!.find(i => i.stem === 'docs')!)
</script>

<template>
  <header class="sticky top-0 z-50 w-full bg-background">
    <div class="container-wrapper px-6 group-has-data-[slot=designer]/layout:max-w-none 3xl:fixed:px-0">
      <div class="flex h-(--header-height) items-center **:data-[slot=separator]:h-4! group-has-data-[slot=designer]/layout:fixed:max-w-none 3xl:fixed:container">
        <MobileNav
          :tree="data ?? []"
          :items="siteConfig.navItems"
          class="flex lg:hidden"
        />
        <MainNav :items="siteConfig.navItems" class="hidden lg:flex" />
        <div class="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
          <div class="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
            <CommandMenu :tree="docData" :nav-items="siteConfig.navItems" />
          </div>
          <Separator
            orientation="vertical"
            class="ml-2 hidden lg:block"
          />
          <GitHubLink />
          <Separator orientation="vertical" />
          <ModeSwitcher />
          <!-- <DesignerActions /> -->
        </div>
      </div>
    </div>
  </header>
</template>
