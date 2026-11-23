<script setup lang="ts">
import { SidebarProvider } from '@/registry/new-york-v4/ui/sidebar'

const { data } = await useNavigation()
const docData = computed(() => data.value!.find(i => i.stem === 'docs')!)
</script>

<template>
  <div class="container-wrapper relative flex flex-1 flex-col px-6">
    <!-- Background Atmosphere -->
    <div class="ambient-glow pointer-events-none fixed inset-0 z-0" />
    <div class="bg-dot-grid pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px]" />

    <SidebarProvider
      class="relative z-10 min-h-min flex-1 items-start px-0 [--top-spacing:0] lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:[--top-spacing:calc(var(--spacing)*3)] 3xl:fixed:container 3xl:fixed:px-3"
      :style="{ '--sidebar-width': '15.5rem' }"
    >
      <DocsSidebar :tree="docData" />
      <div class="h-full w-full">
        <NuxtPage />
      </div>
    </SidebarProvider>
  </div>
</template>
