import sharp from "sharp";

/**
 * Extracts alpha channel from two identical images: one on white background,
 * one on black background. Uses difference matting to derive transparency.
 *
 * @see https://jidefr.medium.com/generating-transparent-background-images-with-nano-banana-pro-2-1866c88a33c5
 */
export async function extractAlphaTwoPass(
  imgOnWhitePath: string,
  imgOnBlackPath: string,
  outputPath: string,
): Promise<void> {
  const img1 = sharp(imgOnWhitePath);
  const img2 = sharp(imgOnBlackPath);

  const { data: dataWhite, info: metaWhite } = await img1
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: dataBlack } = await img2
    .resize(metaWhite.width, metaWhite.height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (dataWhite.length !== dataBlack.length) {
    throw new Error("Dimension mismatch: Images must be identical size");
  }

  const outputBuffer = Buffer.alloc(dataWhite.length);
  const bgDist = Math.sqrt(3 * 255 * 255);
  /** Pixels on white background above this are treated as empty (fully transparent) to avoid artifacts. */
  const nearWhiteThreshold = 240;
  /** Pixels on black background below this are treated as empty (fully transparent) when white side is also background. */
  const nearBlackThreshold = 15;
  /** Alpha below this is clamped to 0 to eliminate dust/noise artifacts. */
  const alphaFloor = 0.05;

  for (let i = 0; i < metaWhite.width * metaWhite.height; i++) {
    const offset = i * 4;

    const rW = dataWhite[offset];
    const gW = dataWhite[offset + 1];
    const bW = dataWhite[offset + 2];

    const rB = dataBlack[offset];
    const gB = dataBlack[offset + 1];
    const bB = dataBlack[offset + 2];

    const isNearWhite =
      rW >= nearWhiteThreshold && gW >= nearWhiteThreshold && bW >= nearWhiteThreshold;
    const isNearBlack =
      rB <= nearBlackThreshold && gB <= nearBlackThreshold && bB <= nearBlackThreshold;

    const pixelDist = Math.sqrt(Math.pow(rW - rB, 2) + Math.pow(gW - gB, 2) + Math.pow(bW - bB, 2));

    let alpha = 1 - pixelDist / bgDist;
    alpha = Math.max(0, Math.min(1, alpha));
    if (isNearWhite) alpha = 0;
    if (isNearWhite && isNearBlack) alpha = 0;
    if (alpha < alphaFloor) alpha = 0;

    let rOut = 0,
      gOut = 0,
      bOut = 0;
    if (alpha > alphaFloor) {
      rOut = rB / alpha;
      gOut = gB / alpha;
      bOut = bB / alpha;
    }

    outputBuffer[offset] = Math.round(Math.min(255, rOut));
    outputBuffer[offset + 1] = Math.round(Math.min(255, gOut));
    outputBuffer[offset + 2] = Math.round(Math.min(255, bOut));
    outputBuffer[offset + 3] = Math.round(alpha * 255);
  }

  await sharp(outputBuffer, {
    raw: { width: metaWhite.width, height: metaWhite.height, channels: 4 },
  })
    .png()
    .toFile(outputPath);
}

/**
 * Same as extractAlphaTwoPass but accepts in-memory buffers and returns the transparent PNG buffer.
 * Used by title-image generation so it can run the white→black→transparent flow without temp files.
 */
export async function extractAlphaTwoPassFromBuffers(
  imgOnWhiteBuffer: Buffer,
  imgOnBlackBuffer: Buffer,
): Promise<Buffer> {
  const img1 = sharp(imgOnWhiteBuffer);
  const img2 = sharp(imgOnBlackBuffer);

  const { data: dataWhite, info: metaWhite } = await img1
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: dataBlack } = await img2
    .resize(metaWhite.width, metaWhite.height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (dataWhite.length !== dataBlack.length) {
    throw new Error("Dimension mismatch: Images must be identical size");
  }

  const outputBuffer = Buffer.alloc(dataWhite.length);
  const bgDist = Math.sqrt(3 * 255 * 255);
  const nearWhiteThreshold = 240;
  const nearBlackThreshold = 15;
  const alphaFloor = 0.05;

  for (let i = 0; i < metaWhite.width * metaWhite.height; i++) {
    const offset = i * 4;

    const rW = dataWhite[offset];
    const gW = dataWhite[offset + 1];
    const bW = dataWhite[offset + 2];

    const rB = dataBlack[offset];
    const gB = dataBlack[offset + 1];
    const bB = dataBlack[offset + 2];

    const isNearWhite =
      rW >= nearWhiteThreshold && gW >= nearWhiteThreshold && bW >= nearWhiteThreshold;
    const isNearBlack =
      rB <= nearBlackThreshold && gB <= nearBlackThreshold && bB <= nearBlackThreshold;

    const pixelDist = Math.sqrt(Math.pow(rW - rB, 2) + Math.pow(gW - gB, 2) + Math.pow(bW - bB, 2));

    let alpha = 1 - pixelDist / bgDist;
    alpha = Math.max(0, Math.min(1, alpha));
    if (isNearWhite) alpha = 0;
    if (isNearWhite && isNearBlack) alpha = 0;
    if (alpha < alphaFloor) alpha = 0;

    let rOut = 0,
      gOut = 0,
      bOut = 0;
    if (alpha > alphaFloor) {
      rOut = rB / alpha;
      gOut = gB / alpha;
      bOut = bB / alpha;
    }

    outputBuffer[offset] = Math.round(Math.min(255, rOut));
    outputBuffer[offset + 1] = Math.round(Math.min(255, gOut));
    outputBuffer[offset + 2] = Math.round(Math.min(255, bOut));
    outputBuffer[offset + 3] = Math.round(alpha * 255);
  }

  return sharp(outputBuffer, {
    raw: { width: metaWhite.width, height: metaWhite.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
