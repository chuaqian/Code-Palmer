# SleepSync MVP Code Plan (Next.js + React, Mobile-First PWA)

This plan implements the PRD within the current Next.js project, optimized for a 24-hour MVP with:

- No authentication (skip Supabase)
- Client-side persistence (localStorage)
- In-app reminders
- OpenAI-backed recommendations via a single serverless endpoint
- Dark-themed, mobile-first UI
- Mock data for demo

---

## 1) Objectives and Constraints

- Deliver core flows: Onboarding → Log Sleep → Dashboard with Score + Trends → AI Recommendations (3–5 tips).
- No backend database; storage is client-only for speed.
- Keep server-side use only for calling OpenAI securely.
- Mobile-first PWA with offline-read capability for recent data.

---

## 2) Tech Stack and Dependencies

- Next.js (App Router) + React + TypeScript
- USE HERO UI for ALL UI COMPONENTS
- State & Forms:
  - Zustand (global app store) with persist (localStorage)
  - React Hook Form + Zod (forms and validation)
- Charts: Custom lightweight React SVG components (Hero UI Charts-style)
- Dates: date-fns
- OpenAI: official OpenAI Node SDK (server-side in route handler)
- PWA: Web App Manifest + minimal Service Worker (static shell caching)

Install (later):

- npm i zustand zustand/middleware react-hook-form zod date-fns openai
- npm i -D @types/node

Environment:

- .env.local
  - OPENAI_API_KEY= (provided by you later)

---

## 3) Project Structure (App Router)

app/

- layout.tsx (providers, theme, meta, mobile viewport)
- globals.css (Tailwind + dark theme tokens)
- page.tsx → redirect logic (onboarding or dashboard)
- onboarding/page.tsx (steps: target hours, bedtime, wake time)
- dashboard/page.tsx (sleep score, quick stats, AI recs)
- log-sleep/page.tsx (form with duration, quality, environment, notes)
- trends/page.tsx (7-day charts)
- settings/page.tsx (profile/preferences, reminder config)
- api/recommendations/generate/route.ts (OpenAI call, returns tips JSON)
- manifest.webmanifest (PWA)
- icons/\* (PWA icons)
- sw.js (basic service worker for shell caching) [optional if time allows]

src/

- store/
  - profile.store.ts (profile, onboardingComplete, reminder settings)
  - sleep.store.ts (sleep logs CRUD, selectors, derived stats)
- lib/
  - score.ts (sleep score algorithm)
  - recommendations.ts (prompt builder + mapper)
  - charts.ts (chart config helpers)
  - time.ts (date utils)
  - storage.ts (persistence helpers/migrations)
- components/
  - ui/ (Button, Card, Input, Select, Slider, Toggle, Badge)
  - layout/ (TopNav, BottomNav, Screen, Section, Sheet/Drawer)
  - dashboard/ (ScoreCard, QuickStats, RecommendationsList)
  - forms/ (SleepLogForm, OnboardingForm)
  - charts/ (WeeklyTrendChart)
  - reminders/ (ReminderBanner, Countdown)
- mocks/
  - sampleLogs.ts (seeded mock data for demo)
  - sampleRecs.ts (fallback tips)

---

## 4) Data Models (TypeScript)

- Profile

  - name?: string
  - targetSleepHours: number (default 8)
  - typicalBedtime: string (HH:mm)
  - typicalWakeTime: string (HH:mm)
  - onboardingComplete: boolean

- SleepLog

  - id: string (uuid)
  - date: string (ISO date for morning wake date)
  - sleepDuration: number (hours, decimal)
  - sleepQuality: number (1–10)
  - environment: { temperature?: number; lightLevel?: 'dark'|'dim'|'bright'; noiseLevel?: 'quiet'|'moderate'|'loud' }
  - notes?: string
  - createdAt: string (ISO)

- Recommendation
  - id: string
  - content: string
  - category: 'environment' | 'routine' | 'lifestyle'
  - priority: number
  - createdAt: string (ISO)

Validation: Zod schemas for Profile and SleepLog.

---

## 5) Storage Strategy

