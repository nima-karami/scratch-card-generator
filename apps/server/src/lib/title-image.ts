import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config/index.js";
import { cropTransparentToContent } from "./crop-to-content.js";
import { extractAlphaTwoPassFromBuffers } from "./extractAlpha.js";
import { generateImage } from "./gemini.js";
import { validateNumbersHeaderPairWithLLM } from "./numbers-header-qa.js";
import { sanitizeTextWithLLM } from "./llm/text-sanitizer.js";
import { swapBackground } from "./spritesheet/swap-background.js";
import sharp from "sharp";

const REFERENCE_IMAGE_PREFIX =
  "The attached image is a tagged moodboard with sections: Graphic Style, Typography, Color Palette, Background Style. For this task use ONLY the TYPOGRAPHY section as your style reference (the sample title/h headline treatment). Ignore all other sections. You are generating a standalone TITLE GRAPHIC: the title words as styled text. Match the typography's colors, lighting, textures, and treatment from the Typography section only. Do not copy the layout of the full moodboard. Output ONLY the title graphic.\n\n";

export type GenerateTitleImageParams = {
  text: string;
  visualStyle: string;
  /** When set, generation uses this image as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
  /**
   * When true, force strict single-line rendering.
   * (Useful for headings like "Lucky Numbers" where we never want wrapped/stacked typography.)
   */
  singleLine?: boolean;
};

const TITLE_VISUALSTYLE_CONSTRAINTS_TEXT = `The title image visualStyle MUST be typography-only.
Allowed: font weight/style, letter outlines/strokes, fill color usage, distressed texture, halftone/print texture INSIDE the letters, shadow/drop-shadow, subtle glow/inner effects, and decorative letter-adjacent ornaments that are part of the typography treatment (e.g. water drops/splashes, beach spritz, small shell/bubble accents, small leaf-like flourishes near letters).
Forbidden: any framing/layout description that indicates an external frame or surrounding composition (anything implying “around the title/letters” as a container), borders around the whole title, or any background/scene composition OUTSIDE the letters.
Important: keep small letter-adjacent ornaments even if they contain words like “leaf” or “foliage”, as long as they are described as ornamentation attached to or immediately next to the letters (not a full surrounding frame/background).
The sanitized output will be embedded into an instruction that also states the image must be ONLY the title words on a solid white background.`;

const sanitizedVisualStyleCache = new Map<string, Promise<string>>();

async function sanitizeVisualStyle(originalStyle: string): Promise<string> {
  const key = originalStyle;
  const cached = sanitizedVisualStyleCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    let sanitized = originalStyle;
    const trimmed = originalStyle.trim();
    if (!trimmed) return trimmed;

    try {
      sanitized = await sanitizeTextWithLLM({
        inputText: trimmed,
        constraintsText: TITLE_VISUALSTYLE_CONSTRAINTS_TEXT,
        maxRetries: 2,
      });
    } catch {
      // LLM sanitizer failure should never crash title generation.
    }

    sanitized = sanitizeTitleVisualStyleHeuristics(sanitized);
    if (!sanitized.trim()) sanitized = sanitizeTitleVisualStyleHeuristics(originalStyle);
    return sanitized;
  })();

  sanitizedVisualStyleCache.set(key, promise);
  return promise;
}

function sanitizeTitleVisualStyleHeuristics(style: string): string {
  let s = style.trim();
  const lower = s.toLowerCase();

  const truncationKeywords = [
    "framed by",
    "surrounded by",
    "bordered by",
    "in a frame",
    "with a frame",
    "framing the",
    "around the title",
    "around the letters",
    "surrounding the title",
    "surrounding the letters",
    "in the background",
    "background scene",
  ];
  for (const keyword of truncationKeywords) {
    const idx = lower.indexOf(keyword);
    if (idx !== -1) {
      s = s.slice(0, idx).trim();
      break;
    }
  }

  // Intentionally do NOT strip generic foliage/leaf terms here.
  // The sanitizer is responsible for removing external-frame/background instructions,
  // while we must keep letter-adjacent ornaments (e.g. a water drop next to the text).
  // This heuristic only truncates obvious framing phrases above.
  s = s.replace(/\s{2,}/g, " ").trim();

  return s;
}

