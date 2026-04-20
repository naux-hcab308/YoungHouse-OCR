import { NextRequest } from "next/server";
import { parseCccdFromSides } from "@/app/lib/parseCard";

// Keep Node.js runtime so tesseract.js workers run correctly
export const runtime = "nodejs";

// Allow larger uploads (CCCD photos can be several MB)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const front = formData.get("imageFront") as File | null;
  const back = formData.get("imageBack") as File | null;
  const cardType = formData.get("cardType");

  if (!front || !back) {
    return Response.json({ error: "Vui lòng chọn đủ ảnh mặt trước và mặt sau CCCD." }, { status: 400 });
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
    // Dynamic import keeps this out of the Edge runtime bundle
    const Tesseract = (await import("tesseract.js")).default;

    const frontBuffer = Buffer.from(await front.arrayBuffer());
    const backBuffer = Buffer.from(await back.arrayBuffer());

    const frontResult = await Tesseract.recognize(frontBuffer, "vie+eng", {
      // Suppress verbose logging in production
      logger: () => {},
    });
    const backResult = await Tesseract.recognize(backBuffer, "vie+eng", {
      logger: () => {},
    });

    const frontText = frontResult.data.text;
    const backText = backResult.data.text;
    const parsed = parseCccdFromSides(frontText, backText, cardType);

    return Response.json({ rawTextFront: frontText, rawTextBack: backText, parsed });
  } catch (err) {
    console.error("[OCR] error:", err);
    return Response.json(
      { error: "Không thể xử lý ảnh. Vui lòng thử lại với ảnh rõ hơn." },
      { status: 500 }
    );
  }
}
