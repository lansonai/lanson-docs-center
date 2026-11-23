import type {
  LansonAudioLaneHealth,
  LansonAudioLaneStatus,
  LansonAudioMonitoringResponse,
} from '~/types/monitoring/lanson-audio'

export type PublicServiceStatus = 'operational' | 'degraded' | 'down' | 'checking' | 'unknown'
export type SignalSourceKind = 'live_traffic' | 'probe' | 'idle' | 'unknown'
export type BarStatus = 'operational' | 'degraded' | 'down' | 'nodata'

export interface BilingualText {
  en: string
  zh: string
}

export interface EvaluatedService {
  id: string
  tier: 'core' | 'additional'
  name: BilingualText
  brandTag: string
  endpoint: string
  description: BilingualText
  status: PublicServiceStatus
  signalSource: SignalSourceKind
  highlights: BilingualText[]
}

export interface HistoryBar {
  key: string
  label: string
  requests: number
  success: number
  serverErrors: number
  /** Server availability percentage excluding client 4xx errors: `(requests - serverErrors) / requests * 100`. */
  availabilityPct: number | null
  /** HTTP 2xx-3xx request success percentage (includes client 4xx in denominator). */
  requestSuccessPct: number | null
  p95HttpMs: number | null
  status: BarStatus
}

export type TimelineRow = LansonAudioMonitoringResponse['series']['requestTimeline'][number]

export interface RecentWindowStats {
  requests: number
  serverErrors: number
  p95Ms: number | null
}

/** Minimum recent-window request volume required before treating transient errors as an outage. */
export const RECENT_LOW_TRAFFIC_FLOOR = 5

/**
 * Compute server availability percentage excluding client 4xx errors.
 * Returns `null` when `requests <= 0` so idle windows are never misreported as 100% or 0%.
 */
export function computeServerAvailabilityPct(requests: number, serverErrors: number): number | null {
  if (requests <= 0)
    return null
  const clampedErrors = Math.max(0, Math.min(requests, serverErrors))
  return +(((requests - clampedErrors) / requests) * 100).toFixed(2)
}

/** Compute HTTP 2xx-3xx request success rate (including 4xx client errors in denominator). */
export function computeRequestSuccessPct(requests: number, success: number): number | null {
  if (requests <= 0)
    return null
  const clampedSuccess = Math.max(0, Math.min(requests, success))
  return +((clampedSuccess / requests) * 100).toFixed(2)
}

/** Map a single upstream lane status into public service status. */
export function mapLaneToPublicStatus(status: LansonAudioLaneStatus | undefined): PublicServiceStatus {
  if (!status)
    return 'unknown'
  if (status === 'down')
    return 'down'
  if (status === 'degraded')
    return 'degraded'
  // Upstream sets `idle` only when there was no traffic in the window; probe fallback
  // sets `healthy` or `down` when active probing is enabled.
  return 'operational'
}

/**
 * Combine multiple lane statuses representing sub-paths of one fault domain
 * (for example `offline` batch jobs + `segment` HTTP clips under Batch Processing).
 * A single degraded/down sub-path degrades the domain without marking healthy peers down.
 */
export function combineFaultDomainStatuses(statuses: PublicServiceStatus[]): PublicServiceStatus {
  const known = statuses.filter(s => s !== 'unknown' && s !== 'checking')
  if (!known.length)
    return 'unknown'
  if (known.every(s => s === 'down'))
    return 'down'
  if (known.includes('down') || known.includes('degraded'))
    return 'degraded'
  return 'operational'
}

/** Determine whether an upstream lane reports an active endpoint probe result in `meta`. */
export function detectProbeMeta(lane: LansonAudioLaneHealth | undefined): 'ok' | 'fail' | null {
  if (!lane?.meta?.length)
    return null
  if (lane.meta.some(m => m.includes('探活失败') || m.toLowerCase().includes('probe failed')))
    return 'fail'
  if (lane.meta.some(m => m.includes('探活正常') || m.toLowerCase().includes('probe ok')))
    return 'ok'
  return null
}

/** Determine how a lane's current status was verified (live 15m traffic vs endpoint probe vs idle). */
export function resolveSignalSource(lanes: Array<LansonAudioLaneHealth | undefined>): SignalSourceKind {
  const present = lanes.filter((l): l is LansonAudioLaneHealth => Boolean(l))
  if (!present.length)
    return 'unknown'
  if (present.some(l => (l.recent?.count ?? 0) > 0))
    return 'live_traffic'
  if (present.some(l => detectProbeMeta(l) !== null))
    return 'probe'
  if (present.some(l => l.count > 0 && l.latestSuccessAt))
    return 'idle'
  return 'idle'
}

