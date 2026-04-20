/**
 * AI-powered normalisation for CCCD parsed data using Google Gemini.
 *
 * Textract OCR often loses Vietnamese diacritics (e.g. "Duc Hoa" → "Đức Hoà")
 * and returns names in ALL-CAPS.  Gemini corrects these issues using its
 * understanding of Vietnamese geography and personal names.
 *
 * This step is best-effort: if Gemini is unavailable or returns garbage,
 * the original parsed data is returned unchanged.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CccdData } from "../types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `\
Bạn là chuyên gia chuẩn hoá dữ liệu CCCD (Căn cước công dân) Việt Nam.
Nhiệm vụ: nhận dữ liệu đã OCR (có thể thiếu dấu tiếng Việt) và trả về JSON đã chuẩn hoá.

Quy tắc bắt buộc:
1. Tên người (hoTen): viết HOA toàn bộ, đầy đủ dấu tiếng Việt. VD: "NGUYEN VAN A" → "NGUYỄN VĂN A"
2. Địa chỉ (queQuan, thuongTru): khôi phục đầy đủ dấu tiếng Việt cho tên địa danh.
   VD: "Duc Hoa, Soc Son, Ha Noi" → "Đức Hoà, Sóc Sơn, Hà Nội"
3. Ngày tháng: giữ nguyên định dạng DD/MM/YYYY.
4. Nơi cấp (capTai): chuẩn hoá tên đơn vị cấp CCCD.
5. Các trường KHÔNG có trong input → trả về chuỗi rỗng "".
6. KHÔNG thêm thông tin bịa đặt.
7. CHỈ trả về JSON thuần tuý, không có markdown, không có giải thích.

Cấu trúc JSON đầu ra (giữ đúng các key này):
{
  "soCanCuoc": "",
  "hoTen": "",
  "ngaySinh": "",
  "gioiTinh": "",
  "quocTich": "",
  "queQuan": "",
  "thuongTru": "",
  "ngayHetHan": "",
  "capNgay": "",
  "capTai": ""
}`;

export async function normalizeWithAi(
  parsed: Partial<CccdData>,
  rawTextFront: string,
  rawTextBack: string
): Promise<Partial<CccdData>> {
  if (!GEMINI_API_KEY) {
    console.warn("[AI] GEMINI_API_KEY not set — skipping normalisation");
    return parsed;
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-2.0-flash-lite",
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      },
      { apiVersion: "v1beta" }
    );

    const userPrompt = `
Dữ liệu đã parse (có thể thiếu dấu):
${JSON.stringify(parsed, null, 2)}

Raw OCR text mặt trước:
${rawTextFront}

Raw OCR text mặt sau:
${rawTextBack}

Hãy chuẩn hoá và trả về JSON.`;

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userPrompt },
    ]);

    const responseText = result.response.text().trim();

    // Strip markdown code fences if model wraps JSON anyway
    const jsonStr = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const aiData = JSON.parse(jsonStr) as Partial<CccdData>;

    // Merge: AI result wins when non-empty; original parsed value is the fallback
    const merged: Partial<CccdData> = { ...parsed };
    const keys: (keyof CccdData)[] = [
      "soCanCuoc", "hoTen", "ngaySinh", "gioiTinh",
      "quocTich", "queQuan", "thuongTru",
      "ngayHetHan", "capNgay", "capTai",
    ];
    for (const key of keys) {
      const aiVal = aiData[key]?.trim();
      if (aiVal) merged[key] = aiVal;
    }

    return merged;
  } catch (err) {
    console.error("[AI] normalisation failed, using raw parse:", err);
    return parsed;   // graceful degradation
  }
}
