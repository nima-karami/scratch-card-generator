import { exec } from "child_process";
import { promisify } from "util";
import { mkdtemp, readFile, rm, writeFile, mkdir, readdir, copyFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { extractAlphaTwoPass } from "../extractAlpha.js";
import { swapBackground } from "./swap-background.js";
import type { GenerateSpritesheetResult } from "./generate.js";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const execAsync = promisify(exec);

export interface GenerateFromVideoParams {
  videoPath: string;
  cols: number;
  rows: number;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Extracts frames from a video and tiles them into a spritesheet.
 * Then uses Gemini to swap the background from white to black,
 * and extracts the true alpha channel.
 */
export async function generateSpritesheetFromVideo(
  params: GenerateFromVideoParams
): Promise<GenerateSpritesheetResult> {
  const { videoPath, cols, rows, canvasWidth, canvasHeight } = params;
  const totalFrames = cols * rows;

  const workDir = await mkdtemp(join(tmpdir(), `video-spritesheet-${randomUUID()}-`));
  const framesDir = join(workDir, "frames");
  const selectedDir = join(workDir, "selected");
  
  try {
    await mkdir(framesDir);
    await mkdir(selectedDir);

    const whitePath = join(workDir, "white.png");
    const blackPath = join(workDir, "black.png");
    const outputPath = join(workDir, "transparent.png");

    // 1. Extract ALL frames, scale them, pad with white.
    const filters = [
      `scale=${canvasWidth}:${canvasHeight}:force_original_aspect_ratio=decrease`,
      `pad=${canvasWidth}:${canvasHeight}:(ow-iw)/2:(oh-ih)/2:color=white`
    ].join(",");

    const extractCmd = `"${ffmpegInstaller.path}" -y -i "${videoPath}" -vf "${filters}" "${framesDir}/frame_%05d.png"`;
    await execAsync(extractCmd);

    // 2. Read the extracted frames
    const allFrames = await readdir(framesDir);
    allFrames.sort();

    if (allFrames.length === 0) {
      throw new Error("No frames extracted from video");
    }

    // 3. Select exactly totalFrames, ensuring first and last are always the real first/last frame
    const selectedFrames: string[] = [];
    if (allFrames.length <= totalFrames) {
      // If the video has fewer frames than the grid, pad with the last frame
      selectedFrames.push(...allFrames);
      while (selectedFrames.length < totalFrames) {
        selectedFrames.push(allFrames[allFrames.length - 1]!);
      }
    } else {
      for (let i = 0; i < totalFrames; i++) {
        const index =
          i === 0
            ? 0
            : i === totalFrames - 1
              ? allFrames.length - 1
              : Math.round((i * (allFrames.length - 1)) / (totalFrames - 1));
        selectedFrames.push(allFrames[index]!);
      }
    }

    // 4. Copy selected frames to a new directory for tiling sequentially
    for (let i = 0; i < selectedFrames.length; i++) {
      const src = join(framesDir, selectedFrames[i]!);
      const destName = `tile_${String(i).padStart(3, "0")}.png`;
      const dest = join(selectedDir, destName);
      await copyFile(src, dest);
    }

    // 5. Tile the selected frames into the final spritesheet grid
    const tileCmd = `"${ffmpegInstaller.path}" -y -i "${selectedDir}/tile_%03d.png" -vf "tile=${cols}x${rows}" "${whitePath}"`;
    await execAsync(tileCmd);

    // Read the white background spritesheet
    const whiteBg = await readFile(whitePath);

    // 6. Swap background to black via Gemini
    const blackBg = await swapBackground(whiteBg, "white", "black");
    await writeFile(blackPath, blackBg);

    // 7. Extract alpha from white + black to produce transparent PNG
    await extractAlphaTwoPass(whitePath, blackPath, outputPath);
    const transparent = await readFile(outputPath);

    return { whiteBg, blackBg, transparent };
  } catch (error) {
    throw new Error(`Failed to generate spritesheet from video: ${error}`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
