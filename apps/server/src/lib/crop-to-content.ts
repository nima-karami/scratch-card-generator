import sharp from "sharp";

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

export type CropTransparentToContentOptions = {
  /** Pixels of padding added on each side after trimming. Default 16. */
  padding?: number;
  /** Alpha value (0–255) above which a pixel is considered content. Default 10. */
  alphaThreshold?: number;
};

/**
 * Crops a transparent-background PNG to the bounding box of non-transparent
 * content, then adds padding on all sides. Returns a PNG buffer.
 *
 * Uses sharp's trim() when possible; falls back to manual bounding-box scan
 * if trim fails or returns an empty image.
 */
export async function cropTransparentToContent(
  pngBuffer: Buffer,
  options: CropTransparentToContentOptions = {},
): Promise<Buffer> {
  const padding = Math.max(0, options.padding ?? 16);
  const alphaThreshold = Math.max(0, Math.min(255, options.alphaThreshold ?? 10));

  const trimmed = await trimTransparent(pngBuffer, alphaThreshold);
  if (trimmed.width === 0 || trimmed.height === 0) {
    return pngBuffer;
  }

  return sharp(trimmed.buffer)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();
}

async function trimTransparent(
  pngBuffer: Buffer,
  alphaThreshold: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const img = sharp(pngBuffer);

  try {
    const result = await img
      .clone()
      .trim({
        background: TRANSPARENT,
        threshold: alphaThreshold,
      })
      .toBuffer({ resolveWithObject: true });

    if (result.info.width > 0 && result.info.height > 0) {
      return {
        buffer: result.data,
        width: result.info.width,
        height: result.info.height,
      };
    }
  } catch {
    // trim() can misbehave on some transparent images; fall through to manual bbox
  }

  return trimTransparentManual(pngBuffer, alphaThreshold);
}

async function trimTransparentManual(
  pngBuffer: Buffer,
  alphaThreshold: number,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const img = sharp(pngBuffer);
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha >= alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return { buffer: pngBuffer, width: w, height: h };
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  const cropped = await sharp(pngBuffer)
    .extract({ left: minX, top: minY, width, height })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: await sharp(cropped.data, {
      raw: { width: cropped.info.width, height: cropped.info.height, channels: 4 },
    })
      .png()
      .toBuffer(),
    width: cropped.info.width,
    height: cropped.info.height,
  };
}