- Zustand stores with persist middleware → localStorage keys:
  - ss_profile_v1
  - ss_sleep_logs_v1
  - ss_prefs_v1 (reminders, UI)
- Migration handling (version in store): if keys change later, map forward.
- Seed mock data on first run (if no logs present).

---

## 6) Navigation and Flow

- Initial load:

  - If onboardingComplete = false → redirect to /onboarding
  - Else → /dashboard

- Onboarding:

  - 2–3 short steps with default values; submit sets onboardingComplete = true

- Daily Loop:

  - Log Sleep (quick form <30s)
  - Dashboard updates with score and stats
  - Trends page shows 7-day graph
  - Generate Recommendations (on-demand using recent logs and profile)

- Settings:
  - Adjust targets, schedule, reminder time
  - Clear data (for demo reset)

---

## 7) Sleep Score Algorithm (MVP)

- Inputs:

  - targetSleepHours, sleepDuration, sleepQuality (1–10), environment (temp, light, noise)

- Formula (deterministic, 0–100):

  - durationScore = clamp((sleepDuration / targetSleepHours) \* 70, 0, 70)
  - qualityScore = (sleepQuality / 10) \* 20
  - envPenalty:
    - tempPenalty: if temperature <18 or >24 then -4 else 0
    - lightPenalty: dim: -2, bright: -6, else 0
    - noisePenalty: moderate: -2, loud: -6, else 0
    - envPenalty = sum, clamp min -20
  - total = clamp(durationScore + qualityScore + envPenalty, 0, 100)

- Derived stats:
  - 7-day average duration, quality, average score
  - Consistency metric: std dev of sleepDuration (lower is better)

---

## 8) Recommendations (OpenAI + Fallback)

- Route: POST /api/recommendations/generate

  - Body: { profile, recentLogs (<=7), computedStats }
  - Server-side: Use OPENAI_API_KEY; model e.g., gpt-4o-mini or cost-effective equivalent
  - Prompt: Provide concise, actionable tips (environment, routine, lifestyle), include category and priority 1–3
  - Response: 3–5 items; map to Recommendation[] and return
  - On client: store returned recs in local state for display
  - Fallback: if failure, use mock templates chosen by heuristic (e.g., short duration → routine; bright → environment)

- Minimal rate-limit:
  - Memory-based per-IP (simple Map with timestamps) or cooldown (e.g., once per hour)
  - Avoid exposing key; no client OpenAI calls

---

## 9) Pages and UI Details (Mobile-First, Dark)

- Shared

  - TopNav: title + optional “Generate Tips” action
  - BottomNav: Dashboard, Log, Trends, Settings
  - Screen container: padding, max-width, safe-area handling
  - Typography scale for glanceable metrics
  - Colors: dark slate background, indigo/teal accents, soft gradients

- /onboarding

  - Step 1: Target Hours (slider 6–9, default 8)
  - Step 2: Typical Bedtime/Wake (time inputs with suggestions)
  - CTA “Finish” → set onboardingComplete, route to /dashboard

- /dashboard

  - ScoreCard: current score (last log), color-coded ring/bar
  - QuickStats: avg duration, quality, consistency (badges)
  - RecommendationsList: shows latest 3–5 items; regenerate button
  - ReminderBanner: if within 60m of bedtime, nudge user

- /log-sleep

  - Duration (hours.min), Quality (1–10), Temperature, Light, Noise, Notes
  - Submit saves to store, recalculates score, back to /dashboard

- /trends

  - WeeklyTrendChart: dual lines (duration with filled area, quality as line) using SVG-based charts
  - Option: show score trend as line

- /settings
  - Profile and goals
  - Reminder time picker (in-app nudge)
  - Data management: import/export JSON, reset

---

## 10) Charts

- SVG-based line/area:
  - Duration (hours)
  - Quality (1–10)
  - Optional score line
- Mobile-friendly: touch targets, compact legends, high contrast

---

## 11) PWA Setup

- manifest.webmanifest: name, short_name, theme_color, background_color, display=standalone, icons
- Icons: 192, 256, 512 PNGs
- Service Worker (optional for MVP if time): pre-cache app shell (layout, CSS, fonts), network-first for data
- Add meta tags for theme-color and viewport; prompt “Add to Home Screen” hint

