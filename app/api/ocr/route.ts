import { NextRequest } from "next/server";
import { parseCccdFromSides } from "@/app/lib/parseCard";
import { normalizeWithAi } from "@/app/lib/normalizeWithAi";
import type { CccdData } from "@/app/types";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

// ═══════════════════════════════════════════════════════════════════
// SHARED — image pre-processing
// ═══════════════════════════════════════════════════════════════════

async function prepareImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER A — AWS Textract
// ═══════════════════════════════════════════════════════════════════

async function runTextract(imageBuffer: Buffer): Promise<string> {
  const { TextractClient, DetectDocumentTextCommand } = await import(
    "@aws-sdk/client-textract"
  );
  const textract = new TextractClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const response = await textract.send(
    new DetectDocumentTextCommand({ Document: { Bytes: imageBuffer } })
  );

  return (response.Blocks ?? [])
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .map((b) => b.Text as string)
    .join("\n");
}

async function ocrWithTextract(
  frontBuffer: Buffer,
  backBuffer: Buffer,
  cardType: "old" | "new"
): Promise<{ rawTextFront: string; rawTextBack: string; parsed: Partial<CccdData> }> {
  const [rawTextFront, rawTextBack] = await Promise.all([
    runTextract(frontBuffer),
    runTextract(backBuffer),
  ]);
  const parsed = parseCccdFromSides(rawTextFront, rawTextBack, cardType);
  return { rawTextFront, rawTextBack, parsed };
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER B — FPT AI Vision IDR
// ═══════════════════════════════════════════════════════════════════

interface FptField {
  id?: string;
  name?: string;
  dob?: string;
  sex?: string;
  nationality?: string;
  home?: string;
  address?: string;
  doe?: string;
  issue_date?: string;
  issue_loc?: string;
  type?: string;
}

interface FptResponse {
  errorCode: number;
  errorMessage: string;
  data: FptField[];
}

async function runFptOcr(imageBuffer: Buffer): Promise<FptField | null> {
  const apiKey = process.env.FPT_AI_API_KEY;
  if (!apiKey) throw new Error("FPT_AI_API_KEY is not configured");

  const fd = new FormData();
  fd.append("image", new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" }), "image.jpg");

  const response = await fetch("https://api.fpt.ai/vision/idr/vnm", {
    method: "POST",
    headers: { "api-key": apiKey },
    body: fd,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`FPT AI API error ${response.status}: ${text}`);
  }

  const result = (await response.json()) as FptResponse;
  if (result.errorCode !== 0) throw new Error(`FPT AI: ${result.errorMessage}`);

  return result.data?.[0] ?? null;
}

function mapFptToCccd(f: FptField | null, b: FptField | null): Partial<CccdData> {
  const pick = (a?: string, c?: string) => a?.trim() || c?.trim() || "";
  f = f ?? {};
  b = b ?? {};
  return {
    soCanCuoc: pick(f.id, b.id),
    hoTen:     pick(f.name, b.name),
    ngaySinh:  pick(f.dob, b.dob),
    gioiTinh:  pick(f.sex, b.sex),
    quocTich:  pick(f.nationality, b.nationality) || "Việt Nam",
    queQuan:   pick(f.home, b.home),
    thuongTru: pick(f.address, b.address),
    ngayHetHan: pick(f.doe, b.doe),
    capNgay:   pick(b.issue_date, f.issue_date),
    capTai:    pick(b.issue_loc, f.issue_loc),
  };
}

function fptToRawText(data: FptField | null): string {
  if (!data) return "";
  return [
    data.id          && `Số / No.: ${data.id}`,
    data.name        && `Họ và tên / Full name: ${data.name}`,
    data.dob         && `Ngày sinh / Date of birth: ${data.dob}`,
    data.sex         && `Giới tính / Sex: ${data.sex}`,
    data.nationality && `Quốc tịch / Nationality: ${data.nationality}`,
    data.home        && `Quê quán / Place of origin: ${data.home}`,
    data.address     && `Nơi thường trú / Place of residence: ${data.address}`,
    data.doe         && `Có giá trị đến / Date of expiry: ${data.doe}`,
    data.issue_date  && `Ngày, tháng, năm cấp / Date of issue: ${data.issue_date}`,
    data.issue_loc   && `Nơi cấp: ${data.issue_loc}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function ocrWithFpt(
  frontBuffer: Buffer,
  backBuffer: Buffer
): Promise<{ rawTextFront: string; rawTextBack: string; parsed: Partial<CccdData> }> {
  const [frontData, backData] = await Promise.all([
    runFptOcr(frontBuffer),
    runFptOcr(backBuffer),
  ]);
  return {
    rawTextFront: fptToRawText(frontData),
    rawTextBack:  fptToRawText(backData),
    parsed:       mapFptToCccd(frontData, backData),
  };
}

// ═══════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const front    = formData.get("imageFront") as File | null;
  const back     = formData.get("imageBack")  as File | null;
  const cardType = formData.get("cardType") as string | null;
  const provider = (formData.get("provider") as string | null) ?? "fpt";

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

  try {
    const [frontBuffer, backBuffer] = await Promise.all([
      front.arrayBuffer().then((ab) => prepareImage(Buffer.from(ab))),
      back.arrayBuffer().then((ab)  => prepareImage(Buffer.from(ab))),
    ]);

    const { rawTextFront, rawTextBack, parsed } =
      provider === "textract"
        ? await ocrWithTextract(frontBuffer, backBuffer, (cardType === "old" ? "old" : "new"))
        : await ocrWithFpt(frontBuffer, backBuffer);

    const normalized = await normalizeWithAi(parsed, rawTextFront, rawTextBack);

    return Response.json({ rawTextFront, rawTextBack, parsed: normalized, provider });
  } catch (err) {
    console.error(`[OCR:${provider}] error:`, err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Không thể xử lý ảnh. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
