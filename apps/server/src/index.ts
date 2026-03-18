import express from "express";
import cors from "cors";
import { postGenerate, rateLimitGenerate } from "./routes/generate.js";
import { getStatus } from "./routes/status.js";
import { getCard } from "./routes/card.js";
import { health } from "./routes/health.js";
import { postKlingVideo, getKlingVideoStatus, rateLimitKlingVideo } from "./routes/kling-video.js";
import { postSoundEffect, rateLimitSoundEffect } from "./routes/sound-effect.js";
import { postContainerImage } from "./routes/container-image.js";
import { getJobAsset } from "./routes/job-assets.js";
import { postNextGame } from "./routes/next-game.js";
import { config } from "./config/index.js";
import { createWorker } from "./queue/worker.js";

const app = express();
app.use(cors());
app.use(express.json());
console.log(config);

app.get("/api/health", health);
app.post("/api/generate", rateLimitGenerate, postGenerate);
app.post("/api/next/:jobId", postNextGame);
app.get("/api/status/:jobId", getStatus);
app.get("/api/card/:jobId", getCard);
app.get("/api/jobs/:jobId/assets/:filename", getJobAsset);
app.post("/api/kling/video", rateLimitKlingVideo, postKlingVideo);
app.get("/api/kling/video/:taskId", getKlingVideoStatus);
app.post("/api/sound-effect", rateLimitSoundEffect, postSoundEffect);
app.post("/api/container-image", postContainerImage);

createWorker();

const port = config.server.port;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
