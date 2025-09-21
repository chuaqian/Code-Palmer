# 💤 SleepSync — Smart Sleep Optimization

Personal sleep insights, live environment tracking, and an ESP32-powered smart alarm — all in one PWA-friendly Next.js app.

## ✨ Overview

SleepSync is a mobile-first web app that helps you improve your sleep using simple daily logs, AI-driven recommendations, and optional IoT integration. It includes:

- 📊 A modern dashboard with sleep trends and scores
- 🤖 AI recommendations (Gemini) with safe offline fallback
- 🌙 Smart Alarm page with an ESP32 bridge (USB serial → HTTP/WebSocket)
- 🌡️ Live environment tracking patterns (temperature, humidity, light, sound)
- 📱 Progressive Web App mindset (fast, responsive, mobile-first)

This repository hosts three parts:

1) `application/sleep-app` — Next.js 15 + Tailwind app (frontend + API routes)
2) `application/sleep-app-backend` — Node bridge that talks to ESP32 over serial
3) `main/` — ESP-IDF project scaffold for firmware (for future expansion)

> Product context and design guidelines live in `.github/instructions/PRD.instructions.md` and `application/PRD.md`.

---

## 🧭 Features

- 🔐 Onboarding and profile preferences (sleep goals, schedules)
- 📝 Manual sleep logging with environment factors
- 🧮 Sleep score and trend visualizations (7‑day view)
- 🤖 AI recommendations (3–5 tips) via Gemini with heuristics fallback
- ⏰ Smart Alarm (ESP32): sunrise/sunset light, buzzer, night light demos
- 🔌 Local bridge over WebSocket/HTTP for live device streaming
- 🧪 Unit tests for scoring and recommendations

---

## 🧱 Monorepo Structure

```
Code-Palmer/
├─ application/
│  ├─ sleep-app/                # Next.js PWA frontend + API routes
│  │  ├─ app/                   # App Router pages (dashboard, trends, etc.)
│  │  ├─ src/                   # Components, stores, lib
│  │  ├─ lib/                   # Utilities
│  │  └─ package.json
│  └─ sleep-app-backend/        # Node bridge to ESP32 (serial ↔ WS/HTTP)
│     └─ app/server.js
└─ main/                        # ESP-IDF C firmware scaffold
   ├─ CMakeLists.txt
   └─ main.c
```

---

## 🛠️ Tech Stack

Frontend (Next.js app):

- `Next.js 15` (App Router), `React 19`, `TypeScript`
- `TailwindCSS 4`, `@heroui/react`, `framer-motion`
- Charts: `recharts`
- State: `zustand`
- Forms: `react-hook-form` + `zod`

Backend (serverless + local bridge):

- Next.js API routes for `/api/recommendations`, `/api/esp32`
- Node bridge (`application/sleep-app-backend/app/server.js`): `express`, `ws`, `serialport`

AI:

- Google Gemini via `@google/generative-ai` (optional; graceful fallback)

Firmware:

- ESP-IDF project scaffold in `main/` (C/CMake)

Tooling & Tests:

- `vitest` for unit tests
- `tailwindcss` v4 pipeline

---

## 📚 Frameworks & Libraries (versions)

Frontend — Next.js app (`application/sleep-app`):

