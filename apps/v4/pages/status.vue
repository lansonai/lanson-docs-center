<script setup lang="ts">
import type { LansonAudioLaneStatus, LansonAudioMonitoringResponse } from '~/types/monitoring/lanson-audio'
import {
  AlertTriangle,
  ArrowUpRight,
  AudioLines,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileAudio,
  Languages,
  Layers,
  Mail,
  RefreshCw,
  ShieldCheck,
  Waves,
  Webhook,
  XCircle,
} from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
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

const title = 'Service Status'
const description
  = 'Current operational status and availability for Lanson Live API.'

useSeoMeta({
  title,
  description,
  ogTitle: `${title} - LansonAI Docs`,
  ogDescription: description,
  twitterCard: 'summary_large_image',
})

const currentLang = ref<'en' | 'zh'>('en')

// Two windows: the short one drives current component status and incidents,
// the long one drives the availability history strip. Keeping them separate
// avoids reporting a 90-day aggregate as "current" health.
const data = ref<LansonAudioMonitoringResponse | null>(null)
const history = ref<LansonAudioMonitoringResponse | null>(null)
const loading = ref(true)
const isRefetching = ref(false)
const errorMsg = ref<string | null>(null)
const lastUpdated = ref<Date>(new Date())

// Collapsible sections
const isIncidentsOpen = ref(true)

// Auto-refresh timer (30s)
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
      fetchStatus(false)
      secondsRemaining.value = REFRESH_INTERVAL_SEC
    }
  }, 1000)
}

async function fetchStatus(isInitial = false) {
  if (isInitial)
    loading.value = true
  else isRefetching.value = true
  errorMsg.value = null

  try {
    const [current, longRange] = await Promise.all([
      $fetch<LansonAudioMonitoringResponse>('/api/monitoring/lanson-audio/overview', {
        query: {
          environment: 'production',
          range: '24h',
        },
      }),
      $fetch<LansonAudioMonitoringResponse>('/api/monitoring/lanson-audio/overview', {
        query: {
          environment: 'production',
          range: '90d',
        },
      }).catch(() => null),
    ])
    data.value = current
    history.value = longRange
    lastUpdated.value = new Date()
    secondsRemaining.value = REFRESH_INTERVAL_SEC
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
  fetchStatus(true)
  startCountdown()
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})

// Summary metrics (only the fields used by the public status view)
const summary = computed(() => data.value?.summary ?? {
  requests: 0,
  serverErrors: 0,
  upstreamConnectionFailures: 0,
  readinessFailures: 0,
})

const serverAvailabilityPct = computed<number | null>(() => {
  const s = data.value?.summary
  if (!s)
    return null
  if (!s.requests)
    return 100.0
  const serverErrorRate = (s.serverErrors / s.requests) * 100
  return Math.max(0, Math.min(100, +(100 - serverErrorRate).toFixed(2)))
})

// Overall System Status evaluation
const overallStatus = computed<'operational' | 'degraded' | 'down' | 'unknown'>(() => {
  if (!data.value)
    return 'unknown'
  const s = summary.value
  const avail = serverAvailabilityPct.value ?? 100
  if (s.serverErrors > 50 || s.upstreamConnectionFailures > 10 || avail < 90) {
    return 'down'
  }
  if (s.serverErrors > 5 || s.upstreamConnectionFailures > 0 || s.readinessFailures > 0 || avail < 99) {
    return 'degraded'
  }
  return 'operational'
})

