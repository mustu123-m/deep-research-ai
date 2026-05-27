import express from "express";
import cors from "cors";
import { researchRouter } from "./routes/research.js";
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://deep-research-ai-iota.vercel.app/",  // add after you get the Vercel URL
    /\.vercel\.app$/,               // allows all vercel preview URLs
  ],
  credentials: true,
}));

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Research routes
app.use("/api/research", researchRouter);

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`   Health:  GET  /health`);
  console.log(`   Start:   POST /api/research`);
  console.log(`   Stream:  GET  /api/research/:runId/stream`);
  console.log(`   Report:  GET  /api/research/:runId/report`);
  console.log(`   History: GET  /api/research/history`);
});

export { app };