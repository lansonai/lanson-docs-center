import type { LansonAudioMonitoringResponse } from '../types/monitoring/lanson-audio'
import { describe, expect, it } from 'vitest'
import {
  buildDailyBars,
  buildEvaluatedServices,
  buildHourlyBars,
  classifyBar,
  computeRequestSuccessPct,
  computeServerAvailabilityPct,
  evaluateGatewayStatus,
  evaluateOverallStatus,
} from '../lib/status-telemetry'

function makeResponse(overrides: Partial<LansonAudioMonitoringResponse> = {}): LansonAudioMonitoringResponse {
  const now = new Date()
  const recentTs = new Date(now.getTime() - 5 * 60_000).toISOString()
  return {
    meta: {
      sceneId: 'lanson-audio-gateway',
      generatedAt: now.toISOString(),
      range: '24h',
      environment: 'production',
      statusWindowMinutes: 15,
    },
    summary: {
      requests: 4578,
      successRatePct: 99.26,
      clientErrors: 34,
      serverErrors: 0,
      p50HttpMs: 121.96,
      p75HttpMs: 170.52,
      p95HttpMs: 391.8,
      sessions: 0,
      audioSeconds: 26202.03,
      transcriptions: 4544,
      meteredTranscriptions: 4544,
      p50SessionMs: null,
      p75SessionMs: null,
      p95SessionMs: null,
      droppedAudioFrames: 0,
      abnormalCloses: 0,
      upstreamConnectionFailures: 0,
      readinessFailures: 0,
      offlineJobs: 0,
      offlineErrors: 0,
      probeCyclesWithDown: 0,
      backpressureEvents: 0,
    },
    series: {
      requestTimeline: [
        { ts: recentTs, requests: 20, success: 20, serverErrors: 0, p95HttpMs: 250 },
      ],
    },
    lanes: [
      { id: 'segment', name: 'Segment HTTP', status: 'healthy', count: 4578, success: 4544, errors: 34, p95Ms: 391.8, latestSuccessAt: recentTs, recent: { count: 13, success: 13, errors: 0 }, meta: [] },
      { id: 'realtime-ws', name: 'Realtime WS', status: 'healthy', count: 0, success: 0, errors: 0, p95Ms: null, latestSuccessAt: null, recent: { count: 0, success: 0, errors: 0 }, meta: ['探活正常'] },
      { id: 'offline', name: 'Batch Jobs', status: 'healthy', count: 0, success: 0, errors: 0, p95Ms: null, latestSuccessAt: null, recent: { count: 0, success: 0, errors: 0 }, meta: ['探活正常'] },
      { id: 'language-detection', name: 'Language Detection', status: 'healthy', count: 67, success: 67, errors: 0, p95Ms: 474, latestSuccessAt: recentTs, recent: { count: 0, success: 0, errors: 0 }, meta: ['探活正常'] },
      { id: 'classification', name: 'Audio Classification', status: 'healthy', count: 445, success: 445, errors: 0, p95Ms: 234, latestSuccessAt: recentTs, recent: { count: 0, success: 0, errors: 0 }, meta: ['探活正常'] },
    ],
    upstreamWorkers: [],
    incidents: [],
    freshness: { latestEventAt: recentTs, isStale: false, staleAfterMinutes: 10 },
    queryHealth: { total: 12, succeeded: 12, failed: 0, degraded: false },
    ...overrides,
  }
}