/**
 * Extract metrics from the latest 10-20 minute buckets of the 24h request timeline.
 * Used strictly for current gateway health, never historical 24h totals.
 */
export function summarizeRecentTimeline(
  rows: TimelineRow[],
  nowMs = Date.now(),
  windowMs = 20 * 60_000,
): RecentWindowStats {
  const recentRows = rows.filter((row) => {
    const ts = Date.parse(row.ts)
    return Number.isFinite(ts) && nowMs - ts <= windowMs && ts <= nowMs + 60_000
  })
  if (!recentRows.length)
    return { requests: 0, serverErrors: 0, p95Ms: null }

  let requests = 0
  let serverErrors = 0
  let latestP95: number | null = null
  for (const row of recentRows) {
    requests += Math.max(0, row.requests)
    serverErrors += Math.max(0, row.serverErrors)
    if (row.p95HttpMs !== null && Number.isFinite(row.p95HttpMs))
      latestP95 = row.p95HttpMs
  }
  return { requests, serverErrors, p95Ms: latestP95 }
}

/**
 * Evaluate current API Gateway status over the short (5-15m) window only.
 * Historical 24h errors in `summary` never keep the gateway degraded once recovered.
 */
export function evaluateGatewayStatus(
  data: LansonAudioMonitoringResponse | null,
  loading: boolean,
  nowMs = Date.now(),
): { status: PublicServiceStatus, recent: RecentWindowStats, signalSource: SignalSourceKind } {
  if (loading) {
    return { status: 'checking', recent: { requests: 0, serverErrors: 0, p95Ms: null }, signalSource: 'unknown' }
  }
  if (!data) {
    return { status: 'unknown', recent: { requests: 0, serverErrors: 0, p95Ms: null }, signalSource: 'unknown' }
  }

  const recent = summarizeRecentTimeline(data.series.requestTimeline ?? [], nowMs)
  const lanesById = new Map((data.lanes ?? []).map(l => [l.id, l]))
  const ingressLanes = ['segment', 'realtime-ws', 'offline']
    .map(id => lanesById.get(id))
    .filter((l): l is LansonAudioLaneHealth => Boolean(l))

  const signalSource: SignalSourceKind = recent.requests > 0
    ? 'live_traffic'
    : resolveSignalSource(ingressLanes)

  // If the monitoring backend explicitly reported a 15m readiness failure, degrade gateway.
  const recentRel = data.recentReliability
  if (recentRel && (recentRel.readinessFailures > 0 || recentRel.upstreamConnectionFailures > 2)) {
    return { status: 'degraded', recent, signalSource }
  }

  // Evaluate recent 10-20m HTTP 5xx rate with low-traffic protection.
  if (recent.requests >= RECENT_LOW_TRAFFIC_FLOOR) {
    const errorRate = recent.serverErrors / recent.requests
    if (errorRate >= 0.1 || (recent.serverErrors >= 5 && errorRate >= 0.05))
      return { status: 'down', recent, signalSource }
    if (errorRate > 0.01 || recent.serverErrors >= 3)
      return { status: 'degraded', recent, signalSource }
  }
  else if (recent.requests > 0 && recent.serverErrors >= 2) {
    // Low traffic: avoid declaring full outage from 1-2 requests; surface degraded instead.
    return { status: 'degraded', recent, signalSource }
  }

  // Fallback to ingress lane probes when traffic is idle.
  if (ingressLanes.length > 0 && ingressLanes.every(l => l.status === 'down'))
    return { status: 'down', recent, signalSource }

  if (data.queryHealth?.degraded && !data.lanes?.length)
    return { status: 'unknown', recent, signalSource: 'unknown' }

  return { status: 'operational', recent, signalSource }
}

/**
 * Build the two-tier service status model (Core Services + Additional Capabilities)
 * strictly as a faithful consumer of upstream monitoring telemetry.
 */
