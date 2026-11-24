---
title: Recording pipeline — never lose a finished recording
description: Why we rebuilt ingest conflict checks, finalize, and postprocess around "MP4 on disk means done", so transcription or remux races can no longer wipe out a finished programme.
updated: 2026-11-24
new: false
---

# Recording pipeline — never lose a finished recording

> **Visibility:** This page is intentionally unlisted. It is reachable at a stable URL, but it is excluded from the sidebar, the sitemap, and `robots.txt`. Share the link only when you want someone to see it.

This is the engineering write-up of commit `bce486b` against `animan-live-subtitles` (the live subtitle / recording BFF). The change touches the recording pipeline only; downstream consumers (audio transcription, subtitle generation, the partner dashboard) were not modified.

## What broke before

A finished recording could be marked `failed` for three reasons that had nothing to do with whether the video was actually on disk:

1. **Remux race.** `finalize()` ran synchronously the moment `pipeline.stop()` resolved. ffmpeg was often still flushing its `.temp.mpegts` into the final `.mp4`. The size check read `0 bytes`, the record was written as `failed`, and the user saw a red "录制失败" card even though a playable MP4 existed seconds later.
2. **Transcription / postprocess failure.** A 4xx from the Audio v1 API, an R2 permission change, or a queue overflow wrote `record.state = "failed"`. The MP4 was fine; the card went red anyway. `transcription failed` is not the same as `recording failed`.
3. **Back-to-back ingest 409.** A partner scheduling two episodes two minutes apart on the same channel got `409 "recording already exists for this source or episode and time window"`. The 5-minute padding guard meant consecutive programmes always collided.

## What we changed

- **`hasIngestJobConflict`** keeps the 5-minute padding for the *same episode* (so a duplicate partner submit of the same window is still rejected) but uses *real window overlap* for *different episodes on the same source* (so back-to-back episodes with a 2-minute gap are now accepted).
- **`createIngestJob`** only applies the active-source guard when the window opens within 60 seconds. A future job is no longer blocked by an active session that is still recording the previous programme.
- **`registry.finalize`** is now split: the synchronous part releases the source identity, stops the subtitle timer, and marks the session finalized; the asynchronous `finalizeAsync` waits for the remux to land on disk via the new `sizeAfterFinalize()` helper (up to 2 s, polling every 100 ms) and then runs `hasPlayableMp4()` to decide `done` vs `failed`.
- **`hasPlayableMp4()`** is the single source of truth: if the MP4 file is non-empty on disk, the recording is `done`. Pipeline status, ASR health, transcription cues, and postprocess state are *not* part of the decision.
- **`postprocess.runPostprocess`** writes failures only into `postprocess.state` and `postprocess.error`. It no longer touches `record.state`. If a record was previously written as `failed` but its MP4 still exists on disk, the postprocess pass heals it back to `done` (the same invariant `reconcileOrphans` uses on startup).
- **`segments.ts`** skips segments with `durationMs <= 0` when computing the cue offset, so a stalled segment can no longer poison the cue timeline of the segments that follow it.

## How we know it works

Three independent rounds of verification were run against `bce486b`:

**Round 1 — repository tests.** `bun test server/live` shows the same pass/fail signature as the pre-change baseline (53 pass / 13 fail / 9 errors; the 13+9 are pre-existing Bun `node:test` nested-test limitations, not regressions). New regression tests cover back-to-back episodes, same-episode padding preservation, real-window-overlap blocking, remux waiting, and postprocess-failure preservation.

**Round 2 — end-to-end against the business functions** (isolated `RECORD_DIR`). All six scenarios PASS:

1. EP31 done + EP1 candidate 2 minutes later, same source, different episode, no real overlap → not a conflict.
2. Same episode retried in the same window → still a conflict (dedupe preserved).
3. Same source, different episode, but the windows genuinely overlap → still a conflict.
4. Create recording → ffmpeg writes MP4 50 ms after `finalize` fires → `finalizeAsync` waits, finds the file, and the record becomes `done`.
5. Transcription deliberately broken → `record.state` stays `done`, `postprocess.state` becomes `failed`.
6. No MP4 on disk → `record.state` becomes `failed` (the legitimate empty-recording path is unchanged).

**Round 3 — production cross-check.** The production BFF was rebuilt against `bce486b` and ingested a real programme afterwards: **Nano List EP17**, window 28.0 min, `durationMs` 1,680,580 (28.01 min), `sizeBytes` 307,897,985, `recording.state` `done`, `videoUrl` fetchable. Cross-checked with `ffprobe` over HTTPS: duration 1681.68 s, size 307,897,985 bytes — exact match against the ingest API. Across the last 100 production jobs: zero `record.state = failed`, zero `record.state = done` with `postprocess.state = failed`.

## Operational notes

- **`abortUnproductive` still exists** but is now consistent with the new finalize path: if any frames reached the MP4 before the 45-second empty watchdog fires, the recording is preserved as `done`. If truly zero bytes, it is `failed` as before.
- **The 3-minute stall watchdog is unchanged.** It still force-stops a live source that stops producing audio, so we never have an indefinite "recording" hanging forever. The new finalize makes sure we don't lose the bytes we did capture.
- **Compression and subtitle generation remain separate failures.** If `RECORDING_COMPRESS` fails or Audio v1 returns an error, the user still sees the recording; only the postprocess status is red.

## Rollback

```bash
git revert bce486b
git push origin main
```

The only invariant the new code introduces is "MP4 on disk implies done". A revert takes the system back to "whatever finalize wrote in the first few milliseconds after stop", which is the pre-fix behaviour.

— Recording-pipeline verification, 2026-11-24
