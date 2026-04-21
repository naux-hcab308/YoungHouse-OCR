import { NextRequest } from "next/server";
import { extractCccdWithFpt } from "@/app/lib/fptOcr";
import { normalizeWithAi } from "@/app/lib/normalizeWithAi";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Image prep ─────────────────────────────────────────────────────────────
// Prepare image for OCR: fix orientation and optimize size
async function prepareImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const front    = formData.get("imageFront") as File | null;
  const back     = formData.get("imageBack")  as File | null;
  const cardType = formData.get("cardType");

  if (!front || !back) {
    return Response.json(
      { error: "Vui lòng chọn đủ ảnh mặt trước và mặt sau CCCD." },
      { status: 400 }
    );
  }
  if (!front.type.startsWith("image/") || !back.type.startsWith("image/")) {
    return Response.json(
      { error: "File không hợp lệ. Vui lòng upload ảnh (JPEG/PNG/WEBP)." },
      { status: 400 }
    );
  }
  if (cardType !== "old" && cardType !== "new") {
    return Response.json({ error: "Loại CCCD không hợp lệ." }, { status: 400 });
  }

  try {
    const [frontBuffer, backBuffer] = await Promise.all([
      front.arrayBuffer().then((ab) => prepareImage(Buffer.from(ab))),
      back.arrayBuffer().then((ab) => prepareImage(Buffer.from(ab))),
    ]);

    // Use FPT.AI IDR for CCCD extraction
    const { parsed, rawTextFront, rawTextBack } = await extractCccdWithFpt(
      frontBuffer,
      backBuffer
    );

    // Normalize with AI for additional corrections
    const normalized = await normalizeWithAi(parsed, rawTextFront, rawTextBack);

    return Response.json({ rawTextFront, rawTextBack, parsed: normalized });
  } catch (err) {
    console.error("[OCR] error:", err);
    return Response.json(
      { error: "Không thể xử lý ảnh. Vui lòng thử lại với ảnh rõ hơn." },
      { status: 500 }
    );
  }
}
