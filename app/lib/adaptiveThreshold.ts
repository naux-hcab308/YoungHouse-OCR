import sharp from "sharp";

/**
 * Adaptive thresholding via summed-area (integral image) table.
 *
 * Equivalent to OpenCV:
 *   adaptiveThreshold(src, dst, 255,
 *     ADAPTIVE_THRESH_MEAN_C, THRESH_BINARY, blockSize, C)
 *
 * Complexity: O(W*H) — suitable for multi-megapixel images.
 *
 * @param buffer  Grayscale PNG/JPEG buffer (output of sharp pipeline)
 * @param blockSize  Neighbourhood size (odd number, e.g. 31 for 2 000 px images)
 * @param C  Constant subtracted from the mean (higher → more aggressive binarisation)
 */
export async function adaptiveThreshold(
  buffer: Buffer,
  blockSize = 31,
  C = 8
): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const W1 = width + 1;

  // ── Build integral image (64-bit to avoid overflow on large blocks) ──────
  const integral = new Float64Array(W1 * (height + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      integral[(y + 1) * W1 + (x + 1)] =
        data[y * width + x] +
        integral[y * W1 + (x + 1)] +
        integral[(y + 1) * W1 + x] -
        integral[y * W1 + x];
    }
  }

  // ── Apply threshold using integral image for O(1) mean lookup ───────────
  const half = Math.floor(blockSize / 2);
  const output = Buffer.alloc(width * height);

  for (let y = 0; y < height; y++) {
    const r1 = Math.max(0, y - half);
    const r2 = Math.min(height - 1, y + half);

    for (let x = 0; x < width; x++) {
      const c1 = Math.max(0, x - half);
      const c2 = Math.min(width - 1, x + half);

      const area = (r2 - r1 + 1) * (c2 - c1 + 1);
      const sum =
        integral[(r2 + 1) * W1 + (c2 + 1)] -
        integral[r1 * W1 + (c2 + 1)] -
        integral[(r2 + 1) * W1 + c1] +
        integral[r1 * W1 + c1];

      const mean = sum / area;
      output[y * width + x] = data[y * width + x] >= mean - C ? 255 : 0;
    }
  }

  return sharp(output, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}