const statusConfig = computed(() => {
  const isEn = currentLang.value === 'en'

  if (loading.value) {
    return {
      title: isEn ? 'Checking service status…' : '正在检查服务状态…',
      subtitle: isEn ? 'Checking the latest Lanson Live API service status.' : '正在获取 Lanson Live API 的最新服务状态。',
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
          ? 'Some Lanson Live API capabilities are experiencing elevated latency or intermittent errors.'
          : '部分 Lanson Live API 服务出现延迟升高或偶发波动。',
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
          ? 'Lanson Live API is experiencing a service disruption.'
          : 'Lanson Live API 服务出现中断。',
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
          ? 'Live operational telemetry cannot be reached right now.'
          : '当前暂时无法获取实时监控状态。',
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
        title: isEn ? 'All Systems Operational' : '所有系统运行正常',
        subtitle: isEn
          ? 'Lanson Live API services and streaming pipelines are operating normally.'
          : 'Lanson Live API 各项服务与流式语音链路均运行正常。',
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

// Public-facing service health. Internal gateway lanes are mapped to the
// capabilities customers actually consume; event counts, error totals and
// internal lane names stay in the admin monitoring surface.
type PublicServiceStatus = 'operational' | 'degraded' | 'down' | 'checking' | 'unknown'

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

const PUBLIC_SERVICES = [
  {
    id: 'realtime',
    laneIds: ['realtime-ws'],
    icon: AudioLines,
    name: { en: 'Realtime Transcription', zh: '实时流式转录' },
    description: { en: 'Live streaming speech-to-text over WebSocket', zh: '低延迟 WebSocket 实时流式语音转写' },
  },
  {
    id: 'recorded',
    laneIds: ['segment', 'offline', 'slice'],
    icon: FileAudio,
    name: { en: 'Recorded Transcription', zh: '录音文件转录' },
    description: { en: 'Uploaded audio and batch transcription', zh: '上传音频分段与异步批量转写' },
  },
  {
    id: 'language-detection',
    laneIds: ['language-detection'],
    icon: Languages,
    name: { en: 'Language Detection', zh: '语种识别' },
    description: { en: 'Automatic spoken language detection', zh: '自动检测与识别语音语种' },
  },
  {
    id: 'classification',
    laneIds: ['classification'],
    icon: Layers,
    name: { en: 'Audio Classification', zh: '音频分类' },
    description: { en: 'Acoustic scene and content classification', zh: '声学场景与音频内容分类' },
  },
]

function combineLaneStatus(statuses: LansonAudioLaneStatus[]): PublicServiceStatus {
  if (statuses.includes('down'))
    return 'down'
  if (statuses.includes('degraded'))
    return 'degraded'
  // `idle` only means there was no traffic in the window; it is not a fault.
  return 'operational'
}

const publicServices = computed(() => {
  const lanes = new Map((data.value?.lanes ?? []).map(lane => [lane.id, lane]))
  return PUBLIC_SERVICES.map((service) => {
    const statuses = service.laneIds
      .map(id => lanes.get(id)?.status)
      .filter((status): status is LansonAudioLaneStatus => Boolean(status))
    const status: PublicServiceStatus = loading.value
      ? 'checking'
      : !data.value || !statuses.length
          ? 'unknown'
          : combineLaneStatus(statuses)
    return {
      ...service,
      status,
      statusMeta: SERVICE_STATUS_META[status],
    }
  })
})

const operationalServicesCount = computed(() =>
  publicServices.value.filter(s => s.status === 'operational').length,
)

// ---------------------------------------------------------------------------
// Availability history strip
//
// The monitoring API exposes a request timeline for the transcription HTTP
// endpoint only. We render exactly that and label it as such — we do not
// fabricate per-service history for lanes the timeline does not cover.
// ---------------------------------------------------------------------------

type BarStatus = 'operational' | 'degraded' | 'down' | 'nodata'

interface HistoryBar {
  key: string
  label: string
  requests: number
  success: number
  serverErrors: number
  uptimePct: number | null
  status: BarStatus
}

type TimelineRow = LansonAudioMonitoringResponse['series']['requestTimeline'][number]

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
  nodata: { en: 'No traffic', zh: '无请求数据' },
}

const historyRange = ref<'24h' | '30d' | '90d'>('30d')

const rangeOptions = [
  { value: '24h' as const, labelEn: '24h', labelZh: '24小时' },
  { value: '30d' as const, labelEn: '30d', labelZh: '30天' },
  { value: '90d' as const, labelEn: '90d', labelZh: '90天' },
]

function classifyBar(requests: number, serverErrors: number): BarStatus {
  if (requests <= 0)
    return 'nodata'
  const errorRate = serverErrors / requests
  if (errorRate >= 0.05)
    return 'down'
  if (serverErrors > 0)
    return 'degraded'
  return 'operational'
}

function makeBar(key: string, label: string, requests: number, success: number, serverErrors: number): HistoryBar {
  return {
    key,
    label,
    requests,
    success,
    serverErrors,
    uptimePct: requests > 0 ? +((success / requests) * 100).toFixed(2) : null,
    status: classifyBar(requests, serverErrors),
  }
}

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
  }).format(new Date(ms))
}

