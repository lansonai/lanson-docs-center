<script setup lang="ts">
import { IconMoon, IconSun } from '@tabler/icons-vue'
import { Button } from '@/registry/new-york-v4/ui/button'

const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="group/toggle extend-touch-target size-8 cursor-pointer"
    title="Toggle theme"
    aria-label="Toggle theme"
    @click="toggleTheme"
  >
    <IconSun class="hidden size-4.5 dark:block" />
    <IconMoon class="block size-4.5 dark:hidden" />
    <span class="sr-only">Toggle theme</span>
  </Button>
</template>