---

## 12) Reminders (In-App)

- User sets bedtime (from profile) and optional reminder offset (e.g., 30m before)
- Client timer checks every minute; if within window and not dismissed today, show banner/toast
- Persist lastReminderShown date in prefs

---

## 13) Accessibility and Performance

- Large tap targets, min 44px height
- Semantic headings and aria labels on charts with table fallback
- Reduce layout shift; avoid heavy images
- Preload critical fonts (system fonts preferred for speed)
- Lazy-load charts on /trends only

---

## 14) Testing Plan

- Unit: score.ts (edge cases: extreme temp/light/noise; duration <50% target; >120% target)
- Integration (manual):
  - Onboarding < 2 minutes; data persists
  - Log Sleep < 30 seconds
  - Dashboard loads < 2 seconds (warm cache)
  - 3+ recommendations visible after generation
- Smoke on mobile browsers (iOS Safari, Android Chrome)

---

## 15) Timeline (Mapped to PRD hours, adjusted)

- Hours 0–2: Scaffolding
  - Dependencies, store skeletons, routes stubs, layout theme
- Hours 2–5: Onboarding + Profile store + Redirect logic
- Hours 5–8: Sleep store, Log form, Score algorithm
- Hours 8–10: Dashboard (ScoreCard, QuickStats)
- Hours 10–12: Trends chart + mock data seed
- Hours 12–14: Recommendations API + client integration + fallback
- Hours 14–16: PWA basics (manifest, icons), reminder banner
- Hours 16–18: Polish dark theme, error states, empty states
- Hours 18–20: Manual testing, bug fixes, performance
- Hours 20–24: Vercel deploy, final verification, demo script

---

## 16) Risks and Mitigations

- No server persistence: acceptable for MVP, call out in demo; provide JSON export/import
- OpenAI latency: show loading + cached last tips, provide fallback
- PWA caching pitfalls: keep SW minimal; test updates
- Time: cut non-critical components (e.g., export/import) if behind

---

## 17) Definition of Done (MVP)

- Onboarding completes and persists locally
- User can log sleep with environment factors
- Dashboard shows score and quick stats
- Trends page renders 7-day charts (SVG-based)
- Generate 3–5 AI tips via /api route
- In-app reminder nudge works
- Deployed on Vercel; works on mobile browser
- No critical bugs in core flow

---

## 18) Implementation Tasks Checklist

General

- [ ] Install dependencies
- [ ] Add base Tailwind dark theme tokens
- [ ] Create layout.tsx with Providers (Zustand init, global styles), set viewport meta

Stores

- [ ] profile.store.ts (profile, onboardingComplete, reminder prefs, persist v1)
- [ ] sleep.store.ts (CRUD, selectors, seed mock logs, persist v1)

Lib

- [ ] score.ts (pure functions + unit tests later)
- [ ] time.ts (formatting, week ranges)
- [ ] recommendations.ts (prompt builder + mapping)
- [ ] storage.ts (migration helpers)

Pages

- [ ] /onboarding (steps, validation, submit → set onboardingComplete)
- [ ] /dashboard (ScoreCard, QuickStats, RecommendationsList, ReminderBanner)
- [ ] /log-sleep (form with RHF + Zod)
- [ ] /trends (WeeklyTrendChart)
- [ ] /settings (targets, schedule, reminder offset, data reset/export)

Components

- [ ] ui primitives (Button, Card, Input, Select, Slider, Badge, Skeleton)
- [ ] layout (TopNav, BottomNav, Screen)
- [ ] forms (SleepLogForm, OnboardingForm)
- [ ] charts (WeeklyTrendChart)
- [ ] recommendations (List, Empty state, Generate button)

API

- [ ] POST /api/recommendations/generate (OpenAI call)
- [ ] Add basic cooldown/rate-limit

PWA

- [ ] manifest.webmanifest + icons
- [ ] theme-color meta
- [ ] (Optional) sw.js for shell caching

Testing & Deploy

- [ ] score.ts tests (basic)
- [ ] Manual test per PRD stories
- [ ] Vercel deploy (set OPENAI_API_KEY)