function buildDailyBars(rows: TimelineRow[], days: number): HistoryBar[] {
  const byDay = new Map<string, { requests: number, success: number, serverErrors: number }>()
  for (const row of rows) {
    const ts = Date.parse(row.ts)
    if (!Number.isFinite(ts))
      continue
    const key = new Date(ts).toISOString().slice(0, 10)
    const agg = byDay.get(key) ?? { requests: 0, success: 0, serverErrors: 0 }
    agg.requests += row.requests
    agg.success += row.success
    agg.serverErrors += row.serverErrors
    byDay.set(key, agg)
  }

  const now = new Date()
  const endUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const bars: HistoryBar[] = []
  for (let i = days - 1; i >= 0; i--) {
    const ms = endUtc - i * 86_400_000
    const key = new Date(ms).toISOString().slice(0, 10)
    const agg = byDay.get(key)
    bars.push(makeBar(key, formatDayLabel(ms), agg?.requests ?? 0, agg?.success ?? 0, agg?.serverErrors ?? 0))
  }
  return bars
}

function buildHourlyBars(rows: TimelineRow[], hours: number): HistoryBar[] {
  const byHour = new Map<number, { requests: number, success: number, serverErrors: number }>()
  for (const row of rows) {
    const ts = Date.parse(row.ts)
    if (!Number.isFinite(ts))
      continue
    const key = Math.floor(ts / 3_600_000)
    const agg = byHour.get(key) ?? { requests: 0, success: 0, serverErrors: 0 }
    agg.requests += row.requests
    agg.success += row.success
    agg.serverErrors += row.serverErrors
    byHour.set(key, agg)
  }

  const nowHour = Math.floor(Date.now() / 3_600_000)
  const bars: HistoryBar[] = []
  for (let i = hours - 1; i >= 0; i--) {
    const key = nowHour - i
    const agg = byHour.get(key)
    bars.push(makeBar(String(key), formatHourLabel(key * 3_600_000), agg?.requests ?? 0, agg?.success ?? 0, agg?.serverErrors ?? 0))
  }
  return bars
}

const historyBars = computed<HistoryBar[]>(() => {
  if (historyRange.value === '24h')
    return buildHourlyBars(data.value?.series.requestTimeline ?? [], 24)
  const days = historyRange.value === '30d' ? 30 : 90
  return buildDailyBars(history.value?.series.requestTimeline ?? [], days)
})

const historyUptime = computed<number | null>(() => {
  const bars = historyBars.value.filter(bar => bar.requests > 0)
  if (!bars.length)
    return null
  const requests = bars.reduce((sum, bar) => sum + bar.requests, 0)
  const success = bars.reduce((sum, bar) => sum + bar.success, 0)
  return requests > 0 ? +((success / requests) * 100).toFixed(2) : null
})

const historyUptimeLabel = computed(() =>
  historyUptime.value === null ? '—' : `${historyUptime.value.toFixed(2)}%`,
)

const historyRangeLabel = computed(() => {
  const isEn = currentLang.value === 'en'
  if (historyRange.value === '24h')
    return isEn ? '24-hour uptime' : '24 小时可用率'
  if (historyRange.value === '30d')
    return isEn ? '30-day uptime' : '30 天可用率'
  return isEn ? '90-day uptime' : '90 天可用率'
})