export function buildEvaluatedServices(
  data: LansonAudioMonitoringResponse | null,
  loading: boolean,
  nowMs = Date.now(),
): { coreServices: EvaluatedService[], additionalServices: EvaluatedService[] } {
  const lanes = new Map((data?.lanes ?? []).map(lane => [lane.id, lane]))
  const realtimeLane = lanes.get('realtime-ws')
  const segmentLane = lanes.get('segment')
  const offlineLane = lanes.get('offline')
  const languageLane = lanes.get('language-detection')
  const classificationLane = lanes.get('classification')

  const windowMinutes = data?.meta?.statusWindowMinutes ?? 15

  // 1. Realtime Streaming (StableStream™ / LiveFinal™)
  const realtimeStatus: PublicServiceStatus = loading
    ? 'checking'
    : !data || !realtimeLane
        ? 'unknown'
        : mapLaneToPublicStatus(realtimeLane.status)

  const realtimeHighlights: BilingualText[] = []
  if (data && realtimeLane) {
    const sessions24h = data.summary.sessions
    const abnormal24h = data.summary.abnormalCloses
    const recentSessions = realtimeLane.recent?.count ?? 0
    if (recentSessions > 0) {
      const cleanRecent = Math.max(0, realtimeLane.recent!.success)
      const pct = +((cleanRecent / recentSessions) * 100).toFixed(1)
      realtimeHighlights.push({
        en: `${windowMinutes}m sessions: ${cleanRecent}/${recentSessions} clean (${pct}%)`,
        zh: `近 ${windowMinutes}m 会话: ${cleanRecent}/${recentSessions} 正常关闭 (${pct}%)`,
      })
    }
    else if (sessions24h > 0) {
      const clean24h = Math.max(0, sessions24h - abnormal24h)
      realtimeHighlights.push({
        en: `24h sessions: ${clean24h}/${sessions24h} clean`,
        zh: `24h 会话: ${clean24h}/${sessions24h} 正常关闭`,
      })
    }
    if (realtimeLane.p95Ms !== null) {
      realtimeHighlights.push({
        en: `Session P95: ${Math.round(realtimeLane.p95Ms)} ms`,
        zh: `会话 P95: ${Math.round(realtimeLane.p95Ms)} ms`,
      })
    }
    if (data.summary.backpressureEvents > 0) {
      realtimeHighlights.push({
        en: `24h backpressure: ${data.summary.backpressureEvents}`,
        zh: `24h 背压告警: ${data.summary.backpressureEvents}`,
      })
    }
  }

  // 2. Batch Processing (Batch Jobs + Segment HTTP)
  const batchLaneList = [offlineLane, segmentLane].filter((l): l is LansonAudioLaneHealth => Boolean(l))
  const batchStatus: PublicServiceStatus = loading
    ? 'checking'
    : !data || !batchLaneList.length
        ? 'unknown'
        : combineFaultDomainStatuses(batchLaneList.map(l => mapLaneToPublicStatus(l.status)))

  const batchHighlights: BilingualText[] = []
  if (data) {
    if (segmentLane?.p95Ms !== null && segmentLane?.p95Ms !== undefined) {
      batchHighlights.push({
        en: `Segment P95: ${Math.round(segmentLane.p95Ms)} ms`,
        zh: `Segment P95: ${Math.round(segmentLane.p95Ms)} ms`,
      })
    }
    if ((segmentLane?.recent?.count ?? 0) > 0) {
      batchHighlights.push({
        en: `${windowMinutes}m Segment clips: ${segmentLane!.recent!.success}/${segmentLane!.recent!.count}`,
        zh: `近 ${windowMinutes}m 分段请求: ${segmentLane!.recent!.success}/${segmentLane!.recent!.count}`,
      })
    }
    if (offlineLane && offlineLane.count > 0) {
      batchHighlights.push({
        en: `24h Batch jobs: ${offlineLane.success}/${offlineLane.count} completed`,
        zh: `24h 批处理任务: ${offlineLane.success}/${offlineLane.count} 完成`,
      })
    }
  }

  // 3. API Gateway (Auth, Routing & Edge Readiness)
  const gateway = evaluateGatewayStatus(data, loading, nowMs)
  const gatewayHighlights: BilingualText[] = []
  if (data && !loading) {
    if (gateway.recent.requests > 0) {
      const recentAvail = computeServerAvailabilityPct(gateway.recent.requests, gateway.recent.serverErrors)
      if (recentAvail !== null) {
        gatewayHighlights.push({
          en: `${windowMinutes}m availability: ${recentAvail.toFixed(2)}% (${gateway.recent.requests} reqs)`,
          zh: `近 ${windowMinutes}m 服务端可用率: ${recentAvail.toFixed(2)}% (${gateway.recent.requests} 次请求)`,
        })
      }
      if (gateway.recent.p95Ms !== null) {
        gatewayHighlights.push({
          en: `Recent P95: ${Math.round(gateway.recent.p95Ms)} ms`,
          zh: `近期 P95: ${Math.round(gateway.recent.p95Ms)} ms`,
        })
      }
    }
    else if (data.summary.p95HttpMs !== null) {
      gatewayHighlights.push({
        en: `24h HTTP P95: ${Math.round(data.summary.p95HttpMs)} ms`,
        zh: `24h HTTP P95: ${Math.round(data.summary.p95HttpMs)} ms`,
      })
    }
  }

  const coreServices: EvaluatedService[] = [
    {
      id: 'realtime-streaming',
      tier: 'core',
      name: { en: 'Realtime Streaming', zh: 'Realtime Streaming' },
      brandTag: 'StableStream™ · LiveFinal™',
      endpoint: 'WS /v1/audio/transcriptions/stream',
      description: {
        en: 'WebSocket connectivity, StableStream™ live voice context, and LiveFinal™ delivery',
        zh: 'WebSocket 实时建连、StableStream™ 稳定流式输出与 LiveFinal™ 交付',
      },
      status: realtimeStatus,
      signalSource: resolveSignalSource([realtimeLane]),
      highlights: realtimeHighlights,
    },
    {
      id: 'batch-processing',
      tier: 'core',
      name: { en: 'Batch Processing', zh: 'Batch Processing' },
      brandTag: 'Batch Jobs & Segment HTTP',
      endpoint: 'POST /v1/audio/transcriptions/jobs · /v1/audio/transcriptions',
      description: {
        en: 'Audio uploads, synchronous Segment HTTP clips, and async Batch Jobs',
        zh: '音频上传、Segment 同步分段请求与 Batch 异步批处理任务',
      },
      status: batchStatus,
      signalSource: resolveSignalSource(batchLaneList),
      highlights: batchHighlights,
    },
    {
      id: 'api-gateway',
      tier: 'core',
      name: { en: 'API Gateway', zh: 'API Gateway' },
      brandTag: 'Lanson Live Edge',
      endpoint: 'https://audio.lansonai.com',
      description: {
        en: 'Authentication, request routing, readiness checks, and edge handling',
        zh: '鉴权校验、请求路由、就绪检查与边缘网关处理',
      },
      status: gateway.status,
      signalSource: gateway.signalSource,
      highlights: gatewayHighlights,
    },
  ]

  // Additional Capabilities (isolated fault domains, secondary hierarchy)
  const languageStatus: PublicServiceStatus = loading
    ? 'checking'
    : !data || !languageLane
        ? 'unknown'
        : mapLaneToPublicStatus(languageLane.status)

  const classificationStatus: PublicServiceStatus = loading
    ? 'checking'
    : !data || !classificationLane
        ? 'unknown'
        : mapLaneToPublicStatus(classificationLane.status)

  const additionalServices: EvaluatedService[] = [
    {
      id: 'language-detection',
      tier: 'additional',
      name: { en: 'Language Detection', zh: 'Language Detection · 语种识别' },
      brandTag: 'Standalone Endpoint',
      endpoint: 'POST /v1/audio/language-detection',
      description: {
        en: 'Standalone spoken language identification for short clips',
        zh: '独立短音频语种识别端点',
      },
      status: languageStatus,
      signalSource: resolveSignalSource([languageLane]),
      highlights: languageLane?.p95Ms !== null && languageLane?.p95Ms !== undefined
        ? [{ en: `24h P95: ${Math.round(languageLane.p95Ms)} ms`, zh: `24h P95: ${Math.round(languageLane.p95Ms)} ms` }]
        : [],
    },
    {
      id: 'audio-classification',
      tier: 'additional',
      name: { en: 'Audio Classification', zh: 'Audio Classification · 音频分类' },
      brandTag: 'Standalone Endpoint',
      endpoint: 'POST /v1/audio/classification',
      description: {
        en: 'Acoustic scene and audio content classification',
        zh: '声学场景与音频内容分类端点',
      },
      status: classificationStatus,
      signalSource: resolveSignalSource([classificationLane]),
      highlights: classificationLane?.p95Ms !== null && classificationLane?.p95Ms !== undefined
        ? [{ en: `24h P95: ${Math.round(classificationLane.p95Ms)} ms`, zh: `24h P95: ${Math.round(classificationLane.p95Ms)} ms` }]
        : [],
    },
  ]

  return { coreServices, additionalServices }
}