---

## 19) Environment and Configuration

- .env.local
  - OPENAI_API_KEY=
- Add to Vercel Project Settings → Environment Variables (Production and Preview)
- No public keys needed (no Supabase)

---

## 20) Demo Script (for presentation)

1. Fresh device: open app → onboarding (target 8h, 23:00–07:00)
2. Log last night sleep: 7.2h, quality 7, dim light, moderate noise
3. Dashboard: show score and stats
4. Generate tips → 3–5 actionable items
5. Trends: 7-day mock data visualization
6. Settings: tweak target to 7.5h
7. Show in-app reminder (time mock or describe behavior)

---

## 21) Smart Environment Tracking (IoT, real-time; plan-only)

Purpose: Use live IoT sensors to track room conditions in real time (no dependency on manual sleep logs) and surface actionable insights with live charts.

IoT Data Sources (MVP)

- Sensors (Sleep Pebble prototype):
  - DHT11 → temperature (°C), humidity (%RH)
  - Photoresistor/Light sensor → raw ADC + derived voltage; map to lux + categorical level
  - HW-496 sound sensor → digital (LOW/HIGH) + categorical level; optional analog dBA approximation
- Stream: All metrics stream live at 1–2 Hz (configurable) over a local gateway to the app in real time.

Telemetry Mapping (from sample logs)

- Example lines and how we interpret:
  - "Light Sensor - Raw: 1692, Voltage: 1.45V, Level: DIM" → light: { raw: 1692, voltage: 1.45, level: "DIM", lux: approx(mapRawToLux(1692)) or fallback 5 lux if only categorical }
  - "HW-496 - Digital: LOW, Level: QUIET" and "🔊 HW-496 SOUND DETECTED: NO" → sound: { digital: "LOW", level: "QUIET", dba: approx(28–35) }
  - "⚫️ Quiet | Light: DIM | HW-496: Inactive" → status overlay, no numeric changes
  - "DHT11 - Humidity: 57.4%, Temperature: 26.6°C" → humidity: 57.4, temperature: 26.6
- Lux mapping:
  - If voltage/raw available, apply a device-specific calibration curve lux = f(raw|voltage); otherwise map categories: DARK≈0.5, DIM≈5, BRIGHT≈100.
- dBA mapping:
  - If only digital LOW/HIGH, derive category-based ranges: QUIET≈30 dBA, MODERATE≈38 dBA, LOUD≈48 dBA (tunable per calibration night).

Metrics

- Temperature (°C), Humidity (%RH), Light (lux), Sound (dBA)

Thresholds & Status Bands

- Temperature: Optimal 18–24°C; Cool 16–18; Warm 24–26; Out-of-range <16 or >26
- Humidity: Optimal 40–60%; Dry 30–40; Humid 60–70; Out-of-range <30 or >70
- Light: Optimal <1 lux; Dim 1–10; Bright >10 (use category mapping when lux not available)
- Sound: Optimal <30 dBA; Moderate 30–40; Loud >40

Data Model (planning)

- Realtime stream buffers kept per metric with ring buffers:
  - environmentLive: {
    - temperature: { value: number, ts: string }
    - humidity: { value: number, ts: string }
    - light: { lux?: number, raw?: number, voltage?: number, level: 'DARK'|'DIM'|'BRIGHT', ts: string }
    - sound: { dba?: number, digital?: 'LOW'|'HIGH', level: 'QUIET'|'MODERATE'|'LOUD', ts: string }
      }
  - environmentSeries?: Array<{ ts: string; temperature?: number; humidity?: number; lightLux?: number; soundDb?: number }>
  - environmentSummary?: same as before (avg/min/max/timeInOptimalMins) computed per session
- Sessions (per night): envSession { id, deviceId, startTs, endTs?, seriesRef }
- Storage: use IndexedDB for series (large), keep summaries in localStorage/Zustand for fast boot; migrate when implementing.

UI/UX (Dashboard)