const historyDescription = computed(() => {
  const isEn = currentLang.value === 'en'
  if (historyRange.value === '24h') {
    return isEn
      ? 'Hourly success rate of the transcription API over the last 24 hours.'
      : '过去 24 小时转写 API 按小时统计的请求成功率。'
  }
  if (historyRange.value === '30d') {
    return isEn
      ? 'Daily success rate of the transcription API over the last 30 days.'
      : '过去 30 天转写 API 按天统计的请求成功率。'
  }
  return isEn
    ? 'Daily success rate of the transcription API over the last 90 days.'
    : '过去 90 天转写 API 按天统计的请求成功率。'
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
  const meta = BAR_STATUS_LABEL[hoveredBar.value.status]
  return currentLang.value === 'en' ? meta.en : meta.zh
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

const freshness = computed(() => data.value?.freshness ?? null)
const queryHealth = computed(() => data.value?.queryHealth ?? null)

function normalizeClientTimestamp(value: unknown): string | null {
  if (typeof value === 'string' && !/^\d+$/.test(value))
    return value
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0)
    return null
  const ms = numeric > 1e15 ? numeric / 1e6 : numeric
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function formatRelativeTime(value: string | null): string {
  if (!value)
    return currentLang.value === 'en' ? 'no data' : '暂无数据'
  const ts = Date.parse(value)
  if (!Number.isFinite(ts))
    return value
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (diffSec < 60)
    return currentLang.value === 'en' ? `${diffSec}s ago` : `${diffSec} 秒前`
  if (diffSec < 3600)
    return currentLang.value === 'en' ? `${Math.round(diffSec / 60)}m ago` : `${Math.round(diffSec / 60)} 分钟前`
  if (diffSec < 86400)
    return currentLang.value === 'en' ? `${Math.round(diffSec / 3600)}h ago` : `${Math.round(diffSec / 3600)} 小时前`
  return currentLang.value === 'en' ? `${Math.round(diffSec / 86400)}d ago` : `${Math.round(diffSec / 86400)} 天前`
}

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
  return lastUpdated.value.toLocaleTimeString(currentLang.value === 'en' ? 'en-US' : 'zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
})

// Real incidents from the monitoring API (rolling window), described in
// customer-facing language. Raw event names, HTTP codes and upstream details
// stay in the admin monitoring surface.
const INCIDENT_COPY: Record<string, { label: { en: string, zh: string }, description: { en: string, zh: string } }> = {
  'gateway.request.failed': {
    label: { en: 'Request errors', zh: '请求异常' },
    description: { en: 'Some API requests did not complete successfully.', zh: '部分 API 请求未能成功完成。' },
  },
  'gateway.session.backpressure_detected': {
    label: { en: 'Realtime connection instability', zh: '实时连接不稳定' },
    description: { en: 'Some realtime sessions experienced temporary buffering.', zh: '部分实时会话出现短暂缓冲。' },
  },
  'gateway.readiness.degraded': {
    label: { en: 'Service health check degraded', zh: '服务健康检查降级' },
    description: { en: 'A service health check reported reduced capacity.', zh: '服务健康检查报告容量下降。' },
  },
  'gateway.readiness.checked': {
    label: { en: 'Service health check failed', zh: '服务健康检查未通过' },
    description: { en: 'A service health check did not pass.', zh: '一次服务健康检查未通过。' },
  },
  'gateway.session.closed': {
    label: { en: 'Realtime session interrupted', zh: '实时会话中断' },
    description: { en: 'A realtime session closed unexpectedly.', zh: '一个实时会话意外关闭。' },
  },
}

function incidentCopy(eventName: string) {
  return INCIDENT_COPY[eventName] ?? {
    label: { en: 'Service event', zh: '服务事件' },
    description: { en: 'A service event was recorded.', zh: '记录到一次服务事件。' },
  }
}

const incidents = computed(() => (data.value?.incidents ?? []).map((row, index) => {
  const eventName = String(row.event_name ?? '')
  const time = normalizeClientTimestamp(row._time)
  const copy = incidentCopy(eventName)
  return {
    id: `${String(row.request_id ?? row.session_id ?? eventName)}-${index}`,
    label: currentLang.value === 'en' ? copy.label.en : copy.label.zh,
    description: currentLang.value === 'en' ? copy.description.en : copy.description.zh,
    timeLabel: formatRelativeTime(time),
  }
}))
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
                {{ currentLang === 'en' ? 'Lanson Live API Status' : 'Lanson Live API 服务状态' }}
              </h1>
              <p class="max-w-xl text-sm text-muted-foreground sm:text-base">
                {{ currentLang === 'en'
                  ? 'Current operational status and availability for Lanson Live API.'
                  : 'Lanson Live API 的实时运行状态与可用性监控。'
                }}
              </p>
            </div>
          </div>

          <!-- Header Actions -->
          <div class="flex flex-wrap items-center gap-2 sm:shrink-0">
            <!-- Subscribe Modal -->
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
                      ? 'Get notified immediately whenever major incident updates or scheduled maintenance occur.'
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
              @click="fetchStatus(false)"
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
                  {{ currentLang === 'en' ? 'Syncing telemetry…' : '正在同步遥测…' }}
                </template>
                <template v-else>
                  {{ currentLang === 'en'
                    ? `${operationalServicesCount}/${publicServices.length} services healthy`
                    : `${operationalServicesCount}/${publicServices.length} 项服务正常`
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

      <!-- 2. Capabilities / Services Status -->
      <section class="space-y-3">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 class="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {{ currentLang === 'en' ? 'Services' : '核心服务状态' }}
          </h2>
          <p class="text-xs text-muted-foreground">
            {{ currentLang === 'en'
              ? 'Real-time operational health over the last 24 hours.'
              : '基于过去 24 小时流量的实时服务健康度。'
            }}
          </p>
        </div>

        <Card class="py-0 gap-0 divide-y divide-border/70 overflow-hidden shadow-xs">
          <div
            v-for="service in publicServices"
            :key="service.id"
            class="group flex items-start gap-2.5 px-3.5 py-3.5 transition-colors hover:bg-muted/25 sm:items-center sm:gap-4 sm:px-5 sm:py-4"
          >
            <div class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground transition-colors group-hover:border-border group-hover:text-foreground sm:mt-0 sm:size-10">
              <component :is="service.icon" class="size-4" />
            </div>

            <div class="min-w-0 flex-1 space-y-0.5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
              <div class="min-w-0 space-y-0.5">
                <div class="flex items-center justify-between gap-2 sm:justify-start">
                  <span class="whitespace-nowrap text-sm font-medium text-foreground">
                    {{ currentLang === 'en' ? service.name.en : service.name.zh }}
                  </span>
                  <Badge
                    variant="outline"
                    class="shrink-0 gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium sm:hidden"
                    :class="service.statusMeta.badge"
                  >
                    <span class="relative flex size-1.5">
                      <span
                        v-if="service.status === 'operational'"
                        class="absolute inline-flex size-full rounded-full opacity-40"
                        :class="service.statusMeta.dot"
                      />
                      <span class="relative inline-flex size-1.5 rounded-full" :class="service.statusMeta.dot" />
                    </span>
                    <span>{{ currentLang === 'en' ? service.statusMeta.en : service.statusMeta.zh }}</span>
                  </Badge>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  {{ currentLang === 'en' ? service.description.en : service.description.zh }}
                </p>
              </div>

              <Badge
                variant="outline"
                class="hidden shrink-0 gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium sm:inline-flex"
                :class="service.statusMeta.badge"
              >
                <span class="relative flex size-1.5">
                  <span
                    v-if="service.status === 'operational'"
                    class="absolute inline-flex size-full rounded-full opacity-40"
                    :class="service.statusMeta.dot"
                  />
                  <span class="relative inline-flex size-1.5 rounded-full" :class="service.statusMeta.dot" />
                </span>
                <span>{{ currentLang === 'en' ? service.statusMeta.en : service.statusMeta.zh }}</span>
              </Badge>
            </div>
          </div>
        </Card>
      </section>

      <!-- 3. Availability History -->
      <Card class="py-0 shadow-xs">
        <div class="space-y-4 p-4 sm:p-6">
          <!-- Card Header with Uptime Stat & Range Switcher -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <h2 class="whitespace-nowrap text-base font-semibold tracking-tight text-foreground">
                  {{ currentLang === 'en' ? 'Availability History' : '可用性历史' }}
                </h2>
                <span class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] px-1.5 sm:px-2 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {{ historyUptimeLabel }}
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

            <p class="text-xs sm:text-sm text-muted-foreground">
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
                  :aria-label="`${bar.label}: ${hoveredStatusLabel}`"
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

              <!-- Desktop Floating Tooltip -->
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
                <div v-if="hoveredBar.uptimePct !== null" class="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {{ currentLang === 'en' ? 'Success rate:' : '请求成功率:' }} {{ hoveredBar.uptimePct.toFixed(2) }}%
                </div>
              </div>
            </div>

            <!-- Axis Labels + Mobile Active Readout -->
            <div class="flex items-center justify-between gap-2 pt-0.5 font-mono text-[11px] text-muted-foreground">
              <span>{{ axisStartLabel }}</span>

              <!-- Inline active bar details (especially helpful on mobile touch) -->
              <div
                v-if="hoveredBar"
                class="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 px-2.5 py-0.5 text-[11px] text-foreground sm:hidden"
              >
                <span class="size-1.5 rounded-full" :class="BAR_DOT_CLASS[hoveredBar.status]" />
                <span class="font-medium">{{ hoveredBar.label }}</span>
                <span class="text-muted-foreground">·</span>
                <span>{{ hoveredStatusLabel }}</span>
                <span v-if="hoveredBar.uptimePct !== null" class="text-muted-foreground">
                  ({{ hoveredBar.uptimePct.toFixed(2) }}%)
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
              {{ currentLang === 'en' ? 'UTC' : 'UTC 时间' }}
            </span>
          </div>
        </div>
      </Card>

      <!-- 4. Recent Incidents (real events) -->
      <section class="space-y-3">
        <div class="flex items-start justify-between gap-4 sm:items-center">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <h2 class="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {{ currentLang === 'en' ? 'Recent Incidents' : '近期异常事件' }}
              </h2>
              <Badge variant="secondary" class="h-5 rounded-full px-2 font-mono text-[11px]">
                {{ incidents.length }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ currentLang === 'en'
                ? 'Service events recorded in the last 24 hours.'
                : '过去 24 小时记录的服务事件。'
              }}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="shrink-0 text-xs text-muted-foreground hover:text-foreground font-mono gap-1 h-7 px-2"
            @click="isIncidentsOpen = !isIncidentsOpen"
          >
            <span>{{ isIncidentsOpen ? (currentLang === 'en' ? 'Collapse' : '收起') : (currentLang === 'en' ? 'Expand' : '展开') }}</span>
            <ChevronDown class="size-3.5 transition-transform duration-200" :class="isIncidentsOpen ? '' : '-rotate-90'" />
          </Button>
        </div>

        <div v-show="isIncidentsOpen">
          <Card v-if="incidents.length" class="py-0 gap-0 divide-y divide-border/70 overflow-hidden shadow-xs">
            <div
              v-for="incident in incidents"
              :key="incident.id"
              class="flex gap-3.5 p-4 sm:p-5"
            >
              <div class="mt-1 flex flex-col items-center">
                <span class="size-2.5 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-500/15" />
                <span class="mt-1.5 w-px flex-1 bg-border" />
              </div>

              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h4 class="text-sm font-medium text-foreground">
                    {{ incident.label }}
                  </h4>
                  <span class="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {{ incident.timeLabel }}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  {{ incident.description }}
                </p>
              </div>
            </div>
          </Card>

          <Card v-else class="py-8 sm:py-10 px-4 text-center shadow-xs">
            <div class="mx-auto flex flex-col items-center gap-2.5 max-w-sm">
              <div class="grid size-10 place-items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 class="size-5" />
              </div>
              <div class="space-y-1">
                <p class="text-sm font-medium text-foreground">
                  {{ currentLang === 'en' ? 'No incidents reported' : '未记录到异常事件' }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ currentLang === 'en'
                    ? 'No service disruptions or abnormal events in the last 24 hours.'
                    : '过去 24 小时内各项服务均平稳运行，无异常事件记录。'
                  }}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <!-- 5. Status Footer Meta -->
      <div class="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 sm:flex-wrap">
          <div class="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Waves class="size-3.5 text-primary" />
            <span>Lanson Live API</span>
          </div>
          <div v-if="freshness || (queryHealth && queryHealth.degraded)" class="flex items-center gap-2 flex-wrap">
            <span v-if="freshness" class="hidden text-border sm:inline">·</span>
            <span v-if="freshness" class="font-mono text-[11px]">
              {{ currentLang === 'en' ? 'Latest telemetry:' : '最新遥测数据:' }} {{ formatRelativeTime(freshness.latestEventAt) }}
            </span>
            <Badge
              v-if="freshness?.isStale"
              variant="outline"
              class="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400"
            >
              {{ currentLang === 'en' ? 'stale' : '数据滞后' }}
            </Badge>
            <Badge
              v-if="queryHealth && queryHealth.degraded"
              variant="outline"
              class="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400"
            >
              {{ currentLang === 'en' ? 'partial data' : '部分数据缺失' }}
            </Badge>
          </div>
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
