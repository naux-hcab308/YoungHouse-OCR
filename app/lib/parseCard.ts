import type { CccdData } from "../types";
import type { RegionOcrResult } from "./regionOcr";

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
 *
 * Strategy: normalise every line with stripDiacritics before label matching
 * so the parser is immune to diacritic variants, casing differences, and
 * minor OCR substitutions in label text.  Original lines are used only for
 * extracting actual field values.
 */
export function parseCccdText(raw: string): Partial<CccdData> {
  const result: Partial<CccdData> = {};

  const text  = raw.replace(/\r/g, "\n");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  // Normalised counterparts used for label detection only
  const norm  = lines.map(stripDiacritics);

  // ── CCCD / ID number ──────────────────────────────────────────────────
  // IMPORTANT: For Vietnamese CCCD the MRZ document-number field is a
  // DIFFERENT code from the number printed on the card.
  // The printed number always appears after the "Sô / No.:" label.
  // We must NOT use the MRZ line (IDVNM...) as the source.

  const digitOnly = (s: string) => s.replace(/[\s\-\.]/g, "");

  // Priority 1: inline "No.:" or "Số:" pattern, e.g. "Sô / No.: 001204028543"
  let cccdCandidate: string | undefined;
  for (let i = 0; i < norm.length; i++) {
    if (/no\s*\.?\s*:/.test(norm[i]) || /s[o0]\s*\/\s*no/.test(norm[i])) {
      // Try to extract digits from the same line
      const digits = digitOnly(lines[i]).match(/(\d{9,12})/g) ?? [];
      const best = digits.find((d) => d.startsWith("0") && (d.length === 9 || d.length === 12));
      if (best) {
        cccdCandidate = best.length === 9 ? best : best.slice(0, 12);
        break;
      }
      // Value may be on the next line
      if (lines[i + 1]) {
        const compact = digitOnly(lines[i + 1]);
        const m = compact.match(/(0\d{8,11})/);
        if (m) { cccdCandidate = m[1].length < 12 ? m[1] : m[1].slice(0, 12); break; }
      }
    }
  }

  // Priority 2: standalone line that is exactly 9 or 12 digits starting with 0
  // (exclude MRZ lines which contain letters)
  if (!cccdCandidate) {
    for (const line of lines) {
      if (/[A-Z<]/.test(line)) continue;          // skip MRZ lines
      const compact = digitOnly(line);
      if (/^0\d{11}$/.test(compact)) { cccdCandidate = compact; break; }
      if (/^0\d{8}$/.test(compact) && !cccdCandidate) cccdCandidate = compact;
    }
  }

  if (cccdCandidate) result.soCanCuoc = cccdCandidate;

  // ── Full name ──────────────────────────────────────────────────────────
  for (let i = 0; i < norm.length; i++) {
    if (/ho\s+va\s+ten|full\s*name/.test(norm[i])) {
      // Value may be on the same line (after the label) or the next line
      const sameLineValue = lines[i]
        .replace(/h[oọ]\s+v[àa]\s+t[eê]n\s*[/\\|]?\s*full\s*name\s*[:/]?\s*/i, "")
        .replace(/full\s*name\s*[:/]?\s*/i, "")
        .trim();
      result.hoTen = sameLineValue.length > 2 ? sameLineValue : lines[i + 1] ?? "";
      break;
    }
  }

  // ── Dates (DD/MM/YYYY) ────────────────────────────────────────────────
  const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [];
  if (dates.length >= 1) result.ngaySinh  = dates[0];
  if (dates.length >= 2) result.ngayHetHan = dates[dates.length - 1];

  // ── Gender ─────────────────────────────────────────────────────────────
  for (let i = 0; i < norm.length; i++) {
    if (/gioi\s*tinh|sex/.test(norm[i])) {
      // Value may be inline or on next line
      const haystack = (lines[i] + " " + (lines[i + 1] ?? "")).toLowerCase();
      if (/n[ữu]|female/i.test(haystack)) { result.gioiTinh = "Nữ"; }
      else                                 { result.gioiTinh = "Nam"; }
      break;
    }
  }
  if (!result.gioiTinh) {
    for (const line of lines) {
      if (/^\s*n[ữu]\s*$/i.test(line))  { result.gioiTinh = "Nữ"; break; }
      if (/^\s*nam\s*$/i.test(line))     { result.gioiTinh = "Nam"; break; }
    }
  }

  result.quocTich = "Việt Nam";

  // Helper: detect whether a line is a known CCCD field label
  const isLabel = (n: string) =>
    /ho\s+va\s+ten|full\s*name/.test(n) ||
    /ngay\s*sinh|date\s*of\s*birth/.test(n) ||
    /gioi\s*tinh|sex/.test(n) ||
    /quoc\s*tich|nationality/.test(n) ||
    /que\s+quan|place\s+of\s+origin/.test(n) ||
    /noi\s+thuong\s+tru|place\s+of\s+residence/.test(n) ||
    /co\s+gia\s+tri|expiry/.test(n) ||
    /ngay.*thang.*nam\s+cap|date\s+of\s+issue/.test(n) ||
    /dac\s+diem\s+nhan\s+dang|personal\s+identification/.test(n) ||
    /ngon\s+tro|index\s+finger/.test(n);

  // Helper: collect value lines after a label (up to but not including the
  // next label line or a date-only line that marks the expiry)
  const collectValue = (startIdx: number): string => {
    const parts: string[] = [];
    for (let j = startIdx; j < lines.length && j < startIdx + 4; j++) {
      if (isLabel(norm[j])) break;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(lines[j].trim())) break;
      if (lines[j].trim()) parts.push(lines[j].trim());
    }
    return parts.join(", ");
  };

  // ── Quê quán ───────────────────────────────────────────────────────────
  for (let i = 0; i < norm.length; i++) {
    if (/que\s+quan|place\s+of\s+origin/.test(norm[i])) {
      const inline = lines[i]
        .replace(/qu[eê]\s+qu[áa]n\s*[/\\|]?\s*place\s+of\s+origin\s*[:/]?\s*/i, "")
        .replace(/place\s+of\s+origin\s*[:/]?\s*/i, "")
        .trim();
      result.queQuan = inline.length > 3 ? inline : collectValue(i + 1);
      break;
    }
  }

  // ── Nơi thường trú ────────────────────────────────────────────────────
  for (let i = 0; i < norm.length; i++) {
    if (/noi\s+thuong\s+tru|place\s+of\s+residence/.test(norm[i])) {
      const inline = lines[i]
        .replace(/n[oơ]i\s+th[uư][oờ]ng\s+tr[uú]\s*[/\\|]?\s*place\s+of\s+residence\s*[:/]?\s*/i, "")
        .replace(/place\s+of\s+residence\s*[:/]?\s*/i, "")
        .trim();
      result.thuongTru = inline.length > 5 ? inline : collectValue(i + 1);
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

  // NOTE: For Vietnamese CCCD the MRZ document-number field (after IDVNM)
  // is a different internal code, NOT the number printed on the card face.
  // We intentionally skip soCanCuoc extraction from MRZ to avoid the wrong number.

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

  // soCanCuoc: MRZ document-number ≠ printed CCCD number → use text only
  pickBest(merged, "soCanCuoc", front, back);
  pickBest(merged, "hoTen", front, mrz, back);
  pickBest(merged, "ngaySinh", mrz, front, back);
  pickBest(merged, "gioiTinh", mrz, front, back);
  pickBest(merged, "quocTich", front, back);
  pickBest(merged, "queQuan", front, back);
  pickBest(merged, "thuongTru", front, back);
  pickBest(merged, "ngayHetHan", mrz, front, back);

  const allLines = [...normalizeLines(rawFront), ...normalizeLines(rawBack)];
  const normalizedLines = allLines.map((line) => stripDiacritics(line));

  // ── Date of issue (Cấp ngày) ───────────────────────────────────────────
  // capNgay is ONLY printed on the BACK side; never mix with front dates
  // (ngaySinh / ngayHetHan) to avoid the "expiry date as issue date" bug.
  const backLines = normalizeLines(rawBack);
  const backNormalized = backLines.map((l) => stripDiacritics(l));

  const issueLabelIndex = backNormalized.findIndex((l) =>
    l.includes("ngay, thang, nam cap") ||
    l.includes("ngay thang nam cap") ||
    l.includes("date of issue")
  );
  if (issueLabelIndex >= 0) {
    const onLabel  = backLines[issueLabelIndex].match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
    const nextLine = backLines[issueLabelIndex + 1]?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
    merged.capNgay = onLabel ?? nextLine;
  }
  // Fallback: first DD/MM/YYYY on the back side.
  // MRZ uses YYMMDD (no slashes) so it won't be matched here.
  if (!merged.capNgay) {
    merged.capNgay = rawBack.match(/\d{2}\/\d{2}\/\d{4}/)?.[0];
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

/**
 * Merge region-OCR results on top of the full-card parse.
 *
 * Region OCR is more precise (single field, correct PSM, optional whitelist)
 * so it wins whenever it produced a non-empty value. Full-card parse acts as
 * the fallback for fields the region crop missed.
 */
export function mergeRegionResults(
  fullCard: Partial<CccdData>,
  region: RegionOcrResult
): Partial<CccdData> {
  const merged = { ...fullCard };

  const apply = <K extends keyof CccdData>(
    key: K,
    value: string | undefined
  ) => {
    if (value && value.trim()) merged[key] = value.trim() as CccdData[K];
  };

  apply("soCanCuoc",  region.soCanCuoc);
  apply("hoTen",      region.hoTen);
  apply("ngaySinh",   region.ngaySinh);
  apply("gioiTinh",   region.gioiTinh);
  apply("queQuan",    region.queQuan);
  apply("thuongTru",  region.thuongTru);
  apply("ngayHetHan", region.ngayHetHan);
  apply("capNgay",    region.capNgay);
  apply("capTai",     region.capTai);

  return merged;
}