/**
 * Evaluate overall platform operational status strictly from current-window
 * Core Services and Additional Capabilities (never 24h cumulative counts or historical incidents).
 */
export function evaluateOverallStatus(
  data: LansonAudioMonitoringResponse | null,
  coreServices: EvaluatedService[],
  additionalServices: EvaluatedService[],
): 'operational' | 'degraded' | 'down' | 'unknown' {
  if (!data)
    return 'unknown'

  const coreStatuses = coreServices.map(s => s.status)
  const gateway = coreServices.find(s => s.id === 'api-gateway')?.status
  const nonGatewayCore = coreServices.filter(s => s.id !== 'api-gateway').map(s => s.status)

  if (gateway === 'down' || (nonGatewayCore.length > 0 && nonGatewayCore.every(s => s === 'down')))
    return 'down'

  if (
    coreStatuses.some(s => s === 'down' || s === 'degraded')
    || additionalServices.some(s => s.status === 'down' || s === 'degraded')
  ) {
    return 'degraded'
  }

  if (coreStatuses.every(s => s === 'unknown'))
    return 'unknown'

  return 'operational'
}

export function classifyBar(requests: number, serverErrors: number): BarStatus {
  if (requests <= 0)
    return 'nodata'
  const errorRate = serverErrors / requests
  if (errorRate >= 0.05)
    return 'down'
  if (errorRate >= 0.01)
    return 'degraded'
  return 'operational'
}

