import { NextRequest } from "next/server";
import { parseCccdText } from "@/app/lib/parseCard";

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

  const file = formData.get("image") as File | null;
  if (!file) {
    return Response.json({ error: "Không tìm thấy ảnh" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json(
      { error: "File không hợp lệ. Vui lòng upload ảnh (JPEG/PNG/WEBP)." },
      { status: 400 }
    );
  }

  try {
    // Dynamic import keeps this out of the Edge runtime bundle
    const Tesseract = (await import("tesseract.js")).default;

    const buffer = Buffer.from(await file.arrayBuffer());

    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "vie+eng", {
      // Suppress verbose logging in production
      logger: () => {},
    });

    const parsed = parseCccdText(text);

    return Response.json({ rawText: text, parsed });
  } catch (err) {
    console.error("[OCR] error:", err);
    return Response.json(
      { error: "Không thể xử lý ảnh. Vui lòng thử lại với ảnh rõ hơn." },
      { status: 500 }
    );
  }
}
