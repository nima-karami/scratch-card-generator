import type { Request, Response } from "express";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { getJobOutputsDir } from "../queue/worker.js";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

/** Safe filename: no path separators or parent refs */
function isSafeFilename(filename: string): boolean {
  if (!filename || filename.length > 200) return false;
  if (filename.includes("/") || filename.includes("\\") || filename.includes(".."))
    return false;
  return true;
}

export async function getJobAsset(req: Request, res: Response): Promise<void> {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;

  if (!jobId || !filename || !isSafeFilename(filename)) {
    res.status(400).json({ error: "Invalid jobId or filename" });
    return;
  }

  const baseDir = join(process.cwd(), getJobOutputsDir(), jobId);
  const filePath = join(baseDir, filename);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: "Asset not found", jobId, filename });
    return;
  }

  const ext = filename.slice(filename.lastIndexOf("."));
  const mime = MIME_TYPES[ext] ?? "application/octet-stream";
  res.setHeader("Content-Type", mime);
  createReadStream(filePath).pipe(res);
}