export function makeBar(
  key: string,
  label: string,
  requests: number,
  success: number,
  serverErrors: number,
  p95HttpMs: number | null = null,
): HistoryBar {
  return {
    key,
    label,
    requests,
    success,
    serverErrors,
    availabilityPct: computeServerAvailabilityPct(requests, serverErrors),
    requestSuccessPct: computeRequestSuccessPct(requests, success),
    p95HttpMs,
    status: classifyBar(requests, serverErrors),
  }
}

export function buildDailyBars(
  rows: TimelineRow[],
  days: number,
  formatLabel: (ms: number) => string,
  nowMs = Date.now(),
): HistoryBar[] {
  const byDay = new Map<string, { requests: number, success: number, serverErrors: number, p95Sum: number, p95Count: number }>()
  for (const row of rows) {
    const ts = Date.parse(row.ts)
    if (!Number.isFinite(ts))
      continue
    const key = new Date(ts).toISOString().slice(0, 10)
    const agg = byDay.get(key) ?? { requests: 0, success: 0, serverErrors: 0, p95Sum: 0, p95Count: 0 }
    agg.requests += row.requests
    agg.success += row.success
    agg.serverErrors += row.serverErrors
    if (row.p95HttpMs !== null && Number.isFinite(row.p95HttpMs)) {
      agg.p95Sum += row.p95HttpMs
      agg.p95Count += 1
    }
    byDay.set(key, agg)
  }

  const now = new Date(nowMs)
  const endUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const bars: HistoryBar[] = []
  for (let i = days - 1; i >= 0; i--) {
    const ms = endUtc - i * 86_400_000
    const key = new Date(ms).toISOString().slice(0, 10)
    const agg = byDay.get(key)
    const avgP95 = agg && agg.p95Count > 0 ? Math.round(agg.p95Sum / agg.p95Count) : null
    bars.push(makeBar(key, formatLabel(ms), agg?.requests ?? 0, agg?.success ?? 0, agg?.serverErrors ?? 0, avgP95))
  }
  return bars
}

export function buildHourlyBars(
  rows: TimelineRow[],
  hours: number,
  formatLabel: (ms: number) => string,
  nowMs = Date.now(),
): HistoryBar[] {
  const byHour = new Map<number, { requests: number, success: number, serverErrors: number, p95Max: number | null }>()
  for (const row of rows) {
    const ts = Date.parse(row.ts)
    if (!Number.isFinite(ts))
      continue
    const key = Math.floor(ts / 3_600_000)
    const agg = byHour.get(key) ?? { requests: 0, success: 0, serverErrors: 0, p95Max: null }
    agg.requests += row.requests
    agg.success += row.success
    agg.serverErrors += row.serverErrors
    if (row.p95HttpMs !== null && Number.isFinite(row.p95HttpMs)) {
      agg.p95Max = agg.p95Max === null ? row.p95HttpMs : Math.max(agg.p95Max, row.p95HttpMs)
    }
    byHour.set(key, agg)
  }

  const nowHour = Math.floor(nowMs / 3_600_000)
  const bars: HistoryBar[] = []
  for (let i = hours - 1; i >= 0; i--) {
    const key = nowHour - i
    const agg = byHour.get(key)
    bars.push(
      makeBar(
        String(key),
        formatLabel(key * 3_600_000),
        agg?.requests ?? 0,
        agg?.success ?? 0,
        agg?.serverErrors ?? 0,
        agg?.p95Max !== null && agg?.p95Max !== undefined ? Math.round(agg.p95Max) : null,
      ),
    )
  }
  return bars
}
