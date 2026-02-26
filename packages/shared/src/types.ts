/** API: POST /api/generate request body */
export interface GenerateRequest {
  prompt: string;
}

/** API: POST /api/generate response */
export interface GenerateResponse {
  jobId: string;
}

/** Slot for a single image on the card */
export interface CardImageSlot {
  id: string;
  url: string;
  alt?: string;
}

/** Final composed card data for the scratch-card layout */
export interface CardData {
  title: string;
  tagline: string;
  layout: string;
  images: CardImageSlot[];
}

/** Job status for internal/SSE use */
export enum JobStatus {
  Queued = "queued",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
}

/** SSE: text (title + tagline) ready */
export interface TextReadyEvent {
  type: "text-ready";
  title: string;
  tagline: string;
}

/** SSE: image generation progress */
export interface ImageProgressEvent {
  type: "image-progress";
  index: number;
  total: number;
  message?: string;
}

/** SSE: single image ready */
export interface ImageReadyEvent {
  type: "image-ready";
  index: number;
  url: string;
  id: string;
}

/** SSE: composing final card */
export interface ComposingEvent {
  type: "composing";
  message?: string;
}

/** SSE: job complete */
export interface CompleteEvent {
  type: "complete";
  jobId: string;
}

/** SSE: error */
export interface ErrorEvent {
  type: "error";
  message: string;
  code?: string;
}

export type SSEEvent =
  | TextReadyEvent
  | ImageProgressEvent
  | ImageReadyEvent
  | ComposingEvent
  | CompleteEvent
  | ErrorEvent;