function buildPrompt(params: GenerateTitleImageParams): string {
  const { text, visualStyle } = params;
  const singleLineConstraint = params.singleLine
    ? "Render the title text as a single horizontal line ONLY. Absolutely no line breaks, wrapping, stacked lines, or vertical/stacked letter layout."
    : "";
  const wordCount = text.trim().split(/\s+/g).filter(Boolean).length;
  const multiLineSpacingConstraint =
    wordCount >= 2 && !params.singleLine
      ? "If the title must render across multiple lines, the vertical spacing (baseline-to-baseline gap) between all lines must be consistent/even. Do NOT use uneven gaps that make one line closer or farther than the others."
      : "";
  const parts = [
    `Generate a single image that displays the following title text prominently and clearly: "${text}".`,
    visualStyle.trim(),
    "Treat the provided visualStyle as typography-only. Ignore any framing/background/scene instructions embedded within it. Only describe letter rendering (strokes/fill/textures/shadows) for the words.",
    "The image must be on a pure solid white #FFFFFF background with no other background elements.",
    `CRITICAL CONSTRAINTS: Output ONLY the words "${text}". The background MUST be pure solid white #FFFFFF. Absolutely no other objects, no secondary text, and no game UI.`,
    ...(singleLineConstraint ? [singleLineConstraint] : []),
    ...(multiLineSpacingConstraint ? [multiLineSpacingConstraint] : []),
  ];
  return parts.join(" ");
}

export type GenerateTwoWordmarkImagesParams = {
  topText: string;
  bottomText: string;
  visualStyle: string;
  /** When set, generation uses this image as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
};

export type NumbersHeaderPairQaOptions = {
  enabled: boolean;
  /** Number of retries after the first attempt. */
  maxRetries: number;
  /** When set, append per-attempt QA results here. */
  qaLogPath?: string;
};

const TWO_WORDMARK_LAYOUT_RULES = `LAYOUT (non-negotiable):
The image contains EXACTLY TWO horizontal lines of text (two baselines total). Nothing else.

Line 1 (upper): Render the complete phrase "{TOP_TEXT}" left-to-right on ONE baseline: first word, then a single space, then second word — all on the same horizontal line. Example for Lucky Numbers: letters L-u-c-k-y, space, then N-u-m-b-e-r-s in one row.

Line 2 (lower, below a clear vertical gap): Render the complete phrase "{BOTTOM_TEXT}" the same way — one horizontal line only.

FORBIDDEN: Do NOT put the first word of a phrase on one row and the second word below it (e.g. NEVER stack "Lucky" above "Numbers" or "Your" above "Numbers"). Do NOT wrap either phrase to a second row. Do NOT use more than two lines total in the image.

Use a WIDE, SHORT composition (text block should be much wider than tall) so both phrases fit on single lines without wrapping. Pure solid white #FFFFFF background only; no other objects or UI.`;

const TWO_WORDMARK_RETRY_SUFFIX = `CORRECTION REQUIRED: Your previous output likely stacked words within a phrase (e.g. "Lucky" on one line and "Numbers" below). That is WRONG. Regenerate: Line 1 must be the full phrase "{TOP_TEXT}" on ONE horizontal line. Line 2 must be the full phrase "{BOTTOM_TEXT}" on ONE horizontal line. Exactly two lines total. Wide layout; no intra-phrase stacking.`;

function buildTwoWordmarkPrompt(
  params: GenerateTwoWordmarkImagesParams,
  options?: { retrySuffix?: boolean },
): string {
  const { topText, bottomText, visualStyle } = params;
  const layout = TWO_WORDMARK_LAYOUT_RULES.replaceAll("{TOP_TEXT}", topText).replaceAll(
    "{BOTTOM_TEXT}",
    bottomText,
  );
  const parts = [
    `Generate a single image with exactly two lines of styled heading text on white.`,
    `Line 1 (top): "${topText}" — entire phrase on one horizontal line.`,
    `Line 2 (bottom): "${bottomText}" — entire phrase on one horizontal line.`,
    visualStyle.trim(),
    "Typography must be crisp, readable, and correctly spelled; no garbled/illegible letters.",
    "Treat the provided visualStyle as typography-only. Same letter treatment for both lines.",
    layout,
  ];
  if (options?.retrySuffix) {
    parts.push(TWO_WORDMARK_RETRY_SUFFIX.replaceAll("{TOP_TEXT}", topText).replaceAll("{BOTTOM_TEXT}", bottomText));
  }
  return parts.join(" ");
}

