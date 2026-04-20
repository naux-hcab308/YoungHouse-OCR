import { NextRequest } from "next/server";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { parseCccdFromSides } from "@/app/lib/parseCard";
import { normalizeWithAi } from "@/app/lib/normalizeWithAi";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── AWS Textract client ────────────────────────────────────────────────────
const textract = new TextractClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ── Image prep ─────────────────────────────────────────────────────────────
// Textract handles denoising internally — just fix orientation and cap size.
async function prepareForTextract(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// ── Textract OCR ───────────────────────────────────────────────────────────
async function runTextract(imageBuffer: Buffer): Promise<string> {
  const command = new DetectDocumentTextCommand({
    Document: { Bytes: imageBuffer },
  });

  const response = await textract.send(command);

  return (response.Blocks ?? [])
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .map((b) => b.Text as string)
    .join("\n");
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
      front.arrayBuffer().then((ab) => prepareForTextract(Buffer.from(ab))),
      back.arrayBuffer().then((ab)  => prepareForTextract(Buffer.from(ab))),
    ]);

    const [frontText, backText] = await Promise.all([
      runTextract(frontBuffer),
      runTextract(backBuffer),
    ]);

    const parsed  = parseCccdFromSides(frontText, backText, cardType);
    const normalized = await normalizeWithAi(parsed, frontText, backText);

    return Response.json({ rawTextFront: frontText, rawTextBack: backText, parsed: normalized });
  } catch (err) {
    console.error("[Textract] error:", err);
    return Response.json(
      { error: "Không thể xử lý ảnh. Vui lòng thử lại với ảnh rõ hơn." },
      { status: 500 }
    );
  }
}
