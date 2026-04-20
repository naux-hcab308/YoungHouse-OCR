import type { CccdData } from "../types";

function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

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

function titleCaseNameFromMrz(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseMrz(rawFront: string, rawBack: string): Partial<CccdData> {
  const raw = `${rawFront}\n${rawBack}`.replace(/\s+/g, " ").toUpperCase();
  const fromMrz: Partial<CccdData> = {};

  // Common VN ID card MRZ shape:
  // IDVNM<12-digit-id><check> ...
  const idMatch = raw.match(/IDVNM(\d{12})/);
  if (idMatch) {
    fromMrz.soCanCuoc = idMatch[1];
  }

  // DOB + sex + expiry segment, e.g. 0503165F3003161
  const dseMatch = raw.match(/(\d{6})(\d)([MF])(\d{6})/);
  if (dseMatch) {
    const yy = dseMatch[1].slice(0, 2);
    const mm = dseMatch[1].slice(2, 4);
    const dd = dseMatch[1].slice(4, 6);
    const fullYear = Number(yy) > 30 ? `19${yy}` : `20${yy}`;
    fromMrz.ngaySinh = `${dd}/${mm}/${fullYear}`;
    fromMrz.gioiTinh = dseMatch[3] === "F" ? "Nữ" : "Nam";

    const expYy = dseMatch[4].slice(0, 2);
    const expMm = dseMatch[4].slice(2, 4);
    const expDd = dseMatch[4].slice(4, 6);
    const expYear = Number(expYy) > 30 ? `19${expYy}` : `20${expYy}`;
    fromMrz.ngayHetHan = `${expDd}/${expMm}/${expYear}`;
  }

  // Name row usually looks like DAO<<THANH<VAN<<<<
  const nameMatch = raw.match(/([A-Z]{2,})<<([A-Z<]{2,})<*</);
  if (nameMatch) {
    const surname = nameMatch[1].replace(/</g, " ").trim();
    const given = nameMatch[2].replace(/</g, " ").trim();
    const noAccentName = `${surname} ${given}`.replace(/\s+/g, " ").trim();
    if (noAccentName.length >= 4) {
      fromMrz.hoTen = titleCaseNameFromMrz(noAccentName);
    }
  }

  return fromMrz;
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
  const mrz = parseMrz(rawFront, rawBack);
  const merged: Partial<CccdData> = {};

  // MRZ is often more stable than OCR text blocks for key identity fields.
  pickBest(merged, "soCanCuoc", mrz, front, back);
  pickBest(merged, "hoTen", front, mrz, back);
  pickBest(merged, "ngaySinh", mrz, front, back);
  pickBest(merged, "gioiTinh", mrz, front, back);
  pickBest(merged, "quocTich", front, back);
  pickBest(merged, "queQuan", front, back);
  pickBest(merged, "thuongTru", front, back);
  pickBest(merged, "ngayHetHan", mrz, front, back);

  const allLines = [...normalizeLines(rawFront), ...normalizeLines(rawBack)];
  const allText = `${rawFront}\n${rawBack}`;
  const normalizedLines = allLines.map((line) => stripDiacritics(line));

  // Date of issue / Cấp ngày
  const issueLabelIndex = normalizedLines.findIndex(
    (line) =>
      line.includes("ngay, thang, nam cap") ||
      line.includes("ngay thang nam cap") ||
      line.includes("date of issue")
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