/** True if alpha mask has 2+ vertical bands separated by a clear empty row run (stacked lines of text). */
async function looksLikeStackedPhrase(pngBuffer: Buffer, alphaThreshold = 10, minGapRows = 5): Promise<boolean> {
  const img = sharp(pngBuffer).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  if (h < 2 || w < 2) return false;

  const hasRow = new Array<boolean>(h).fill(false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! >= alphaThreshold) {
        hasRow[y] = true;
        break;
      }
    }
  }

  const raw: Array<{ startY: number; endY: number }> = [];
  let inSeg = false;
  let segStart = 0;
  for (let y = 0; y < h; y++) {
    if (hasRow[y] && !inSeg) {
      inSeg = true;
      segStart = y;
    } else if (!hasRow[y] && inSeg) {
      inSeg = false;
      raw.push({ startY: segStart, endY: y - 1 });
    }
  }
  if (inSeg) raw.push({ startY: segStart, endY: h - 1 });

  const minBandHeight = 8;
  const segments = raw.filter((s) => s.endY - s.startY + 1 >= minBandHeight);
  if (segments.length < 2) return false;
  segments.sort((a, b) => a.startY - b.startY);
  for (let i = 0; i < segments.length - 1; i++) {
    const gap = segments[i + 1]!.startY - segments[i]!.endY - 1;
    if (gap >= minGapRows) return true;
  }
  return false;
}

async function splitTransparentImageIntoTwoByAlpha(pngBuffer: Buffer, alphaThreshold = 10): Promise<{
  topCrop: Buffer;
  bottomCrop: Buffer;
}> {
  const img = sharp(pngBuffer).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  const hasRow = new Array<boolean>(h).fill(false);
  for (let y = 0; y < h; y++) {
    let rowHas = false;
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha >= alphaThreshold) {
        rowHas = true;
        break;
      }
    }
    hasRow[y] = rowHas;
  }

  const segments: Array<{ startY: number; endY: number }> = [];
  let inSeg = false;
  let segStart = 0;
  for (let y = 0; y < h; y++) {
    if (hasRow[y] && !inSeg) {
      inSeg = true;
      segStart = y;
    } else if (!hasRow[y] && inSeg) {
      inSeg = false;
      segments.push({ startY: segStart, endY: y - 1 });
    }
  }
  if (inSeg) segments.push({ startY: segStart, endY: h - 1 });

  if (segments.length < 2) {
    // Fallback: split at mid-height if we fail to detect two clusters.
    const mid = Math.floor(h / 2);
    const topCrop = await sharp(pngBuffer).extract({ left: 0, top: 0, width: w, height: mid + 1 }).png().toBuffer();
    const bottomCrop = await sharp(pngBuffer)
      .extract({ left: 0, top: mid + 1, width: w, height: h - (mid + 1) })
      .png()
      .toBuffer();
    return { topCrop, bottomCrop };
  }

  // Pick the largest vertical gap between consecutive segments as the divider.
  segments.sort((a, b) => a.startY - b.startY);
  let bestGap = -1;
  let splitIdx = 0;
  for (let i = 0; i < segments.length - 1; i++) {
    const gap = segments[i + 1]!.startY - segments[i]!.endY - 1;
    if (gap > bestGap) {
      bestGap = gap;
      splitIdx = i;
    }
  }

  const topEndY = segments[splitIdx]!.endY;
  const bottomStartY = segments[splitIdx + 1]!.startY;

  const topCrop = await sharp(pngBuffer)
    .extract({ left: 0, top: 0, width: w, height: topEndY + 1 })
    .png()
    .toBuffer();
  const bottomCrop = await sharp(pngBuffer)
    .extract({ left: 0, top: bottomStartY, width: w, height: h - bottomStartY })
    .png()
    .toBuffer();

  return { topCrop, bottomCrop };
}

