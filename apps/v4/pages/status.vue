<script setup lang="ts">
import type { BarStatus, HistoryBar, PublicServiceStatus } from '@/lib/status-telemetry'
import type { LansonAudioMonitoringResponse } from '~/types/monitoring/lanson-audio'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  AudioLines,
  Bell,
  CheckCircle2,
  Clock,
  FileAudio,
  Languages,
  Layers,
  Mail,
  RefreshCw,
  Server,
  ShieldCheck,
  Waves,
  Webhook,
  XCircle,
} from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  buildDailyBars,
  buildEvaluatedServices,
  buildHourlyBars,
  computeServerAvailabilityPct,
  evaluateOverallStatus,
} from '@/lib/status-telemetry'
import { Badge } from '@/registry/new-york-v4/ui/badge'
import { Button } from '@/registry/new-york-v4/ui/button'
import { Card } from '@/registry/new-york-v4/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/registry/new-york-v4/ui/dialog'
import { Input } from '@/registry/new-york-v4/ui/input'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/registry/new-york-v4/ui/tabs'

const title = 'Platform Status'
const description
  = 'Current operational status and historical availability for Lanson Live API.'

useSeoMeta({
  title,
  description,
  ogTitle: `${title} - Lanson Live API`,
  ogDescription: description,
  twitterCard: 'summary_large_image',
})

const currentLang = ref<'en' | 'zh'>('en')

// SSR-first data loading: users see live status immediately on first paint instead of
// waiting for a client-side loading spinner. 24h and 90d are fetched in parallel on the
// server (backed by server-side SWR cache); 90d failure never blocks 24h current status.
const { data: initialPayload } = await useAsyncData(
  'lanson-live-status',
  async () => {
    const [current, longRange] = await Promise.all([
      $fetch<LansonAudioMonitoringResponse>('/api/monitoring/lanson-audio/overview', {
        query: { environment: 'production', range: '24h' },
      }).catch(() => null),
      $fetch<LansonAudioMonitoringResponse>('/api/monitoring/lanson-audio/overview', {
        query: { environment: 'production', range: '90d' },
      }).catch(() => null),
    ])
    return { current, longRange }
  },
)

const data = ref<LansonAudioMonitoringResponse | null>(initialPayload.value?.current ?? null)
const history = ref<LansonAudioMonitoringResponse | null>(initialPayload.value?.longRange ?? null)
const loading = ref(!data.value)
const isRefetching = ref(false)
const errorMsg = ref<string | null>(null)
const lastUpdatedIso = ref<string>(data.value?.meta?.generatedAt ?? '')

// Auto-refresh timer (30s for current status; 90d history refreshes on manual refresh)
const REFRESH_INTERVAL_SEC = 30
const secondsRemaining = ref(REFRESH_INTERVAL_SEC)
let timer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  if (timer)
    clearInterval(timer)
  secondsRemaining.value = REFRESH_INTERVAL_SEC
  timer = setInterval(() => {
    secondsRemaining.value--
    if (secondsRemaining.value <= 0) {
      fetchStatus(false, false)
      secondsRemaining.value = REFRESH_INTERVAL_SEC
    }
  }, 1000)
}

async function fetchStatus(isInitial = false, includeLongRange = true) {
  if (isInitial && !data.value)
    loading.value = true
  else isRefetching.value = true
  errorMsg.value = null

  try {
    const current = await $fetch<LansonAudioMonitoringResponse>('/api/monitoring/lanson-audio/overview', {
      query: {
        environment: 'production',
        range: '24h',
      },
    })
    data.value = current
    lastUpdatedIso.value = current.meta?.generatedAt || new Date().toISOString()
    secondsRemaining.value = REFRESH_INTERVAL_SEC
    loading.value = false

    if (includeLongRange || !history.value) {
      $fetch<LansonAudioMonitoringResponse>('/api/monitoring/lanson-audio/overview', {
        query: {
          environment: 'production',
          range: '90d',
        },
      })
        .then((longRange) => {
          history.value = longRange
        })
        .catch(() => {})
    }
  }
  catch (err: any) {
    errorMsg.value = err?.message || 'Failed to retrieve status'
  }
  finally {
    loading.value = false
    isRefetching.value = false
  }
}

onMounted(() => {
  if (!data.value)
    fetchStatus(true, true)
  startCountdown()
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})

