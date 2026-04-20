import type { CccdData } from "../types";

/**
 * Parse raw OCR text from a Vietnamese Căn cước công dân (CCCD) image.
 * Returns best-effort extracted fields; all fields are optional since OCR
 * accuracy varies with image quality.
 */
export function parseCccdText(raw: string): Partial<CccdData> {
  const result: Partial<CccdData> = {};

  const text = raw.replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // --- ID number: 12 consecutive digits ---
  for (const line of lines) {
    const m = line.match(/\b(\d{12})\b/);
    if (m) {
      result.soCanCuoc = m[1];
      break;
    }
  }

  // --- Full name: line after "Họ và tên" / "Full name" keyword ---
  for (let i = 0; i < lines.length; i++) {
    if (/h[oọ]\s+v[àa]\s+t[eê]n|full\s+name/i.test(lines[i])) {
      const stripped = lines[i]
        .replace(/h[oọ]\s+v[àa]\s+t[eê]n\s*[:/]?\s*/i, "")
        .replace(/full\s+name\s*[:/]?\s*/i, "")
        .trim();
      if (stripped.length > 2) {
        result.hoTen = stripped;
      } else if (i + 1 < lines.length) {
        result.hoTen = lines[i + 1];
      }
      break;
    }
  }

  // --- Dates (DD/MM/YYYY) ---
  const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [];
  if (dates.length >= 1) result.ngaySinh = dates[0];
  if (dates.length >= 2) result.ngayHetHan = dates[dates.length - 1];

  // --- Gender ---
  for (const line of lines) {
    // Avoid false matches on lines containing names or addresses
    if (/gi[oớ]i\s+t[íi]nh|sex\s*:/i.test(line)) {
      if (/n[ữu]/i.test(line)) {
        result.gioiTinh = "Nữ";
      } else {
        result.gioiTinh = "Nam";
      }
      break;
    }
  }
  if (!result.gioiTinh) {
    // Fallback: look for standalone "Nam" or "Nữ"
    for (const line of lines) {
      if (/^\s*n[ữu]\s*$/i.test(line)) { result.gioiTinh = "Nữ"; break; }
      if (/^\s*nam\s*$/i.test(line)) { result.gioiTinh = "Nam"; break; }
    }
  }

  result.quocTich = "Việt Nam";

  // --- Place of origin (Quê quán) ---
  for (let i = 0; i < lines.length; i++) {
    if (/qu[eê]\s+qu[áa]n|place\s+of\s+origin/i.test(lines[i])) {
      const stripped = lines[i]
        .replace(/qu[eê]\s+qu[áa]n\s*[:/]?\s*/i, "")
        .replace(/place\s+of\s+origin\s*[:/]?\s*/i, "")
        .trim();
      result.queQuan =
        stripped.length > 3 ? stripped : lines[i + 1] ?? stripped;
      break;
    }
  }

  // --- Place of residence (Nơi thường trú) ---
  for (let i = 0; i < lines.length; i++) {
    if (
      /n[oơ]i\s+th[uư][oờ]ng\s+tr[uú]|place\s+of\s+residence/i.test(lines[i])
    ) {
      const stripped = lines[i]
        .replace(/n[oơ]i\s+th[uư][oờ]ng\s+tr[uú]\s*[:/]?\s*/i, "")
        .replace(/place\s+of\s+residence\s*[:/]?\s*/i, "")
        .trim();
      if (stripped.length > 5) {
        result.thuongTru = stripped;
      } else {
        // Address can span 1-2 lines
        const parts: string[] = [];
        if (i + 1 < lines.length && !/c[oó]\s+gi[aá]\s+tr[ịi]|expiry/i.test(lines[i + 1])) {
          parts.push(lines[i + 1]);
        }
        if (i + 2 < lines.length && !/c[oó]\s+gi[aá]\s+tr[ịi]|expiry/i.test(lines[i + 2])) {
          parts.push(lines[i + 2]);
        }
        result.thuongTru = parts.join(", ");
      }
      break;
    }
  }

  return result;
}

type CardType = "old" | "new";

function normalizeLines(raw: string): string[] {
  return raw
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function pickBest<T extends keyof CccdData>(
  target: Partial<CccdData>,
  key: T,
  ...candidates: Array<Partial<CccdData>>
) {
  for (const candidate of candidates) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) {
      target[key] = value.trim();
      return;
    }
  }
}

/**
 * Parse data from both sides of CCCD and merge best fields for old/new form.
 */
export function parseCccdFromSides(
  rawFront: string,
  rawBack: string,
  cardType: CardType
): Partial<CccdData> {
  const front = parseCccdText(rawFront);
  const back = parseCccdText(rawBack);
  const merged: Partial<CccdData> = {};

  pickBest(merged, "soCanCuoc", front, back);
  pickBest(merged, "hoTen", front, back);
  pickBest(merged, "ngaySinh", front, back);
  pickBest(merged, "gioiTinh", front, back);
  pickBest(merged, "quocTich", front, back);
  pickBest(merged, "queQuan", front, back);
  pickBest(merged, "thuongTru", front, back);
  pickBest(merged, "ngayHetHan", front, back);

  const allLines = [...normalizeLines(rawFront), ...normalizeLines(rawBack)];
  const allText = `${rawFront}\n${rawBack}`;

  // Date of issue / Cấp ngày
  const issueLabelIndex = allLines.findIndex((line) =>
    /ng[aà]y,\s*th[aá]ng,\s*n[aă]m\s*c[ấa]p|date\s+of\s+issue/i.test(line)
  );
  if (issueLabelIndex >= 0) {
    const withLabelDate = allLines[issueLabelIndex].match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
    const nextLineDate = allLines[issueLabelIndex + 1]?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
    merged.capNgay = withLabelDate ?? nextLineDate ?? merged.capNgay;
  }
  if (!merged.capNgay) {
    const dates = allText.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [];
    if (dates.length >= 2) {
      // Usually one of the middle dates is issue date, keep best effort.
      merged.capNgay = dates[Math.max(1, dates.length - 2)];
    }
  }

  // Issued by / Cấp tại
  if (!merged.capTai) {
    if (cardType === "new") {
      const boCongAnLine = allLines.find((line) =>
        /b[oộ]\s*c[oô]ng\s*an|ministry\s+of\s+public\s+security/i.test(line)
      );
      if (boCongAnLine) {
        merged.capTai = "Bộ Công An";
      }
    }
    if (!merged.capTai) {
      const issuingLine = allLines.find((line) =>
        /c[uụ]c\s+tr[uư][oơ]ng\s+c[uụ]c\s+c[aả]nh\s+s[aá]t|director\s+general\s+of\s+the\s+police/i.test(
          line
        )
      );
      if (issuingLine) {
        merged.capTai = "Cục Cảnh sát QLHC về TTXH";
      }
    }
  }

  return merged;
}