describe('status telemetry consumer', () => {
  it('separates current 15m operational status from 24h historical attacks and incidents', () => {
    const recovered = makeResponse({
      summary: {
        ...makeResponse().summary,
        requests: 1000,
        successRatePct: 80,
        serverErrors: 200,
        upstreamConnectionFailures: 15,
        readinessFailures: 4,
      },
      incidents: [{ _time: new Date(Date.now() - 8 * 3600_000).toISOString(), event_name: 'gateway.request.failed' }],
    })

    const { coreServices, additionalServices } = buildEvaluatedServices(recovered, false)
    expect(coreServices.map(s => s.id)).toEqual(['realtime-streaming', 'batch-processing', 'api-gateway'])
    expect(coreServices.map(s => s.status)).toEqual(['operational', 'operational', 'operational'])
    expect(additionalServices.map(s => s.status)).toEqual(['operational', 'operational'])
    expect(evaluateOverallStatus(recovered, coreServices, additionalServices)).toBe('operational')
  })

  it('degrades API Gateway when the recent 15-20m timeline bucket shows elevated 5xx rate', () => {
    const now = Date.now()
    const degraded = makeResponse({
      series: {
        requestTimeline: [
          { ts: new Date(now - 5 * 60_000).toISOString(), requests: 50, success: 45, serverErrors: 3, p95HttpMs: 900 },
        ],
      },
    })

    const gw = evaluateGatewayStatus(degraded, false, now)
    expect(gw.status).toBe('degraded')

    const { coreServices, additionalServices } = buildEvaluatedServices(degraded, false, now)
    expect(evaluateOverallStatus(degraded, coreServices, additionalServices)).toBe('degraded')
  })

  it('protects against low-traffic false outage alarms', () => {
    const now = Date.now()
    const lowTraffic = makeResponse({
      series: {
        requestTimeline: [
          { ts: new Date(now - 3 * 60_000).toISOString(), requests: 2, success: 1, serverErrors: 1, p95HttpMs: 400 },
        ],
      },
    })

    const gw = evaluateGatewayStatus(lowTraffic, false, now)
    expect(gw.status).toBe('operational')
  })

  it('excludes client 4xx errors from server availability while preserving 2xx-3xx rate', () => {
    expect(computeServerAvailabilityPct(4578, 0)).toBe(100)
    expect(computeRequestSuccessPct(4578, 4544)).toBe(99.26)
    expect(computeServerAvailabilityPct(0, 0)).toBeNull()
  })

  it('treats partial sub-lane failures in Batch Processing as degraded rather than total outage', () => {
    const base = makeResponse()
    const partial = makeResponse({
      lanes: base.lanes.map(l => (l.id === 'offline' ? { ...l, status: 'down' as const } : l)),
    })

    const { coreServices, additionalServices } = buildEvaluatedServices(partial, false)
    const batch = coreServices.find(s => s.id === 'batch-processing')
    expect(batch?.status).toBe('degraded')
    expect(evaluateOverallStatus(partial, coreServices, additionalServices)).toBe('degraded')
  })

  it('builds hourly and daily bars with 4xx-excluded server availability', () => {
    const now = Date.UTC(2026, 10, 22, 12, 0, 0)
    const rows = [
      { ts: new Date(now - 30 * 60_000).toISOString(), requests: 100, success: 90, serverErrors: 0, p95HttpMs: 320 },
    ]
    const hourly = buildHourlyBars(rows, 24, ms => new Date(ms).toISOString().slice(11, 16), now)
    const activeHour = hourly.find(b => b.requests > 0)
    expect(activeHour?.availabilityPct).toBe(100)
    expect(activeHour?.requestSuccessPct).toBe(90)
    expect(activeHour?.status).toBe('operational')

    const daily = buildDailyBars(rows, 30, ms => new Date(ms).toISOString().slice(0, 10), now)
    expect(daily).toHaveLength(30)
    expect(daily.at(-1)?.availabilityPct).toBe(100)
  })

  it('keeps minor sub-1% transient errors green and only degrades at >=1% 5xx', () => {
    expect(classifyBar(0, 0)).toBe('nodata')
    expect(classifyBar(1000, 1)).toBe('operational')
    expect(classifyBar(1000, 9)).toBe('operational')
    expect(classifyBar(1000, 10)).toBe('degraded')
    expect(classifyBar(1000, 50)).toBe('down')
  })
})
