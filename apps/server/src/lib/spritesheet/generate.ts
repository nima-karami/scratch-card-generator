import { mkdtemp, readFile, rm, writeFile, mkdir, appendFile, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

/** Next sequential 4-digit ID for qa-debug (0001, 0002, …). Scans dir for existing NNNN-* filenames. */
async function nextSequentialDebugId(debugDir: string): Promise<string> {
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
import { extractAlphaTwoPass } from "../extractAlpha.js";
import { generateImage, editImage } from "../gemini.js";
import { swapBackground } from "./swap-background.js";
import { buildSpritesheetPrompt, buildParticleSpritesheetPrompt } from "./prompt-builder.js";
import type {
  SpritesheetPromptParams,
  ParticleSpritesheetPromptParams,
} from "./prompt-builder.js";
import { config } from "../../config/index.js";
import type { SSEEvent } from "@repo/shared";
import { validateAlgorithmically, validateWithLLM, type QAResult } from "./qa.js";
import { buildDetailedEditInstruction } from "./build-edit-instruction.js";

const REFERENCE_IMAGE_PREFIX =
  "The attached image is a tagged moodboard with sections: Graphic Style, Typography, Color Palette, Background Style. For this task use ONLY the GRAPHIC STYLE section as your style reference (the sample object/icon). Ignore the other sections. Match that section's visual style, colors, lighting, and artistic treatment for the subject you are drawing. Output only the requested new image content, not an edit of the reference.\n\n";

function buildEditInstructionFromQA(reason: string, params: SpritesheetPromptParams): string {
  return `This image is a spritesheet (${params.cols}x${params.rows}) of: ${params.subject} ${params.animationAction}. It failed QA.

Fix the following issues while keeping the same subject, art style, grid layout, and white background:
${reason}

Return only the corrected spritesheet image; do not change size or frame count.`;
}

export interface GenerateSpritesheetResult {
  whiteBg: Buffer;
  blackBg: Buffer;
  transparent: Buffer;
}

/**
 * Orchestrates the full spritesheet generation pipeline:
 * 1. Build prompt and generate image on white background
 * 2. Swap background to black via Gemini edit
 * 3. Extract alpha from white + black to produce transparent PNG
 */
export async function generateSpritesheet(
  params: SpritesheetPromptParams,
  onProgress?: (event: SSEEvent) => void
): Promise<GenerateSpritesheetResult> {
  const prompt = buildSpritesheetPrompt({ ...params, backgroundColor: "white" });
  
  const { canvasWidth, canvasHeight } = params;
  const aspect = canvasWidth > canvasHeight ? "16:9" : canvasHeight > canvasWidth ? "9:16" : "1:1";

  let whiteBg: Buffer | null = null;
  let attempts = 0;
  const maxRetries = config.spritesheet.qa.maxRetries;
  const totalAttempts = maxRetries + 1;
  const debugDir = config.debug.spritesheetQa;
  const debugSubjectSlug = debugDir
    ? params.subject.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    : null;
  const debugId = debugDir ? await nextSequentialDebugId(debugDir) : null;

  if (debugDir) {
    await mkdir(debugDir, { recursive: true });
    const logPath = join(debugDir, `${debugId}-${debugSubjectSlug}-log.txt`);
    await writeFile(
      logPath,
      `QA debug log — ${params.subject} ${params.animationAction} (${params.cols}x${params.rows})\n${"=".repeat(60)}\n`
    );
    console.log(`QA debug output: ${debugDir} (${debugId}-${debugSubjectSlug}-*)`);
  }

  let lastFailureReason: string | undefined;
  let lastFailureIssues: string[] | undefined;
  /** Ready-to-use edit instruction from QA (same-context); use when present instead of building from issues. */
  let lastFailureEditInstructions: string | undefined;
  /** Each attempt's image and accuracy score; when all fail we pick the one with highest score. */
  const attemptsWithScores: { whiteBg: Buffer; score: number; attemptNumber: number }[] = [];
  let passedQA = false;

  while (attempts <= maxRetries) {
    attempts++;
    if (attempts === 1) {
      console.log(`Generation attempt ${attempts} of ${maxRetries + 1}...`);
      onProgress?.({
        type: "generating-spritesheet",
        message: `Spritesheet QA: attempt ${attempts}/${totalAttempts} (generating)`,
      });
      const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;
      whiteBg = await generateImage(fullPrompt, params.referenceImage, aspect);
    } else {
      console.log(`Edit attempt ${attempts} of ${maxRetries + 1} (fixing from QA feedback)...`);
      onProgress?.({
        type: "generating-spritesheet",
        message: `Spritesheet QA: attempt ${attempts}/${totalAttempts} (editing from QA feedback)`,
      });
      let instruction: string;
      if (lastFailureEditInstructions?.trim()) {
        instruction = lastFailureEditInstructions.trim();
      } else if ((lastFailureIssues?.length ?? 0) > 0) {
        instruction = await buildDetailedEditInstruction(lastFailureIssues!, params);
      } else {
        instruction = buildEditInstructionFromQA(lastFailureReason ?? "Unknown QA failure", params);
      }
      whiteBg = await editImage(whiteBg!, instruction, aspect);
    }

    let qaPassed = true;
    let algoResult: QAResult | null = null;
    let llmResult: QAResult | null = null;

    if (config.spritesheet.qa.algorithmicEnabled) {
      console.log("Running algorithmic QA...");
      onProgress?.({
        type: "generating-spritesheet",
        message: `Spritesheet QA: attempt ${attempts}/${totalAttempts} (Algorithmic QA)`,
      });
      algoResult = await validateAlgorithmically(whiteBg!, params);
      if (!algoResult.passed) {
        console.warn(`Algorithmic QA failed: ${algoResult.reason}`);
        onProgress?.({
          type: "generating-spritesheet",
          message: `Algorithmic QA failed (attempt ${attempts}/${totalAttempts}) — retrying/editing`,
        });
        lastFailureReason = algoResult.reason;
        lastFailureIssues = undefined;
        lastFailureEditInstructions = undefined;
        qaPassed = false;
      } else {
        console.log("Algorithmic QA passed.");
      }
    }

    if (qaPassed && config.spritesheet.qa.llmEnabled) {
      console.log("Running LLM QA...");
      onProgress?.({
        type: "generating-spritesheet",
        message: `Spritesheet QA: attempt ${attempts}/${totalAttempts} (LLM QA)`,
      });
      llmResult = await validateWithLLM(whiteBg!, params);
      if (!llmResult.passed) {
        console.warn(`LLM QA failed: ${llmResult.reason}`);
        onProgress?.({
          type: "generating-spritesheet",
          message: `LLM QA failed (attempt ${attempts}/${totalAttempts}) — retrying/editing`,
        });
        lastFailureReason = llmResult.reason;
        lastFailureIssues = llmResult.issues;
        lastFailureEditInstructions = llmResult.editInstructions;
        qaPassed = false;
      } else {
        console.log("LLM QA passed.");
      }
    }

    const attemptScore = llmResult?.confidence ?? 0;
    attemptsWithScores.push({ whiteBg: whiteBg!, score: attemptScore, attemptNumber: attempts });

    if (debugDir && debugId && debugSubjectSlug) {
      await writeFile(
        join(debugDir, `${debugId}-${debugSubjectSlug}-base-${attempts}.png`),
        whiteBg!
      );
      const kind = attempts === 1 ? "generated" : "edited (from QA feedback)";

      let algoLine: string;
      if (algoResult === null) {
        algoLine = "Algorithmic: skipped";
      } else if (algoResult.passed) {
        algoLine = "Algorithmic: passed";
      } else {
        algoLine = `Algorithmic: failed — ${algoResult.reason ?? "—"}`;
      }

      let llmLine: string;
      if (llmResult === null) {
        llmLine = "LLM: skipped";
      } else if (llmResult.passed) {
        llmLine = "LLM: passed";
      } else {
        llmLine = `LLM: failed — ${llmResult.reason ?? "—"}`;
      }

      let logBlock = `\nAttempt ${attempts} (${kind})\n  ${algoLine}\n  ${llmLine}\n  Accuracy score: ${attemptScore.toFixed(2)}\n`;

      if (!qaPassed) {
        let editInstruction: string;
        if (lastFailureEditInstructions?.trim()) {
          editInstruction = lastFailureEditInstructions.trim();
        } else if ((lastFailureIssues?.length ?? 0) > 0) {
          editInstruction = await buildDetailedEditInstruction(lastFailureIssues!, params);
        } else {
          editInstruction = buildEditInstructionFromQA(lastFailureReason ?? "Unknown QA failure", params);
        }
        const indented = editInstruction
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n");
        logBlock += `  Edit instruction for next attempt:\n${indented}\n`;
      }

      await appendFile(
        join(debugDir, `${debugId}-${debugSubjectSlug}-log.txt`),
        logBlock
      );
    }

    if (qaPassed) {
      passedQA = true;
      onProgress?.({
        type: "generating-spritesheet",
        message: `Spritesheet QA passed (attempt ${attempts}/${totalAttempts})`,
      });
      break;
    } else if (attempts > maxRetries) {
      console.warn("Max retries reached. Selecting attempt with highest accuracy.");
      onProgress?.({
        type: "generating-spritesheet",
        message: `Spritesheet QA: max retries hit — selecting best attempt`,
      });
    }
  }

  if (!passedQA && attemptsWithScores.length > 0) {
    const best = attemptsWithScores.reduce((a, b) => (b.score > a.score ? b : a));
    whiteBg = best.whiteBg;
    console.log(
      `Selected attempt ${best.attemptNumber} (accuracy score: ${best.score.toFixed(2)})`
    );
    onProgress?.({
      type: "generating-spritesheet",
      message: `Spritesheet QA: selected attempt ${best.attemptNumber} (${best.score.toFixed(2)} score)`,
    });
  }

  if (!whiteBg) {
    throw new Error("Failed to generate spritesheet.");
  }

  const blackBg = await swapBackground(whiteBg, "white", "black", aspect);

  const workDir = await mkdtemp(join(tmpdir(), `spritesheet-${randomUUID()}-`));
  const whitePath = join(workDir, "white.png");
  const blackPath = join(workDir, "black.png");
  const outputPath = join(workDir, "transparent.png");

  try {
    await writeFile(whitePath, whiteBg);
    await writeFile(blackPath, blackBg);
    onProgress?.({
      type: "generating-spritesheet",
      message: `Spritesheet QA: extracting transparency (alpha)`,
    });
    await extractAlphaTwoPass(whitePath, blackPath, outputPath);
    const transparent = await readFile(outputPath);

    if (debugDir && debugId && debugSubjectSlug) {
      await writeFile(
        join(debugDir, `${debugId}-${debugSubjectSlug}-black.png`),
        blackBg
      );
      await writeFile(
        join(debugDir, `${debugId}-${debugSubjectSlug}-final.png`),
        transparent
      );
    }

    return { whiteBg, blackBg, transparent };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Generates a particle spritesheet (grid of N static variants for confetti/particles).
 * Same pipeline as animation spritesheet but with a different prompt and no QA loop.
 */
export async function generateParticleSpritesheet(
  params: ParticleSpritesheetPromptParams
): Promise<GenerateSpritesheetResult> {
    const { canvasWidth, canvasHeight } = params;
    const aspect = canvasWidth > canvasHeight ? "16:9" : canvasHeight > canvasWidth ? "9:16" : "1:1";
  const prompt = buildParticleSpritesheetPrompt({
    ...params,
    backgroundColor: "white",
  });
  const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;
  const whiteBg = await generateImage(fullPrompt, params.referenceImage, aspect);
  const blackBg = await swapBackground(whiteBg, "white", "black", aspect);
  const workDir = await mkdtemp(join(tmpdir(), `particle-sheet-${randomUUID()}-`));
  const whitePath = join(workDir, "white.png");
  const blackPath = join(workDir, "black.png");
  const outputPath = join(workDir, "transparent.png");
  try {
    await writeFile(whitePath, whiteBg);
    await writeFile(blackPath, blackBg);
    await extractAlphaTwoPass(whitePath, blackPath, outputPath);
    const transparent = await readFile(outputPath);
    return { whiteBg, blackBg, transparent };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
