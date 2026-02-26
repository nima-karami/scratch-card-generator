import "dotenv/config";
import express from "express";
import cors from "cors";
import { postGenerate, rateLimitGenerate } from "./routes/generate.js";
import { getStatus } from "./routes/status.js";
import { getCard } from "./routes/card.js";
import { health } from "./routes/health.js";
import { createWorker } from "./queue/worker.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", health);
app.post("/api/generate", rateLimitGenerate, postGenerate);
app.get("/api/status/:jobId", getStatus);
app.get("/api/card/:jobId", getCard);

createWorker();

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
