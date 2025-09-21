This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Smart Alarm (ESP32) Page

- Route: `/smart-alarm`
- Purpose: Configure bedtime/wake time and demo ESP32 features (sunrise, sunset, buzzer, night light).

### ESP32 Local Bridge

This app sends commands to a local bridge process which talks to the ESP32 over USB serial and exposes:

- HTTP: `http://127.0.0.1:3001/command`
- WebSocket: `ws://127.0.0.1:3002`

The Next.js API at `app/api/esp32/route.ts` forwards app commands to `http://127.0.0.1:3001/command` and streams live messages via SSE from the WebSocket.

To start the bridge:

```powershell
cd ..\sleep-app-backend\app
npm install
node server.js
```

Then, in another terminal, start the app:

```powershell
cd ..\sleep-app
npm run dev
```

Visit `http://localhost:3000/smart-alarm`.

If your firmware expects different command names, adjust `src/lib/esp32.ts`.
