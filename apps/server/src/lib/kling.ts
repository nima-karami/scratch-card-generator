import { config } from "../config.js";

function getApiKey(): string {
  const key = config.kling.apiKey;
  if (!key) {
    throw new Error("KLING_API_KEY is not set");
  }
  return key;
}

/** Kling 3.0 supports duration 3-15 seconds. */
function clampDuration(duration: number): number {
  return Math.min(15, Math.max(3, Math.round(duration)));
}

type AspectRatio = "16:9" | "9:16" | "1:1";
type Mode = "standard" | "professional";

type Text2VideoParams = {
  prompt: string;
  model?: string;
  duration?: number;
  aspect_ratio?: AspectRatio;
  mode?: Mode;
  negative_prompt?: string;
};

type FramesParams = {
  prompt: string;
  startFrame: string;
  endFrame?: string;
  model?: string;
  duration?: number;
  aspect_ratio?: AspectRatio;
  mode?: Mode;
};

/** Kling 3.0 API create response */
interface Kling3CreateResponse {
  code?: number;
  message?: string;
  data?: { task_id?: string; status?: string; consumed_credits?: number };
}

/** Kling 3.0 API status response */
interface Kling3StatusResponse {
  code?: number;
  message?: string;
  data?: {
    task_id?: string;
    status?: string;
    response?: string[];
    error_message?: string | null;
  };
}

type KlingFetchOptions =
  | { method: "GET" }
  | { method: "POST"; jsonBody: object };

async function klingFetch<T>(path: string, options: KlingFetchOptions): Promise<T> {
  const url = `${config.kling.baseUrl}${path}`;
  const body = options.method === "POST" ? JSON.stringify(options.jsonBody) : undefined;
  const res = await fetch(url, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body,
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) {
    const err = (data as { error?: string; message?: string }).error ?? (data as { message?: string }).message ?? res.statusText;
    throw new Error(`Kling API error (${res.status}): ${err}`);
  }
  return data as T;
}

/**
 * Generate video from text prompt only (Kling 3.0).
 */
export async function generateVideoFromText(
  params: Text2VideoParams
): Promise<{ taskId: string }> {
  const mode = params.mode ?? "professional";
  const type = mode === "professional" ? "pro-text-to-video" : "std-text-to-video";
  const duration = clampDuration(params.duration ?? 5);
  const body = {
    type,
    prompt: params.prompt,
    duration,
    aspect_ratio: params.aspect_ratio ?? "16:9",
    sound: true,
    ...(params.negative_prompt && { negative_prompt: params.negative_prompt }),
  };
  const res = await klingFetch<Kling3CreateResponse>("/api/generate", {
    method: "POST",
    jsonBody: body,
  });
  const taskId = res.data?.task_id;
  if (!taskId) {
    throw new Error("Kling 3.0 API did not return task_id");
  }
  return { taskId };
}

/**
 * Generate video from start frame (and optional end frame) (Kling 3.0).
 */
export async function generateVideoFromFrames(
  params: FramesParams
): Promise<{ taskId: string }> {
  const mode = params.mode ?? "professional";
  const type = mode === "professional" ? "pro-image-to-video" : "std-image-to-video";
  const duration = clampDuration(params.duration ?? 5);
  const body: Record<string, unknown> = {
    type,
    prompt: params.prompt,
    image: params.startFrame,
    duration,
    aspect_ratio: params.aspect_ratio ?? "16:9",
    sound: true,
  };
  if (params.endFrame) {
    body.end_image = params.endFrame;
  }
  const res = await klingFetch<Kling3CreateResponse>("/api/generate", {
    method: "POST",
    jsonBody: body,
  });
  const taskId = res.data?.task_id;
  if (!taskId) {
    throw new Error("Kling 3.0 API did not return task_id");
  }
  return { taskId };
}

/**
 * Get current status and result for a task (Kling 3.0).
 */
export async function getVideoResult(
  taskId: string
): Promise<{ status: string; videoUrl?: string; error?: string }> {
  const res = await klingFetch<Kling3StatusResponse>(
    `/api/status?task_id=${encodeURIComponent(taskId)}`,
    { method: "GET" }
  );
  const data = res.data;
  const rawStatus = (data?.status ?? "unknown").toLowerCase();
  const videoUrl = data?.response?.[0];
  const error = data?.error_message ?? undefined;
  const status =
    rawStatus === "success" ? "succeed" : rawStatus === "failed" ? "failed" : rawStatus;
  return {
    status,
    ...(videoUrl && { videoUrl }),
    ...(error && { error }),
  };
}

/**
 * Poll until the task completes or times out. Returns the video URL on success.
 */
export async function pollUntilComplete(
  taskId: string,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? config.kling.pollTimeoutMs;
  const intervalMs = options?.intervalMs ?? config.kling.pollIntervalMs;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await getVideoResult(taskId);
    if (result.status === "succeed" || result.status === "completed") {
      if (result.videoUrl) return result.videoUrl;
      throw new Error("Kling task completed but no video URL returned");
    }
    if (result.status === "failed" || result.status === "error") {
      throw new Error(result.error ?? "Kling task failed");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Kling task ${taskId} timed out after ${timeoutMs}ms`);
}

export type GenerateKlingVideoParams = {
  prompt: string;
  startFrame?: string;
  endFrame?: string;
  model?: string;
  /** Duration in seconds (3-15). */
  duration?: number;
  aspect_ratio?: AspectRatio;
  mode?: Mode;
};

/**
 * Single entry point: text2video if no startFrame, otherwise image2video.
 */
export async function generateKlingVideo(
  params: GenerateKlingVideoParams
): Promise<{ taskId: string }> {
  if (!params.startFrame) {
    return generateVideoFromText({
      prompt: params.prompt,
      model: params.model,
      duration: params.duration,
      aspect_ratio: params.aspect_ratio,
      mode: params.mode,
    });
  }
  return generateVideoFromFrames({
    prompt: params.prompt,
    startFrame: params.startFrame,
    endFrame: params.endFrame,
    model: params.model,
    duration: params.duration,
    aspect_ratio: params.aspect_ratio,
    mode: params.mode,
  });
}