const statusWindowMinutes = computed(() => data.value?.meta?.statusWindowMinutes ?? 15)

const evaluatedServices = computed(() => buildEvaluatedServices(data.value, loading.value))
const coreServices = computed(() => evaluatedServices.value.coreServices)
const additionalServices = computed(() => evaluatedServices.value.additionalServices)

const SERVICE_ICONS: Record<string, typeof AudioLines> = {
  'realtime-streaming': AudioLines,
  'batch-processing': FileAudio,
  'api-gateway': Server,
  'language-detection': Languages,
  'audio-classification': Layers,
}

function serviceIcon(id: string) {
  return SERVICE_ICONS[id] ?? Activity
}

const SERVICE_STATUS_META: Record<PublicServiceStatus, { en: string, zh: string, badge: string, dot: string }> = {
  operational: {
    en: 'Operational',
    zh: '正常',
    badge: 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  degraded: {
    en: 'Degraded',
    zh: '降级',
    badge: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  down: {
    en: 'Outage',
    zh: '异常',
    badge: 'border-rose-500/25 bg-rose-500/[0.08] text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  checking: {
    en: 'Checking',
    zh: '检测中',
    badge: 'border-border bg-muted/40 text-muted-foreground',
    dot: 'bg-muted-foreground/60 animate-pulse',
  },
  unknown: {
    en: 'Unknown',
    zh: '未知',
    badge: 'border-border bg-muted/50 text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
}

function serviceStatusMeta(status: PublicServiceStatus) {
  return SERVICE_STATUS_META[status]
}

const operationalCoreCount = computed(() =>
  coreServices.value.filter(s => s.status === 'operational').length,
)

const overallStatus = computed<'operational' | 'degraded' | 'down' | 'unknown'>(() =>
  evaluateOverallStatus(data.value, coreServices.value, additionalServices.value),
)

const statusConfig = computed(() => {
  const isEn = currentLang.value === 'en'
  const w = statusWindowMinutes.value

  if (loading.value) {
    return {
      title: isEn ? 'Checking platform status…' : '正在检查平台状态…',
      subtitle: isEn ? 'Fetching the latest Lanson Live API service status.' : '正在同步 Lanson Live API 最新服务状态。',
      badge: isEn ? 'Checking' : '检查中',
      cardBorder: 'border-border',
      cardBg: 'from-muted/40 via-muted/10 to-transparent',
      accentBar: 'bg-muted-foreground/30',
      iconWrap: 'border-border bg-muted/50 text-muted-foreground',
      text: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
      icon: RefreshCw,
    }
  }

  switch (overallStatus.value) {
    case 'degraded':
      return {
        title: isEn ? 'Degraded Performance' : '部分服务性能降级',
        subtitle: isEn
          ? `One or more Lanson Live API services experienced degraded availability in the last ${w} minutes.`
          : `最近 ${w} 分钟内部分 Lanson Live API 服务出现可用性波动。`,
        badge: isEn ? 'Degraded' : '性能降级',
        cardBorder: 'border-amber-500/30 dark:border-amber-500/25',
        cardBg: 'from-amber-500/[0.08] via-amber-500/[0.02] to-transparent dark:from-amber-500/[0.12] dark:via-amber-500/[0.03] dark:to-transparent',
        accentBar: 'bg-amber-500',
        iconWrap: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
        icon: AlertTriangle,
      }
    case 'down':
      return {
        title: isEn ? 'Major Service Outage' : '核心服务异常中断',
        subtitle: isEn
          ? `Core Lanson Live API services are experiencing a disruption in the current ${w}-minute window.`
          : `最近 ${w} 分钟内 Lanson Live API 核心服务出现可用性中断。`,
        badge: isEn ? 'Major Outage' : '服务异常',
        cardBorder: 'border-rose-500/30 dark:border-rose-500/25',
        cardBg: 'from-rose-500/[0.08] via-rose-500/[0.02] to-transparent dark:from-rose-500/[0.12] dark:via-rose-500/[0.03] dark:to-transparent',
        accentBar: 'bg-rose-500',
        iconWrap: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        text: 'text-rose-600 dark:text-rose-400',
        dot: 'bg-rose-500',
        icon: XCircle,
      }
    case 'unknown':
      return {
        title: isEn ? 'Status Unavailable' : '状态暂不可用',
        subtitle: isEn
          ? 'Live operational status cannot be reached right now.'
          : '当前暂时无法获取实时服务状态。',
        badge: isEn ? 'Unknown' : '未知',
        cardBorder: 'border-border',
        cardBg: 'from-muted/40 via-muted/10 to-transparent',
        accentBar: 'bg-muted-foreground/40',
        iconWrap: 'border-border bg-muted/50 text-muted-foreground',
        text: 'text-muted-foreground',
        dot: 'bg-muted-foreground',
        icon: AlertTriangle,
      }
    default:
      return {
        title: isEn ? 'All Systems Operational' : '所有核心服务运行正常',
        subtitle: isEn
          ? 'All Lanson Live API core services and endpoints are operating normally.'
          : 'Lanson Live API 所有核心服务与端点均运行正常。',
        badge: isEn ? 'Operational' : '正常运行',
        cardBorder: 'border-emerald-500/30 dark:border-emerald-500/25',
        cardBg: 'from-emerald-500/[0.07] via-emerald-500/[0.02] to-transparent dark:from-emerald-500/[0.11] dark:via-emerald-500/[0.03] dark:to-transparent',
        accentBar: 'bg-emerald-500',
        iconWrap: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
      }
  }
})

// ---------------------------------------------------------------------------
// Availability History (24h / 30d / 90d) — pure server availability (excl. 4xx)
// ---------------------------------------------------------------------------
const BAR_CLASS: Record<BarStatus, string> = {
  operational: 'bg-emerald-500 dark:bg-emerald-500',
  degraded: 'bg-amber-500 dark:bg-amber-500',
  down: 'bg-rose-500 dark:bg-rose-500',
  nodata: 'bg-muted-foreground/20 dark:bg-muted-foreground/25',
}

const BAR_DOT_CLASS: Record<BarStatus, string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-rose-500',
  nodata: 'bg-muted-foreground/40',
}

const BAR_STATUS_LABEL: Record<BarStatus, { en: string, zh: string }> = {
  operational: { en: 'Operational', zh: '正常' },
  degraded: { en: 'Degraded', zh: '降级' },
  down: { en: 'Outage', zh: '中断' },
  nodata: { en: 'No data', zh: '无数据' },
}

function barStatusLabel(status: BarStatus): string {
  const meta = BAR_STATUS_LABEL[status]
  return currentLang.value === 'en' ? meta.en : meta.zh
}

const historyRange = ref<'24h' | '30d' | '90d'>('30d')

const rangeOptions = [
  { value: '24h' as const, labelEn: '24h', labelZh: '24小时' },
  { value: '30d' as const, labelEn: '30d', labelZh: '30天' },
  { value: '90d' as const, labelEn: '90d', labelZh: '90天' },
]

function formatDayLabel(ms: number): string {
  return new Intl.DateTimeFormat(currentLang.value === 'en' ? 'en-US' : 'zh-CN', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(ms))
}

function formatHourLabel(ms: number): string {
  return new Intl.DateTimeFormat(currentLang.value === 'en' ? 'en-US' : 'zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(ms))
}

const historyBars = computed<HistoryBar[]>(() => {
  if (historyRange.value === '24h')
    return buildHourlyBars(data.value?.series.requestTimeline ?? [], 24, formatHourLabel)
  const days = historyRange.value === '30d' ? 30 : 90
  return buildDailyBars(history.value?.series.requestTimeline ?? [], days, formatDayLabel)
})

const historyAvailability = computed<number | null>(() => {
  const bars = historyBars.value.filter(bar => bar.requests > 0)
  if (!bars.length)
    return null
  const requests = bars.reduce((sum, bar) => sum + bar.requests, 0)
  const serverErrors = bars.reduce((sum, bar) => sum + bar.serverErrors, 0)
  return computeServerAvailabilityPct(requests, serverErrors)
})

const historyAvailabilityLabel = computed(() =>
  historyAvailability.value === null ? '—' : `${historyAvailability.value.toFixed(2)}%`,
)

const historyRangeLabel = computed(() => {
  const isEn = currentLang.value === 'en'
  if (historyRange.value === '24h')
    return isEn ? '24h availability' : '24 小时可用率'
  if (historyRange.value === '30d')
    return isEn ? '30d availability' : '30 天可用率'
  return isEn ? '90d availability' : '90 天可用率'
})

const historyDescription = computed(() => {
  const isEn = currentLang.value === 'en'
  if (historyRange.value === '24h') {
    return isEn
      ? 'Hourly API availability over the last 24 hours (excludes client 4xx errors).'
      : '过去 24 小时按小时统计的 API 服务端可用率（已排除客户端 4xx 错误）。'
  }
  if (historyRange.value === '30d') {
    return isEn
      ? 'Daily API availability over the last 30 days (excludes client 4xx errors).'
      : '过去 30 天按天统计的 API 服务端可用率（已排除客户端 4xx 错误）。'
  }
  return isEn
    ? 'Daily API availability over the last 90 days (excludes client 4xx errors).'
    : '过去 90 天按天统计的 API 服务端可用率（已排除客户端 4xx 错误）。'
})

const axisStartLabel = computed(() => historyBars.value[0]?.label ?? '')
const axisEndLabel = computed(() => historyBars.value.at(-1)?.label ?? '')

const hoveredIndex = ref(-1)
watch(historyRange, () => {
  hoveredIndex.value = -1
})

const hoveredBar = computed(() => historyBars.value[hoveredIndex.value] ?? null)

const hoveredStatusLabel = computed(() => {
  if (!hoveredBar.value)
    return ''
  return barStatusLabel(hoveredBar.value.status)
})

const tooltipLeft = computed(() => {
  const total = historyBars.value.length
  if (hoveredIndex.value < 0 || total === 0)
    return '0%'
  const pct = ((hoveredIndex.value + 0.5) / total) * 100
  return `${Math.min(92, Math.max(8, pct))}%`
})

const legendItems = computed(() => {
  const isEn = currentLang.value === 'en'
  return [
    { key: 'operational', class: BAR_CLASS.operational, label: isEn ? 'Operational' : '正常' },
    { key: 'degraded', class: BAR_CLASS.degraded, label: isEn ? 'Degraded' : '降级' },
    { key: 'down', class: BAR_CLASS.down, label: isEn ? 'Outage' : '中断' },
    { key: 'nodata', class: BAR_CLASS.nodata, label: isEn ? 'No data' : '无数据' },
  ]
})

// Subscribe Dialog State
const isSubscribeOpen = ref(false)
const subscribeEmail = ref('')
const subscribeWebhook = ref('')
const subscribeTab = ref<'email' | 'webhook'>('email')

function handleSubscribe() {
  if (subscribeTab.value === 'email' && !subscribeEmail.value.trim()) {
    toast.warning(currentLang.value === 'en' ? 'Please enter a valid email' : '请输入订阅邮箱')
    return
  }
  if (subscribeTab.value === 'webhook' && !subscribeWebhook.value.trim()) {
    toast.warning(currentLang.value === 'en' ? 'Please enter a webhook URL' : '请输入 Webhook 地址')
    return
  }
  toast.success(
    currentLang.value === 'en' ? 'Subscribed successfully' : '状态订阅成功',
    {
      description: currentLang.value === 'en'
        ? 'You will be notified whenever status changes or maintenance occurs.'
        : '当服务发生状态波动或维护时，您将收到通知。',
    },
  )
  isSubscribeOpen.value = false
  subscribeEmail.value = ''
  subscribeWebhook.value = ''
}

const formattedLastUpdated = computed(() => {
  if (!lastUpdatedIso.value)
    return '—'
  const date = new Date(lastUpdatedIso.value)
  if (Number.isNaN(date.getTime()))
    return '—'
  const time = date.toLocaleTimeString(currentLang.value === 'en' ? 'en-US' : 'zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
  return `${time} UTC`
})
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Top Header Section -->
    <section class="border-b border-border/60 bg-gradient-to-b from-muted/30 via-muted/10 to-transparent">
      <div class="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-2.5">
            <div class="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] font-mono text-muted-foreground shadow-2xs backdrop-blur-xs">
              <span class="relative flex size-2 items-center justify-center">
                <span class="absolute size-2 rounded-full animate-ping opacity-75" :class="statusConfig.dot" />
                <span class="size-1.5 rounded-full" :class="statusConfig.dot" />
              </span>
              <span class="font-medium text-foreground/90">Lanson Live API</span>
              <span class="text-border">·</span>
              <span>{{ currentLang === 'en' ? 'Production' : '生产环境' }}</span>
            </div>

            <div class="space-y-1.5">
              <h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                {{ currentLang === 'en' ? 'Platform Status' : 'Lanson Live API 平台状态' }}
              </h1>
              <p class="max-w-xl text-sm text-muted-foreground sm:text-base">
                {{ currentLang === 'en'
                  ? 'Current operational status and historical availability for Lanson Live API.'
                  : 'Lanson Live API 实时运行状态与历史可用率。'
                }}
              </p>
            </div>
          </div>

          <!-- Header Actions -->
          <div class="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Dialog v-model:open="isSubscribeOpen">
              <DialogTrigger as-child>
                <Button size="sm" class="h-8 rounded-lg gap-1.5 px-3 text-xs font-medium shadow-2xs">
                  <Bell class="size-3.5" />
                  <span>{{ currentLang === 'en' ? 'Subscribe' : '订阅通知' }}</span>
                </Button>
              </DialogTrigger>
              <DialogContent class="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle class="flex items-center gap-2 text-base">
                    <Bell class="size-4 text-primary" />
                    {{ currentLang === 'en' ? 'Subscribe to Status Updates' : '订阅 Lanson Live API 状态通知' }}
                  </DialogTitle>
                  <DialogDescription class="text-xs leading-relaxed">
                    {{ currentLang === 'en'
                      ? 'Get notified immediately whenever major status changes or scheduled maintenance occur.'
                      : '在服务发生重大变更、维护或异常波动时，实时获取状态推送。'
                    }}
                  </DialogDescription>
                </DialogHeader>

                <Tabs v-model="subscribeTab" class="w-full pt-1">
                  <TabsList class="grid grid-cols-2 w-full h-8 bg-muted/60 text-xs">
                    <TabsTrigger value="email" class="text-xs gap-1.5">
                      <Mail class="size-3" /> Email
                    </TabsTrigger>
                    <TabsTrigger value="webhook" class="text-xs gap-1.5">
                      <Webhook class="size-3" /> Webhook
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="email" class="space-y-3 pt-3 text-xs">
                    <div class="space-y-1.5">
                      <label class="font-medium text-foreground">{{ currentLang === 'en' ? 'Email Address' : '邮箱地址' }}</label>
                      <Input v-model="subscribeEmail" type="email" placeholder="you@company.com" class="h-9 text-xs" />
                    </div>
                    <p class="text-[11px] text-muted-foreground">
                      {{ currentLang === 'en' ? 'We only send critical status alerts. Unsubscribe at any time.' : '仅在发生服务异常或维护时发送通知，可随时退订。' }}
                    </p>
                  </TabsContent>

                  <TabsContent value="webhook" class="space-y-3 pt-3 text-xs">
                    <div class="space-y-1.5">
                      <label class="font-medium text-foreground">Webhook Endpoint</label>
                      <Input v-model="subscribeWebhook" placeholder="https://api.yourdomain.com/status-webhook" class="h-9 text-xs font-mono" />
                    </div>
                    <p class="text-[11px] text-muted-foreground">
                      {{ currentLang === 'en' ? 'Standard JSON payload will be posted on state transitions.' : '事件发生时将推送标准 JSON 状态变更数据。' }}
                    </p>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button variant="ghost" size="sm" @click="isSubscribeOpen = false">
                    {{ currentLang === 'en' ? 'Cancel' : '取消' }}
                  </Button>
                  <Button size="sm" class="font-semibold" @click="handleSubscribe">
                    {{ currentLang === 'en' ? 'Subscribe' : '确认订阅' }}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              class="h-8 rounded-lg gap-1.5 px-2.5 text-xs shadow-2xs"
              :disabled="isRefetching"
              @click="fetchStatus(false, true)"
            >
              <RefreshCw class="size-3.5 text-muted-foreground" :class="isRefetching ? 'animate-spin text-foreground' : ''" />
              <span>{{ currentLang === 'en' ? 'Refresh' : '刷新' }}</span>
              <span class="hidden font-mono text-[10px] text-muted-foreground/80 sm:inline">
                {{ secondsRemaining }}s
              </span>
            </Button>

            <div class="inline-flex h-8 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                class="rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-colors"
                :class="currentLang === 'en' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
                @click="currentLang = 'en'"
              >
                EN
              </button>
              <button
                type="button"
                class="rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-colors"
                :class="currentLang === 'zh' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
                @click="currentLang = 'zh'"
              >
                中文
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <div class="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-9 lg:px-8 space-y-6 sm:space-y-8">
      <!-- Error Banner -->
      <Card v-if="errorMsg" class="py-3.5 px-4 sm:px-5 border-rose-500/30 bg-rose-500/[0.04]">
        <div class="flex items-center gap-2.5 text-sm text-rose-600 dark:text-rose-400">
          <AlertTriangle class="size-4 shrink-0" />
          <span>{{ currentLang === 'en' ? 'Failed to load live status' : '加载实时状态失败' }}: {{ errorMsg }}</span>
        </div>
      </Card>

      <!-- 1. Hero System Status Banner -->
      <Card class="relative overflow-hidden py-0 shadow-xs" :class="statusConfig.cardBorder">
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-br" :class="statusConfig.cardBg" />
        <div class="pointer-events-none absolute inset-x-0 top-0 h-0.5" :class="statusConfig.accentBar" />

        <div class="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="flex min-w-0 items-start gap-3.5 sm:items-center sm:gap-4">
            <div
              class="grid size-10 sm:size-12 shrink-0 place-items-center rounded-xl border shadow-2xs"
              :class="statusConfig.iconWrap"
            >
              <component
                :is="statusConfig.icon"
                class="size-5 sm:size-6"
                :class="loading ? 'animate-spin' : ''"
              />
            </div>

            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-base font-semibold tracking-tight text-foreground sm:text-xl">
                  {{ statusConfig.title }}
                </h2>
              </div>
              <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {{ statusConfig.subtitle }}
              </p>
            </div>
          </div>

          <div class="flex shrink-0 items-center justify-between gap-2 border-t border-border/50 pt-3 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5 sm:border-t-0 sm:pt-0">
            <div class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs backdrop-blur-xs">
              <ShieldCheck class="size-3.5 shrink-0" :class="loading ? 'text-muted-foreground' : 'text-emerald-500'" />
              <span class="font-mono text-[11px]">
                <template v-if="loading">
                  {{ currentLang === 'en' ? 'Checking status…' : '正在同步状态…' }}
                </template>
                <template v-else>
                  {{ currentLang === 'en'
                    ? `${operationalCoreCount}/${coreServices.length} core services operational`
                    : `${operationalCoreCount}/${coreServices.length} 项核心服务正常`
                  }}
                </template>
              </span>
            </div>
            <p class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
              <Clock class="size-3 shrink-0" />
              <span>{{ currentLang === 'en' ? `Updated ${formattedLastUpdated}` : `更新于 ${formattedLastUpdated}` }}</span>
            </p>
          </div>
        </div>
      </Card>

      <!-- 2. Core Services -->
      <section class="space-y-3">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {{ currentLang === 'en' ? 'Core Services' : '核心服务 (Core Services)' }}
          </h2>
          <p class="text-xs text-muted-foreground">
            {{ currentLang === 'en'
              ? `Real-time operational health over the last ${statusWindowMinutes} minutes.`
              : `基于最近 ${statusWindowMinutes} 分钟实时状态判定。`
            }}
          </p>
        </div>

        <Card class="py-0 gap-0 divide-y divide-border/70 overflow-hidden shadow-xs">
          <div
            v-for="service in coreServices"
            :key="service.id"
            class="group flex items-start gap-2.5 px-3.5 py-3.5 transition-colors hover:bg-muted/25 sm:items-center sm:gap-4 sm:px-5 sm:py-4"
          >
            <div class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground transition-colors group-hover:border-border group-hover:text-foreground sm:mt-0 sm:size-10">
              <component :is="serviceIcon(service.id)" class="size-4" />
            </div>

            <div class="min-w-0 flex-1 space-y-1 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
              <div class="min-w-0 space-y-1">
                <div class="flex flex-wrap items-center justify-between gap-2 sm:justify-start">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="whitespace-nowrap text-sm font-medium text-foreground">
                      {{ currentLang === 'en' ? service.name.en : service.name.zh }}
                    </span>
                    <span class="inline-flex items-center rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/80">
                      {{ service.brandTag }}
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    class="shrink-0 gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium sm:hidden"
                    :class="serviceStatusMeta(service.status).badge"
                  >
                    <span class="relative flex size-1.5">
                      <span
                        v-if="service.status === 'operational'"
                        class="absolute inline-flex size-full rounded-full opacity-40"
                        :class="serviceStatusMeta(service.status).dot"
                      />
                      <span class="relative inline-flex size-1.5 rounded-full" :class="serviceStatusMeta(service.status).dot" />
                    </span>
                    <span>{{ currentLang === 'en' ? serviceStatusMeta(service.status).en : serviceStatusMeta(service.status).zh }}</span>
                  </Badge>
                </div>

                <p class="text-xs text-muted-foreground leading-relaxed">
                  {{ currentLang === 'en' ? service.description.en : service.description.zh }}
                </p>

                <p class="no-scrollbar overflow-x-auto whitespace-nowrap font-mono text-[11px] text-muted-foreground/75">
                  {{ service.endpoint }}
                </p>
              </div>

              <Badge
                variant="outline"
                class="hidden shrink-0 gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium sm:inline-flex"
                :class="serviceStatusMeta(service.status).badge"
              >
                <span class="relative flex size-1.5">
                  <span
                    v-if="service.status === 'operational'"
                    class="absolute inline-flex size-full rounded-full opacity-40"
                    :class="serviceStatusMeta(service.status).dot"
                  />
                  <span class="relative inline-flex size-1.5 rounded-full" :class="serviceStatusMeta(service.status).dot" />
                </span>
                <span>{{ currentLang === 'en' ? serviceStatusMeta(service.status).en : serviceStatusMeta(service.status).zh }}</span>
              </Badge>
            </div>
          </div>
        </Card>
      </section>

      <!-- 3. Additional Capabilities -->
      <section class="space-y-3">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
            {{ currentLang === 'en' ? 'Additional Capabilities' : '辅助能力 (Additional Capabilities)' }}
          </h2>
          <p class="text-xs text-muted-foreground">
            {{ currentLang === 'en'
              ? 'Independent endpoints with isolated fault domains.'
              : '具有独立故障域的辅助能力端点。'
            }}
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <Card
            v-for="service in additionalServices"
            :key="service.id"
            class="py-0 shadow-2xs transition-colors hover:bg-muted/20"
          >
            <div class="flex items-start justify-between gap-3 p-3.5 sm:p-4">
              <div class="flex min-w-0 items-start gap-3">
                <div class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
                  <component :is="serviceIcon(service.id)" class="size-4" />
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="text-sm font-medium text-foreground">
                    {{ currentLang === 'en' ? service.name.en : service.name.zh }}
                  </p>
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    {{ currentLang === 'en' ? service.description.en : service.description.zh }}
                  </p>
                  <p class="no-scrollbar overflow-x-auto whitespace-nowrap font-mono text-[10px] text-muted-foreground/75">
                    {{ service.endpoint }}
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                class="shrink-0 gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium"
                :class="serviceStatusMeta(service.status).badge"
              >
                <span class="relative flex size-1.5">
                  <span
                    v-if="service.status === 'operational'"
                    class="absolute inline-flex size-full rounded-full opacity-40"
                    :class="serviceStatusMeta(service.status).dot"
                  />
                  <span class="relative inline-flex size-1.5 rounded-full" :class="serviceStatusMeta(service.status).dot" />
                </span>
                <span>{{ currentLang === 'en' ? serviceStatusMeta(service.status).en : serviceStatusMeta(service.status).zh }}</span>
              </Badge>
            </div>
          </Card>
        </div>
      </section>

      <!-- 4. Availability History (24h / 30d / 90d) -->
      <Card class="py-0 shadow-xs">
        <div class="space-y-4 p-4 sm:p-6">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <h2 class="whitespace-nowrap text-base font-semibold tracking-tight text-foreground">
                  {{ currentLang === 'en' ? 'Availability History' : '可用率历史' }}
                </h2>
                <span class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] px-1.5 sm:px-2 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {{ historyAvailabilityLabel }}
                  <span class="hidden font-sans text-[11px] font-normal text-muted-foreground sm:inline">
                    {{ historyRangeLabel }}
                  </span>
                </span>
              </div>

              <div class="inline-flex shrink-0 items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
                <button
                  v-for="option in rangeOptions"
                  :key="option.value"
                  type="button"
                  class="rounded-md px-2 sm:px-2.5 py-1 font-mono text-[11px] font-medium transition-colors"
                  :class="historyRange === option.value ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
                  @click="historyRange = option.value"
                >
                  {{ currentLang === 'en' ? option.labelEn : option.labelZh }}
                </button>
              </div>
            </div>

            <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {{ historyDescription }}
            </p>
          </div>

          <!-- Uptime Bar Strip -->
          <div class="space-y-2" @mouseleave="hoveredIndex = -1">
            <div class="relative pt-1">
              <div
                class="flex h-10 sm:h-11 items-stretch"
                :class="historyRange === '90d' ? 'gap-[1.5px] sm:gap-[2px]' : 'gap-1 sm:gap-1.5'"
              >
                <button
                  v-for="(bar, index) in historyBars"
                  :key="bar.key"
                  type="button"
                  :aria-label="`${bar.label}: ${barStatusLabel(bar.status)}`"
                  class="min-w-0 flex-1 cursor-pointer transition-all duration-150 focus:outline-none"
                  :class="[
                    BAR_CLASS[bar.status],
                    historyRange === '90d' ? 'rounded-[1.5px]' : 'rounded-[2.5px]',
                    hoveredIndex === -1
                      ? 'opacity-90 hover:opacity-100'
                      : hoveredIndex === index
                        ? 'opacity-100 ring-2 ring-foreground/25 scale-y-[1.06]'
                        : 'opacity-45',
                  ]"
                  @mouseenter="hoveredIndex = index"
                  @focus="hoveredIndex = index"
                  @click="hoveredIndex = hoveredIndex === index ? -1 : index"
                />
              </div>

              <!-- Desktop Floating Tooltip (availability only, no internal volume/latency) -->
              <div
                v-if="hoveredBar"
                class="pointer-events-none hidden sm:block absolute bottom-full z-20 mb-2.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border/80 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xs"
                :style="{ left: tooltipLeft }"
              >
                <div class="flex items-center gap-2 font-medium text-foreground">
                  <span class="size-2 rounded-full" :class="BAR_DOT_CLASS[hoveredBar.status]" />
                  <span>{{ hoveredBar.label }}</span>
                  <span class="text-muted-foreground">·</span>
                  <span>{{ hoveredStatusLabel }}</span>
                </div>
                <div v-if="hoveredBar.availabilityPct !== null" class="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {{ currentLang === 'en' ? 'Availability:' : '可用率:' }}
                  <span class="text-foreground">{{ hoveredBar.availabilityPct.toFixed(2) }}%</span>
                </div>
              </div>
            </div>

            <!-- Axis Labels + Mobile Active Readout -->
            <div class="flex items-center justify-between gap-2 pt-0.5 font-mono text-[11px] text-muted-foreground">
              <span>{{ axisStartLabel }}</span>

              <div
                v-if="hoveredBar"
                class="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 px-2.5 py-0.5 text-[11px] text-foreground sm:hidden"
              >
                <span class="size-1.5 rounded-full" :class="BAR_DOT_CLASS[hoveredBar.status]" />
                <span class="font-medium">{{ hoveredBar.label }}</span>
                <span class="text-muted-foreground">·</span>
                <span>{{ hoveredStatusLabel }}</span>
                <span v-if="hoveredBar.availabilityPct !== null" class="text-muted-foreground">
                  ({{ hoveredBar.availabilityPct.toFixed(2) }}%)
                </span>
              </div>
              <div v-else class="hidden h-px flex-1 bg-border/50 mx-3 sm:block" />

              <span>{{ axisEndLabel }}</span>
            </div>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
            <div class="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5">
              <span v-for="item in legendItems" :key="item.key" class="inline-flex items-center gap-1.5">
                <span class="size-2.5 rounded-[2px]" :class="item.class" />
                <span>{{ item.label }}</span>
              </span>
            </div>
            <span class="font-mono text-[11px] text-muted-foreground/80">
              {{ currentLang === 'en' ? 'UTC · Excludes client 4xx errors' : 'UTC · 已排除客户端 4xx 错误' }}
            </span>
          </div>
        </div>
      </Card>

      <!-- 5. Status Footer Meta -->
      <div class="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <div class="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Waves class="size-3.5 text-primary" />
          <span>Lanson Live API</span>
        </div>

        <div class="flex items-center gap-4 font-mono text-[11px]">
          <NuxtLink to="/docs/production" class="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <span>{{ currentLang === 'en' ? 'Production Docs' : '生产环境文档' }}</span>
            <ArrowUpRight class="size-3 opacity-60" />
          </NuxtLink>
          <span class="text-border">·</span>
          <NuxtLink to="/docs/api-reference" class="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <span>{{ currentLang === 'en' ? 'API Reference' : 'API 参考' }}</span>
            <ArrowUpRight class="size-3 opacity-60" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
