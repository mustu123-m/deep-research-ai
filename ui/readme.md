# Research Pipeline UI

React + Vite frontend for the Multi-Agent Research Pipeline.

## Setup

```bash
cd ui
npm install
npm run dev        # starts on http://localhost:5173
```

The API must be running at the same time:

```bash
# In project root (separate terminal)
npm run api        # starts on http://localhost:3001
```

Vite proxies all `/api/*` requests to `localhost:3001` so there
are no CORS issues in development.

## Project structure

```
src/
  types/index.ts          — shared TypeScript interfaces
  lib/api.ts              — fetch wrappers for every API endpoint
  hooks/
    useSSE.ts             — opens/closes EventSource, fires handlers
    useResearch.ts        — orchestrates a full pipeline run
  components/
    SearchForm            — topic input + example chips
    PipelineProgress      — live node timeline + meta bar
    ReportView            — renders the finished report
    HistoryList           — table of past runs
  pages/
    Home                  — search + live run view
    History               — past runs list
    ReportPage            — load & display a historical report
  App.tsx                 — router + layout shell
  main.tsx                — entry point
  index.css               — global CSS variables + reset
```

## Routes

| Path              | Page        |
|-------------------|-------------|
| `/`               | Home        |
| `/history`        | History     |
| `/report/:runId`  | ReportPage  |

## Build for production

```bash
npm run build      # outputs to ui/dist/
```

Serve `dist/` with any static host (Netlify, Vercel, nginx).
Point the API base URL to your deployed API server.