- Section title: “Smart Environment Tracking — LIVE”.
- 2×2 grid of metric cards (mobile: two columns) with:
  - Live value + unit (updates at 1–2 Hz)
  - Status badge (Optimal / Dry / Humid / Dim / Bright / Quiet / Loud)
  - Live sparkline (rolling window, e.g., last 5–15 minutes)
  - Thin gauge/progress band with optimal range shading
- Detail modal on tap:
  - Full-width live timeline with threshold bands; scrub shows historic tooltips; “Pause/Resume live” control
  - Summary stats for current session (avg/min/max + time in optimal)
  - Context tip based on status
- Connection affordances: device name, signal/battery, Connected/Retry CTA; “Start Night / End Night” session controls.

Charts (real-time)

- Card sparkline: lightweight SVG line with decimation and smoothing; append new points on tick.
- Detail: line/area per metric with shaded threshold bands; X=time, Y=units; retain 5–15 min live window by default, allow expand to whole night.
- Current indicators: thermometer bar (temp), radial gauge (humidity), gradient lux bar (light), level meter (sound).

Interactions

- Live tooltip showing ts, value, status; “Pause live” when scrubbing.
- Toggle threshold bands; long-press to pin threshold info.
- Auto-reconnect on stream drop; offline buffer until connection resumes.

Accessibility

- ARIA labels for live regions (aria-live="polite"), clear text labels for color states.
- “Show as table” for last N minutes with timestamped values.
- Respect reduced motion; limit real-time animations.

Performance

- Stream cadence 1–2 Hz; render at ≤10 FPS for charts (coalesce ticks) to save battery.
- Use Web Worker for parsing/decimation (plan); memoize series; lazy-mount on intersection.
- Backpressure: drop intermediate points when offscreen; keep summaries accurate.

Trends Integration

- Trends page adds Environment tab: 7-day averages and % time-in-optimal per metric.
- Compare nights; highlight threshold compliance bands.

Recommendations Tie-in

- If timeInOptimalMins low or frequent out-of-range spikes, prioritize environment tips.
- Use recent live session summary for prompt context.

Implementation Tasks (revised; plan only)

- Ingestion: WebSocket over local network or MQTT over WebSockets; SSE fallback.
- Parser: map device log lines to JSON payload; compute lux/dBA via calibration or category mapping.
- lib/env.ts: thresholds, classifiers, smoothing/decimation, summary reducer.
- Storage: introduce IndexedDB for time series (idb); keep summaries in store with migration plan.
- UI: EnvCard, EnvGauge, EnvSparkline, EnvDetailModal with live state; connection banner.
- Tests: classifier edges; parser correctness on sample logs; decimation stability.

QA Checklist

- Live charts update smoothly with limited CPU; status badges accurate.
- Reconnect behavior verified; buffered data reconciles after reconnect.
- Accessibility table view and labels verified in dark mode.

---

## 22) IoT Streaming Architecture (design-forward; plan-only)

Transport Options

- Preferred: WebSocket gateway on LAN exposing JSON frames; browser connects directly.
- Alternative: MQTT broker with WebSocket support (e.g., Mosquitto/EMQX); topics: sleepsync/pebble/{deviceId}.
- Fallback: Server-Sent Events (SSE) from a local Node bridge.

Message Schema (JSON)

- { ts: ISO8601, deviceId: string,
  temperatureC?: number, humidityPct?: number,
  light?: { raw?: number, voltage?: number, level?: 'DARK'|'DIM'|'BRIGHT', lux?: number },
  sound?: { digital?: 'LOW'|'HIGH', level?: 'QUIET'|'MODERATE'|'LOUD', dba?: number } }

Calibration & Mapping

- Nightly baseline capture for sound (silence floor) and light (dark baseline) to refine lux/dBA estimates.
- Store calibration per deviceId; apply when deriving lux/dBA from raw readings.

Sessioning

- Start Night: begin envSession, clear ring buffers, mark startTs.
- End Night: finalize session, compute environmentSummary, persist series to IndexedDB, trim to quota.

Security

- Local pre-shared token attached as query param/header for WS/MQTT; rotate per build.
- No PII in telemetry; deviceId is random UUID.

Constraints

- PWA-safe: no native BLE requirement; works over Wi‑Fi LAN.
- Works offline/local-first; cloud not required for demo.
