import type { MonitoringRange } from '~/types/monitoring/lanson-audio'

export interface AxiomQueryResult<T = Record<string, unknown>> {
  rows: T[]
  error?: string
}

const AXIOM_API_BASE = 'https://api.axiom.co'

/** Execute a single APL query via the Axiom Datasets Query API. */
export async function executeAxiomApl<T = Record<string, unknown>>(
  apl: string,
  opts: {
    token: string
    orgId: string
    startTime: string
    endTime: string
  },
): Promise<AxiomQueryResult<T>> {
  try {
    const url = `${AXIOM_API_BASE}/v1/datasets/_apl?format=tabular`
    const body = JSON.stringify({
      apl,
      startTime: opts.startTime,
      endTime: opts.endTime,
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${opts.token}`,
        'X-Axiom-Org-Id': opts.orgId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(12_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { rows: [], error: `Axiom HTTP ${res.status}: ${text.slice(0, 200)}` }
    }

    const json = (await res.json()) as {
      tables?: Array<{
        fields?: Array<{ name: string, type?: string }>
        columns?: unknown[][]
      }>
    }

    const table = json?.tables?.[0]
    const fields = table?.fields
    const columns = table?.columns

    if (!Array.isArray(fields) || fields.length === 0 || !Array.isArray(columns) || columns.length === 0) {
      return { rows: [] }
    }

    const rowCount = (columns[0] as unknown[]).length
    const rows: T[] = []
    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const obj: Record<string, unknown> = {}
      fields.forEach((field, colIdx) => {
        obj[field.name] = (columns[colIdx] as unknown[])[rowIdx]
      })
      rows.push(obj as T)
    }

    return { rows }
  }
  catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { rows: [], error: `Axiom fetch error: ${msg}` }
  }
}

function datasetRef(dataset: string): string {
  return `['${dataset.replace(/'/g, '\\\'')}']`
}

function environmentFilter(environment: string): string {
  if (environment === 'non-production') {
    return ' | where environment in ("preview", "development")'
  }
  return ` | where environment == "${environment.replace(/"/g, '\\"')}"`
}

function trendBucket(range: MonitoringRange): string {
  if (range === '24h')
    return '10m'
  if (range === '3d')
    return '1h'
  if (range === '7d')
    return '6h'
  return '1d'
}

export function resolveLansonAudioStartTime(range: MonitoringRange): string {
  if (range === '24h')
    return 'now-24h'
  if (range === '3d')
    return 'now-3d'
  if (range === '7d')
    return 'now-7d'
  if (range === '30d')
    return 'now-30d'
  return 'now-90d'
}

export function buildLansonAudioGatewayApls(
  environment: string,
  range: MonitoringRange,
  dataset = 'lanson.backend.api',
) {
  const base = `${datasetRef(dataset)} | where project == "lanson-audio-v1"${environmentFilter(environment)}`
  const requestCompleted = `${base} | where event_name == "gateway.request.completed" and path == "/v1/audio/transcriptions"`
  const sessionClosed = `${base} | where event_name == "gateway.session.closed"`
  const bucket = trendBucket(range)

  return {
    requestSummary:
      `${requestCompleted}`
      + ' | extend status=tolong(column_ifexists("status", 0)), duration_ms=toreal(column_ifexists("duration_ms", 0)), path=tostring(column_ifexists("path", "")), method=tostring(column_ifexists("method", ""))'
      + ' | summarize requests=count(), success=countif(status >= 200 and status < 400), client_errors=countif(status >= 400 and status < 500), server_errors=countif(status >= 500), p50_http_ms=percentile(duration_ms, 50), p75_http_ms=percentile(duration_ms, 75), p95_http_ms=percentile(duration_ms, 95), latest_event_at=max(_time), offline_jobs=countif(path == "/v1/audio/transcriptions" and method == "POST" and status == 202), offline_errors=countif(path == "/v1/audio/transcriptions" and method == "POST" and status >= 400)',
    transcriptionSummary:
      `${base} | where event_name == "gateway.transcription.finished"`
      + ' | extend audio_seconds=toreal(column_ifexists("audio_seconds", 0))'
      + ' | summarize transcriptions=count(), transcribed_seconds=sum(audio_seconds), metered=countif(audio_seconds > 0), latest_transcription_at=max(_time)',
    laneSummary:
      `${base} | where event_name == "gateway.request.completed"`
      + ' | extend status=tolong(column_ifexists("status", 0)), duration_ms=toreal(column_ifexists("duration_ms", 0))'
      + ' | summarize requests=count(), success=countif(status >= 200 and status < 400), client_errors=countif(status >= 400 and status < 500), server_errors=countif(status >= 500), p95_ms=percentile(duration_ms, 95), latest_at=max(_time), latest_success_at=maxif(_time, status >= 200 and status < 400) by path',
    offlineLaneSummary:
      `${base} | where event_name startswith "gateway.offline."`
      + ' | extend language_error=tostring(column_ifexists("error", ""))'
      + ' | summarize jobs_received=countif(event_name == "gateway.offline.job_received"), jobs_started=countif(event_name == "gateway.offline.job_started"), jobs_completed=countif(event_name == "gateway.offline.job_completed"), jobs_failed=countif(event_name == "gateway.offline.job_failed"), chunks_ready=countif(event_name == "gateway.offline.chunk_ready"), chunks_failed=countif(event_name == "gateway.offline.chunk_failed"), chunks_dropped=countif(event_name == "gateway.offline.chunk_dropped"), chunk_split_retries=countif(event_name == "gateway.offline.chunk_split_retry"), language_detections=countif(event_name == "gateway.offline.language_detected"), language_detection_failures=countif(event_name == "gateway.offline.language_detected" and language_error != ""), latest_at=max(_time), latest_success_at=maxif(_time, event_name in ("gateway.offline.job_completed", "gateway.offline.chunk_transcribed"))',
    upstreamWorkerSummary:
      `${base} | where event_name == "gateway.transcription.finished"`
      + ' | extend audio_seconds=toreal(column_ifexists("audio_seconds", 0))'
      + ' | summarize finished=count(), audio_seconds=sum(audio_seconds), latest_at=max(_time) by worker_id'
      + ' | sort by finished desc',
    sessionSummary:
      `${sessionClosed}`
      + ' | extend duration_ms=toreal(column_ifexists("duration_ms", 0)), audio_seconds=toreal(column_ifexists("audio_seconds", 0)), dropped_audio_frames=tolong(column_ifexists("dropped_audio_frames", 0)), close_reason=tostring(column_ifexists("reason", ""))'
      + ' | summarize sessions=count(), audio_seconds=sum(audio_seconds), p50_session_ms=percentile(duration_ms, 50), p75_session_ms=percentile(duration_ms, 75), p95_session_ms=percentile(duration_ms, 95), dropped_audio_frames=sum(dropped_audio_frames), abnormal_closes=countif(close_reason != "client_closed"), latest_session_at=max(_time)',
    reliabilitySummary:
      `${base}`
      + ' | where event_name in ("gateway.readiness.checked", "gateway.readiness.degraded", "gateway.session.backpressure_detected", "gateway.request.failed")'
      + ' | extend worker_registry_ok=tobool(column_ifexists("worker_registry_ok", false))'
      + ' | summarize upstream_connection_failures=countif(event_name == "gateway.request.failed"), readiness_failures=countif(event_name == "gateway.readiness.checked" and worker_registry_ok == false), probe_cycles_with_down=countif(event_name == "gateway.readiness.degraded"), backpressure_events=countif(event_name == "gateway.session.backpressure_detected")',
    requestTimeline:
      `${requestCompleted}`
      + ` | extend status=tolong(column_ifexists("status", 0)), duration_ms=toreal(column_ifexists("duration_ms", 0)), ts=bin(_time, ${bucket})`
      + ' | summarize requests=count(), success=countif(status >= 200 and status < 400), server_errors=countif(status >= 500), p95_http_ms=percentile(duration_ms, 95) by ts'
      + ' | sort by ts asc',
    recentIncidents:
      `${base}`
      + ' | extend close_reason=tostring(column_ifexists("reason", "")), worker_registry_ok=tobool(column_ifexists("worker_registry_ok", false))'
      + ' | where event_name in ("gateway.request.failed", "gateway.session.backpressure_detected", "gateway.readiness.degraded") or (event_name == "gateway.readiness.checked" and worker_registry_ok == false) or (event_name == "gateway.session.closed" and close_reason != "client_closed")'
      + ' | project _time, event_name, request_id=tostring(column_ifexists("request_id", "")), session_id=tostring(column_ifexists("session_id", "")), key_id=tostring(column_ifexists("key_id", "")), owner_id=tostring(column_ifexists("owner_id", "")), reason=close_reason, close_code=tolong(column_ifexists("close_code", 0)), status=tolong(column_ifexists("status", 0)), duration_ms=toreal(column_ifexists("duration_ms", 0)), audio_seconds=toreal(column_ifexists("audio_seconds", 0)), dropped_audio_frames=tolong(column_ifexists("dropped_audio_frames", 0)), error_message=tostring(column_ifexists("error_message", "")), upstream_status=tolong(column_ifexists("upstream_status", 0)), worker_registry_ok=worker_registry_ok'
      + ' | sort by _time desc | take 50',
  }
}
