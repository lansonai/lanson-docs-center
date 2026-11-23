export type MonitoringRange = '24h' | '3d' | '7d' | '30d' | '90d'
export type MonitoringEnvironment = 'production' | 'non-production'

export type LansonAudioLaneStatus = 'healthy' | 'degraded' | 'down' | 'idle'

export interface LansonAudioLaneRecent {
  count: number
  success: number
  errors: number
  serverErrors?: number
}

/**
 * Health evaluation for a single gateway lane (`segment`, `realtime-ws`, `offline`,
 * `language-detection`, `classification`).
 * `idle` means no traffic in the evaluation window (not a fault); `latestSuccessAt`
 * and endpoint probes provide health evidence.
 */
export interface LansonAudioLaneHealth {
  id: string
  name: string
  /** Current status evaluated over `meta.statusWindowMinutes` (5-15m) + idle probe. */
  status: LansonAudioLaneStatus
  /** Request / job / session count across the selected `range`. */
  count: number
  success: number
  errors: number
  p95Ms: number | null
  latestSuccessAt: string | null
  /** Recent short-window counts driving current operational status. */
  recent?: LansonAudioLaneRecent
  /** Lane-specific metadata tags from the upstream producer. */
  meta: string[]
}

/** Per-worker distribution for upstream ASR calls (`transcription.finished`). */
export interface LansonAudioUpstreamWorker {
  workerId: string
  finished: number
  audioSeconds: number
  latestAt: string | null
}

export interface LansonAudioRecentReliability {
  windowMinutes: number
  upstreamConnectionFailures: number
  readinessFailures: number
  probeCyclesWithDown: number
  backpressureEvents: number
}

export interface LansonAudioMonitoringResponse {
  meta: {
    sceneId: 'lanson-audio-gateway'
    generatedAt: string
    range: MonitoringRange
    environment: string
    /** Rolling window (minutes) used for current operational status; defaults to 15 when omitted by older producers. */
    statusWindowMinutes?: number
  }
  summary: {
    requests: number
    successRatePct: number
    clientErrors: number
    serverErrors: number
    p50HttpMs: number | null
    p75HttpMs: number | null
    p95HttpMs: number | null
    sessions: number
    audioSeconds: number
    /** Total `gateway.transcription.finished` events (HTTP segment + WS utterance). */
    transcriptions: number
    /** Count of finished transcriptions carrying `audio_seconds > 0`. */
    meteredTranscriptions: number
    p50SessionMs: number | null
    p75SessionMs: number | null
    p95SessionMs: number | null
    droppedAudioFrames: number
    abnormalCloses: number
    upstreamConnectionFailures: number
    readinessFailures: number
    offlineJobs: number
    offlineErrors: number
    probeCyclesWithDown: number
    backpressureEvents: number
  }
  /** Optional short-window (e.g. 15m) reliability counts; never mixed with 24h totals. */
  recentReliability?: LansonAudioRecentReliability
  series: {
    requestTimeline: Array<{
      ts: string
      requests: number
      success: number
      serverErrors: number
      p95HttpMs: number | null
    }>
  }
  /** Per-lane health summary. */
  lanes: LansonAudioLaneHealth[]
  /** Per-worker distribution for upstream ASR calls. */
  upstreamWorkers: LansonAudioUpstreamWorker[]
  incidents: Array<Record<string, unknown>>
  freshness: {
    latestEventAt: string | null
    isStale: boolean
    staleAfterMinutes: number
  }
  queryHealth: {
    total: number
    succeeded: number
    failed: number
    degraded: boolean
    errors?: Record<string, string>
  }
}