- Core: `next@15.5.3` (App Router, Turbopack), `react@19.1.0`, `react-dom@19.1.0`, `typescript@^5`
- Styling: `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `tailwind-merge@^3.3.1`, `tailwindcss-animate@^1.0.7`, `clsx@^2.1.1`, `class-variance-authority@^0.7.1`
- UI: `@heroui/react@^2.8.4`, `framer-motion@^12.23.16`, Icons: `lucide-react@^0.544.0`, `@heroicons/react@^2.1.5`
- Forms & Validation: `react-hook-form@^7.63.0`, `@hookform/resolvers@^3.10.0`, `zod@^3.25.76`
- State: `zustand@^4.5.7`
- Charts: `recharts@^2.15.4`
- AI: `@google/generative-ai@^0.21.0` (Gemini; optional with graceful fallback)
- Realtime/WS (where applicable): `ws@^8.18.0`
- Testing: `vitest@^2.1.9`
- Types: `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19`, `@types/ws@^8.18.1`

Backend — Bridge server (`application/sleep-app-backend`):

- Server: `express@^4.18.2`, `cors@^2.8.5`
- Realtime: `ws@^8.14.2`
- Hardware I/O: `serialport@^12.0.0`
- Dev: `nodemon@^3.0.1`

Firmware:

- ESP‑IDF C scaffold in `main/` (build system: CMake; versions depend on your local ESP‑IDF installation)

PWA bits:

- App uses a PWA mindset with `public/manifest.webmanifest`; offline/service worker work can be layered in as needed.

Notes:

- Node.js 18+ recommended. If you enable AI, set `GOOGLE_GENERATIVE_AI_API_KEY`.
- The frontend dev server uses Turbopack (`next dev --turbopack`).

## 🚀 Quick Start (Windows, PowerShell)

Prerequisites:

- Node.js 18+ and npm
- (Optional) ESP32 connected via USB if using Smart Alarm demo

1) Start the local ESP32 bridge (optional, required for `/smart-alarm`):

```powershell
cd application\sleep-app-backend\app
npm install
node server.js
```

2) In a new terminal, run the web app:

```powershell
cd application\sleep-app
npm install
npm run dev
```

Open `http://localhost:3000`.

Smart Alarm page: `http://localhost:3000/smart-alarm`

---

## 🔌 ESP32 Bridge Details

- HTTP: `http://127.0.0.1:3001/command` (POST `{ command, data? }`)
- WebSocket: `ws://127.0.0.1:3002`
- The bridge auto-detects common USB chips (CH340/CP210/FTDI). It forwards JSON commands to the ESP32 firmware and broadcasts ESP32 logs and JSON messages back to the browser.
- Next.js API proxy at `app/api/esp32/route.ts` offers a simple frontend-facing endpoint.

If your firmware expects different command names or JSON schema, adjust `application/sleep-app/src/lib/esp32.ts` and `application/sleep-app-backend/app/server.js` accordingly.

---

## 🤖 AI Recommendations

Add a Gemini API key in `application/sleep-app/.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Then restart the dev server:

```powershell
cd application\sleep-app
npm run dev
```

Unit tests:

```powershell
cd application\sleep-app
npm test
```

---

## 📂 Notable App Routes

- `/` — Dashboard (sleep score, insights)
- `/log` — Manual sleep logging
- `/trends` — Weekly trends and charts
- `/smart-alarm` — ESP32 Smart Alarm demo and controls
- `/settings` — Preferences and goals

---

## 🧩 Key Packages Used

- UI/UX: `@heroui/react`, `framer-motion`, `lucide-react`, `@heroicons/react`
- Data & Forms: `react-hook-form`, `zod`, `zustand`, `clsx`, `class-variance-authority`, `tailwind-merge`, `tailwindcss-animate`
- Charts: `recharts`
- AI: `@google/generative-ai`
- Realtime/Bridge: `ws`, `serialport` (bridge), `express`, `cors`

---

## 🧪 Testing

We use `vitest` for fast unit tests around scoring and recommendations.

```powershell
cd application\sleep-app
npm test
```

---

## 🗃️ Repository Docs

- Product requirements and design ethos: `.github/instructions/PRD.instructions.md`
- App-level docs: `application/PRD.md`, `application/DESIGN_REQUIREMENTS.md`, `application/CODE_PLAN.md`

---

## 🛣️ Roadmap (MVP → Beyond)

- Wearable integrations (Apple HealthKit / Google Fit)
- Smart environment live charts (buffers, thresholds, IndexedDB)
- Notifications and PWA install flow
- Expanded insights and correlations
- Deployment to Vercel

---

## 🙌 Acknowledgements

- Next.js, TailwindCSS, and the open-source libraries listed above
- ESP32 ecosystem and `serialport` community