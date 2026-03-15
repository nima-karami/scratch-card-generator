import type { Request, Response } from "express";
import { config } from "../config.js";
import {
  generateContainerImage,
  writeContainerImageDebug,
  type GenerateContainerImageParams,
  type ContainerImageType,
} from "../lib/container-image.js";

const VALID_TYPES: ContainerImageType[] = ["solid", "gradient", "pattern"];
const VALID_PATTERNS = ["dots", "lines", "grid"];

export async function postContainerImage(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const type = body.type as string | undefined;
  if (!type || !VALID_TYPES.includes(type as ContainerImageType)) {
    res.status(400).json({
      error: "Invalid or missing type",
      expected: "solid | gradient | pattern",
    });
    return;
  }

  const pattern = body.pattern as string | undefined;
  if (pattern && type === "pattern" && !VALID_PATTERNS.includes(pattern)) {
    res.status(400).json({
      error: "Invalid pattern",
      expected: "dots | lines | grid",
    });
    return;
  }

  const params: GenerateContainerImageParams = {
    type: type as ContainerImageType,
    width: typeof body.width === "number" ? body.width : undefined,
    height: typeof body.height === "number" ? body.height : undefined,
    color: typeof body.color === "string" ? body.color : undefined,
    colorEnd: typeof body.colorEnd === "string" ? body.colorEnd : undefined,
    angle: typeof body.angle === "number" ? body.angle : undefined,
    pattern: pattern as GenerateContainerImageParams["pattern"],
    patternScale: typeof body.patternScale === "number" ? body.patternScale : undefined,
    visualStyle:
      typeof body.visualStyle === "string"
        ? body.visualStyle
        : typeof (body as { visual_style?: string }).visual_style === "string"
          ? (body as { visual_style: string }).visual_style
          : undefined,
  };

  try {
    const buffer = await generateContainerImage(params);

    if (config.debug.containerImage) {
      await writeContainerImageDebug(buffer, params);
    }

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Container image generation failed";
    res.status(500).json({ error: "Generation failed", message });
  }
}