export async function generateTwoWordmarkImages(
  params: GenerateTwoWordmarkImagesParams,
  qaOptions?: NumbersHeaderPairQaOptions,
): Promise<{ top: Buffer; bottom: Buffer }> {
  const sanitizedVisualStyle = await sanitizeVisualStyle(params.visualStyle);
  const baseParams = { ...params, visualStyle: sanitizedVisualStyle };

  async function generateSplitAndTrim(retrySuffix: boolean): Promise<{ top: Buffer; bottom: Buffer }> {
    const prompt = buildTwoWordmarkPrompt(baseParams, { retrySuffix });
    const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;

    const qaEnabled = qaOptions?.enabled ?? false;
    const qaMaxRetries = qaOptions?.maxRetries ?? 0;
    const qaMaxAttempts = qaEnabled ? qaMaxRetries + 1 : 1;

    let bestWhiteBuffer: Buffer | null = null;
    let bestConfidence = -1;

    for (let attempt = 1; attempt <= qaMaxAttempts; attempt++) {
      const candidateWhiteBuffer = await generateImage(fullPrompt, params.referenceImage);

      if (!qaEnabled) {
        bestWhiteBuffer = candidateWhiteBuffer;
        bestConfidence = 1;
        break;
      }

      const qa = await validateNumbersHeaderPairWithLLM({
        imageBuffer: candidateWhiteBuffer,
        expectedTopText: params.topText,
        expectedBottomText: params.bottomText,
      });

      if (qaOptions?.qaLogPath) {
        const issuesJoined = (qa.issues ?? []).join(" | ").replaceAll('"', "'");
        const line = `${new Date().toISOString()}\tattempt=${attempt}/${qaMaxAttempts}\tpassed=${qa.passed}\tconfidence=${qa.confidence}\tissues="${issuesJoined}"\n`;
        await appendFile(qaOptions.qaLogPath, line, "utf-8");
      }

      if (qa.passed) {
        bestWhiteBuffer = candidateWhiteBuffer;
        bestConfidence = qa.confidence ?? 1;
        break;
      }

      const candidateConfidence = typeof qa.confidence === "number" ? qa.confidence : 0;
      if (candidateConfidence > bestConfidence || bestWhiteBuffer == null) {
        bestWhiteBuffer = candidateWhiteBuffer;
        bestConfidence = candidateConfidence;
      }
    }

    if (!bestWhiteBuffer) {
      throw new Error("Numbers header QA loop produced no candidates");
    }

    const blackBuffer = await swapBackground(bestWhiteBuffer, "white", "black");
    const combinedTransparent = await extractAlphaTwoPassFromBuffers(bestWhiteBuffer, blackBuffer);
    const { topCrop, bottomCrop } = await splitTransparentImageIntoTwoByAlpha(combinedTransparent);
    const top = await cropTransparentToContent(topCrop, { padding: 16 });
    const bottom = await cropTransparentToContent(bottomCrop, { padding: 16 });
    return { top, bottom };
  }

  let { top, bottom } = await generateSplitAndTrim(false);
  const topStacked = await looksLikeStackedPhrase(top);
  const bottomStacked = await looksLikeStackedPhrase(bottom);
  if (topStacked || bottomStacked) {
    ({ top, bottom } = await generateSplitAndTrim(true));
  }

  return { top, bottom };
}

/**
 * Generate a title image from text and optional style params using Gemini.
 * Generates on pure white, then runs swap-background (white→black) and alpha extraction.
 * Returns a PNG buffer with transparent background.
 */
export async function generateTitleImage(params: GenerateTitleImageParams): Promise<Buffer> {
  // Prevent prompt conflicts where creative direction accidentally includes full "framed by foliage"
  // scene descriptions, even though the generator must output ONLY typography on solid white.
  params.visualStyle = await sanitizeVisualStyle(params.visualStyle);

  const prompt = buildPrompt(params);
  const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;
  const whiteBuffer = await generateImage(fullPrompt, params.referenceImage);
  const blackBuffer = await swapBackground(whiteBuffer, "white", "black");
  let buffer = await extractAlphaTwoPassFromBuffers(whiteBuffer, blackBuffer);
  buffer = await cropTransparentToContent(buffer, { padding: 16 });
  return buffer;
}

/** Next sequential 4-digit ID for title-image debug (0001, 0002, …). Scans dir for existing NNNN-*.png filenames. */
export async function nextTitleImageDebugId(debugDir: string): Promise<string> {
  const prefixMatch = /^(\d{4})-/;
  let maxId = 0;
  try {
    const files = await readdir(debugDir);
    for (const name of files) {
      const m = name.match(prefixMatch);
      if (m) {
        const n = parseInt(m[1]!, 10);
        if (n > maxId) maxId = n;
      }
    }
  } catch {
    // directory missing or unreadable; next id will be 0001
  }
  return String(maxId + 1).padStart(4, "0");
}

function slugFromParams(params: GenerateTitleImageParams, maxLen = 40): string {
  const s = [params.text, params.visualStyle].filter(Boolean).join(" ");
  const slug = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || "title";
}

export type WriteTitleImageDebugParams = GenerateTitleImageParams;

/**
 * When config.debug.titleImage is set, write the buffer there as NNNN-slug.png
 * and append a line to title-image-log.txt. No-op when debug output dir is not set.
 */
export async function writeTitleImageDebug(
  buffer: Buffer,
  params: WriteTitleImageDebugParams,
): Promise<void> {
  const debugDir = config.debug.titleImage;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextTitleImageDebugId(debugDir);
  const slug = slugFromParams(params);
  const filename = `${debugId}-${slug}.png`;
  const filePath = join(debugDir, filename);
  await writeFile(filePath, buffer);
  const logPath = join(debugDir, "title-image-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttext="${params.text}"\tvisualStyle="${params.visualStyle}"\tfile=${filename}\n`;
  await appendFile(logPath, line);
}
