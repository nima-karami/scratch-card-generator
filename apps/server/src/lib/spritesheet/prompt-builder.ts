/**
 * Builds a detailed spritesheet generation prompt from structured parameters.
 * No AI involved — deterministic template interpolation.
 */

export interface SpritesheetPromptParams {
  canvasWidth: number;
  canvasHeight: number;
  cols: number;
  rows: number;
  subject: string;
  animationAction: string;
  keyframes: { frame: number; description: string }[];
  visualStyle: string;
  backgroundColor: "white" | "black";
}

function getOrientation(width: number, height: number): string {
  if (width > height) return "landscape";
  if (height > width) return "portrait";
  return "square";
}

export function buildSpritesheetPrompt(params: SpritesheetPromptParams): string {
  const {
    canvasWidth,
    canvasHeight,
    cols,
    rows,
    subject,
    animationAction,
    keyframes,
    visualStyle,
    backgroundColor,
  } = params;

  const totalFrames = cols * rows;
  const cellWidth = Math.round(canvasWidth / cols);
  const cellHeight = Math.round(canvasHeight / rows);
  const orientation = getOrientation(canvasWidth, canvasHeight);
  const bgHex = backgroundColor === "white" ? "#FFFFFF" : "#000000";
  const bgName = backgroundColor === "white" ? "white" : "black";

  const rowsClarification =
    orientation === "landscape"
      ? `NOT ${rows + 1} rows — exactly ${rows} rows.`
      : "";

  const keyframesBlock = keyframes
    .map((kf) => `- Frame ${kf.frame}: ${kf.description}`)
    .join("\n");

  const sections: string[] = [];

  // 1. Canvas and grid specification
  sections.push(`Generate a sprite sheet image on a pure solid ${bgName} ${bgHex} background. The sheet must be exactly ${canvasWidth}x${canvasHeight} pixels — that is ${canvasWidth} wide and ${canvasHeight} tall. This is a ${orientation}-oriented rectangle${orientation === "square" ? "" : ", NOT a square"}. The sheet contains exactly ${totalFrames} frames arranged in ${cols} columns and ${rows} rows. ${rowsClarification}Each frame occupies exactly ${cellWidth}x${cellHeight} pixels. ${cols} columns × ${cellWidth}px = ${canvasWidth}px wide. ${rows} rows × ${cellHeight}px = ${canvasHeight}px tall. No extra frames, no extra rows.`);

  // 2. Layout rules (no borders, no gridlines)
  sections.push(`There must be NO grid lines, NO borders, NO dividers, NO outlines between frames. The frames sit directly adjacent to each other on the shared ${bgName} background with nothing separating them. The background is continuous uninterrupted ${bgName} across the entire ${canvasWidth}x${canvasHeight} canvas.`);

  // 3. Subject and animation description
  const readingOrder =
    "reading left-to-right, top-to-bottom (frame 1 = top-left, frame " +
    totalFrames +
    " = bottom-right)";
  sections.push(`The sprite sheet depicts a ${subject} ${animationAction} animation sequence ${readingOrder}. There are exactly ${totalFrames} frames total — ${cols} on the first row, ${cols} on the second row${rows > 2 ? `, ${cols} on the third row` : ""}${rows > 3 ? `, ${cols} on the fourth row` : ""}. No extra row exists.`);

  sections.push(`ANIMATION KEYFRAMES:\n${keyframesBlock}`);

  sections.push(
    `PACING RULE: The amount of visible change between ANY two consecutive frames must be roughly equal. No two adjacent frames should look nearly identical, and no two adjacent frames should show a dramatic jump. Each frame advances the ${animationAction} by approximately the same amount.`
  );

  // 4. Visual style block
  sections.push(`VISUAL STYLE:\n${visualStyle}`);

  // 5. Critical constraints recap
  sections.push(`CRITICAL CONSTRAINTS:
- Exact canvas: ${canvasWidth} pixels wide × ${canvasHeight} pixels tall (${orientation}, NOT square)
- Exact cell size: ${cellWidth}x${cellHeight}px
- Grid: ${cols} columns × ${rows} rows = ${totalFrames} frames total. ${rows} row${rows > 1 ? "s" : ""} only.
- Each frame's content centered within its ${cellWidth}x${cellHeight} cell
- Pure solid ${bgName} ${bgHex} background everywhere
- NO grid lines, NO borders, NO separators, NO dividers between frames
- Consistent art style and color palette across all ${totalFrames} frames
- No text, labels, or annotations
- Every frame must show visible change from the previous frame
- Every frame must contain SOME visible content
- Even pacing: equal amount of change between every pair of consecutive frames`);

  return sections.join("\n\n");
}

/** Parameters for particle spritesheet: grid of N static variants (no animation timeline). */
export interface ParticleSpritesheetPromptParams {
  canvasWidth: number;
  canvasHeight: number;
  cols: number;
  rows: number;
  /** Subject for each cell (e.g. "small cookie crumb", "coin"). */
  subject: string;
  visualStyle: string;
  backgroundColor: "white" | "black";
}

/**
 * Builds a prompt for a spritesheet where each cell is a different static variant of the subject
 * (for use as confetti/particle sprites). No animation; cells are independent.
 */
export function buildParticleSpritesheetPrompt(
  params: ParticleSpritesheetPromptParams
): string {
  const {
    canvasWidth,
    canvasHeight,
    cols,
    rows,
    subject,
    visualStyle,
    backgroundColor,
  } = params;

  const totalCells = cols * rows;
  const cellWidth = Math.round(canvasWidth / cols);
  const cellHeight = Math.round(canvasHeight / rows);
  const orientation =
    canvasWidth > canvasHeight ? "landscape" : canvasHeight > canvasWidth ? "portrait" : "square";
  const bgHex = backgroundColor === "white" ? "#FFFFFF" : "#000000";
  const bgName = backgroundColor === "white" ? "white" : "black";

  const sections: string[] = [];

  sections.push(
    `Generate a single image that is a grid on a pure solid ${bgName} ${bgHex} background. The image must be exactly ${canvasWidth}x${canvasHeight} pixels (${canvasWidth} wide × ${canvasHeight} tall). This is a ${orientation} rectangle. The grid has exactly ${totalCells} cells in ${cols} columns and ${rows} rows. Each cell is exactly ${cellWidth}x${cellHeight} pixels. No extra rows or columns.`
  );

  sections.push(
    `There must be NO grid lines, NO borders, NO dividers between cells. Cells sit directly adjacent on the shared ${bgName} background.`
  );

  sections.push(
    `CONTENT: Each cell contains a DIFFERENT static variant of: ${subject}. Reading order is left-to-right, top-to-bottom (cell 1 = top-left, cell ${totalCells} = bottom-right). Each cell must show a distinct variant — different shape, size, or orientation — so there is visible variety across the grid. Same subject and same visual style in every cell; no animation, no sequence. Every cell must contain clear visible content.`
  );

  sections.push(`VISUAL STYLE:\n${visualStyle}`);

  sections.push(`CRITICAL CONSTRAINTS:
- Exact canvas: ${canvasWidth}px × ${canvasHeight}px
- Exact cell size: ${cellWidth}x${cellHeight}px
- Grid: ${cols} columns × ${rows} rows = ${totalCells} cells
- Each cell: one static variant of ${subject}, centered in its cell
- Pure solid ${bgName} ${bgHex} background
- NO grid lines, NO borders, NO separators
- Consistent art style across all cells
- No text, labels, or annotations
- Variety: no two cells should look identical`);
  return sections.join("\n\n");
}
