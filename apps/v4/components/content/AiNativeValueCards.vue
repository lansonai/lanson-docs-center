<template>
  <div class="not-prose my-6 grid gap-4 sm:grid-cols-3">
    <div class="glass-card-static space-y-2 rounded-2xl p-5">
      <div class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        Live Reasoning Layer
      </div>
      <p class="text-sm leading-relaxed text-muted-foreground">
        A separate reasoning model reviews acoustic candidates against full conversation context inside the live pipeline—no post-processing API required.
      </p>
    </div>
    <div class="glass-card-static space-y-2 rounded-2xl p-5">
      <div class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        Zero-Reflow Delivery
      </div>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Receive completed, reviewed speech segments instead of flickering word-by-word provisional guesses.
      </p>
    </div>
    <div class="glass-card-static space-y-2 rounded-2xl p-5">
      <div class="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        Speaker-Faithful
      </div>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Preserves what the speaker actually said—resolving ambiguities without paraphrasing or rewriting.
      </p>
    </div>
  </div>
</template>
