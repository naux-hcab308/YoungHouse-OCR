/**
 * Region-based OCR for Vietnamese CCCD cards.
 *
 * Instead of throwing the entire card at Tesseract, we crop each field area
 * and OCR it with the most appropriate PSM (page-segmentation mode).
 * This eliminates cross-field label confusion and lets Tesseract focus on
 * a single line of interest.
 *
 * Coordinates are expressed as fractions [0, 1] of the image dimensions so
 * they scale with any resolution.  Values were calibrated against typical
 * phone photos where the card fills ~85 %+ of the frame.
 */

import sharp from "sharp";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RegionDef {
  /** Fraction of image width from left edge */
  left: number;
  /** Fraction of image height from top edge */
  top: number;
  /** Fraction of image width */
  width: number;
  /** Fraction of image height */
  height: number;
  /**
   * Tesseract PSM mode string.
   * "7" = SINGLE_LINE  (name, date, number)
   * "6" = SINGLE_BLOCK (multi-line address)
   * "8" = SINGLE_WORD  (gender)
   */
  psm: "6" | "7" | "8";
  /** Optional Tesseract character whitelist */
  whitelist?: string;
}

export interface RegionOcrResult {
  soCanCuoc?: string;
  hoTen?: string;
  ngaySinh?: string;
  gioiTinh?: string;
  queQuan?: string;
  thuongTru?: string;
  ngayHetHan?: string;
  capNgay?: string;
  capTai?: string;
}

// ── CCCD layout definitions ────────────────────────────────────────────────

/**
 * New chip CCCD (issued from 2021 onwards) – mặt trước.
 *
 * Photo block occupies the leftmost ~32 % of the card.
 * All text fields live in the right 68 %.
 */
const FRONT_REGIONS_NEW: Record<keyof Omit<RegionOcrResult, "capNgay" | "capTai">, RegionDef> = {
  soCanCuoc: { left: 0.33, top: 0.05, width: 0.65, height: 0.15, psm: "7", whitelist: "0123456789" },
  hoTen:     { left: 0.33, top: 0.20, width: 0.65, height: 0.14, psm: "7" },
  ngaySinh:  { left: 0.33, top: 0.34, width: 0.38, height: 0.13, psm: "7", whitelist: "0123456789/" },
  gioiTinh:  { left: 0.33, top: 0.47, width: 0.22, height: 0.11, psm: "8" },
  queQuan:   { left: 0.33, top: 0.58, width: 0.65, height: 0.14, psm: "6" },
  thuongTru: { left: 0.33, top: 0.71, width: 0.65, height: 0.22, psm: "6" },
  ngayHetHan:{ left: 0.54, top: 0.87, width: 0.44, height: 0.12, psm: "7", whitelist: "0123456789/" },
};

/**
 * Old CCCD (9-digit ID, laminated, pre-2021) – mặt trước.
 *
 * Layout is slightly different: photo on the left, fields on the right,
 * but field rows are shifted up slightly.
 */
const FRONT_REGIONS_OLD: Record<keyof Omit<RegionOcrResult, "capNgay" | "capTai">, RegionDef> = {
  soCanCuoc: { left: 0.33, top: 0.04, width: 0.65, height: 0.16, psm: "7", whitelist: "0123456789" },
  hoTen:     { left: 0.33, top: 0.20, width: 0.65, height: 0.15, psm: "7" },
  ngaySinh:  { left: 0.33, top: 0.35, width: 0.38, height: 0.13, psm: "7", whitelist: "0123456789/" },
  gioiTinh:  { left: 0.33, top: 0.48, width: 0.22, height: 0.11, psm: "8" },
  queQuan:   { left: 0.33, top: 0.59, width: 0.65, height: 0.14, psm: "6" },
  thuongTru: { left: 0.33, top: 0.72, width: 0.65, height: 0.22, psm: "6" },
  ngayHetHan:{ left: 0.54, top: 0.87, width: 0.44, height: 0.12, psm: "7", whitelist: "0123456789/" },
};

/** Back side – same layout for both old and new */
const BACK_REGIONS: Pick<Record<keyof RegionOcrResult, RegionDef>, "capNgay" | "capTai"> = {
  capNgay: { left: 0.34, top: 0.55, width: 0.40, height: 0.14, psm: "7", whitelist: "0123456789/" },
  capTai:  { left: 0.10, top: 0.70, width: 0.80, height: 0.16, psm: "6" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function cropRegion(buffer: Buffer, region: RegionDef): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const imgW = meta.width ?? 1;
  const imgH = meta.height ?? 1;

  const left   = Math.round(region.left  * imgW);
  const top    = Math.round(region.top   * imgH);
  const width  = Math.min(Math.round(region.width  * imgW), imgW - left);
  const height = Math.min(Math.round(region.height * imgH), imgH - top);

  return sharp(buffer)
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
}

async function ocrRegion(
  buffer: Buffer,
  region: RegionDef,
  lang: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Tesseract: any
): Promise<string> {
  const crop = await cropRegion(buffer, region);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: Record<string, any> = {
    tessedit_pageseg_mode: region.psm,
    logger: () => {},
  };
  if (region.whitelist) {
    config.tessedit_char_whitelist = region.whitelist;
  }

  const result = await Tesseract.recognize(crop, lang, config);
  return (result.data.text as string).trim();
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Run targeted region-based OCR on a preprocessed CCCD image.
 *
 * @param frontBuffer  Preprocessed (adaptive-threshold) front-face image
 * @param backBuffer   Preprocessed back-face image
 * @param cardType     "new" | "old"
 * @param Tesseract    Tesseract.js default export (passed in to avoid double-import)
 */
export async function ocrByRegion(
  frontBuffer: Buffer,
  backBuffer: Buffer,
  cardType: "new" | "old",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Tesseract: any
): Promise<RegionOcrResult> {
  const frontDefs = cardType === "new" ? FRONT_REGIONS_NEW : FRONT_REGIONS_OLD;
  const lang = "vie+eng";

  // Run all crops concurrently
  const [
    soCanCuoc,
    hoTen,
    ngaySinh,
    gioiTinh,
    queQuan,
    thuongTru,
    ngayHetHan,
    capNgay,
    capTai,
  ] = await Promise.all([
    ocrRegion(frontBuffer, frontDefs.soCanCuoc, lang, Tesseract),
    ocrRegion(frontBuffer, frontDefs.hoTen,      lang, Tesseract),
    ocrRegion(frontBuffer, frontDefs.ngaySinh,   lang, Tesseract),
    ocrRegion(frontBuffer, frontDefs.gioiTinh,   lang, Tesseract),
    ocrRegion(frontBuffer, frontDefs.queQuan,    lang, Tesseract),
    ocrRegion(frontBuffer, frontDefs.thuongTru,  lang, Tesseract),
    ocrRegion(frontBuffer, frontDefs.ngayHetHan, lang, Tesseract),
    ocrRegion(backBuffer,  BACK_REGIONS.capNgay, lang, Tesseract),
    ocrRegion(backBuffer,  BACK_REGIONS.capTai,  lang, Tesseract),
  ]);

  const result: RegionOcrResult = {};

  // Only store if non-empty and passes basic sanity checks
  const clean12Digits = soCanCuoc.replace(/\D/g, "");
  if (clean12Digits.length >= 9) result.soCanCuoc = clean12Digits.slice(0, 12);

  if (hoTen.length >= 3)    result.hoTen     = hoTen;
  if (/\d{2}\/\d{2}\/\d{4}/.test(ngaySinh))  result.ngaySinh   = ngaySinh.match(/\d{2}\/\d{2}\/\d{4}/)![0];
  if (/\d{2}\/\d{2}\/\d{4}/.test(ngayHetHan)) result.ngayHetHan = ngayHetHan.match(/\d{2}\/\d{2}\/\d{4}/)![0];

  const gNorm = gioiTinh.toLowerCase();
  if (/n[ữu]/.test(gNorm)) result.gioiTinh = "Nữ";
  else if (/nam/.test(gNorm)) result.gioiTinh = "Nam";

  if (queQuan.length  >= 5) result.queQuan   = queQuan;
  if (thuongTru.length >= 5) result.thuongTru = thuongTru;

  if (/\d{2}\/\d{2}\/\d{4}/.test(capNgay)) result.capNgay = capNgay.match(/\d{2}\/\d{2}\/\d{4}/)![0];
  if (capTai.length >= 4) result.capTai = capTai;

  return result;
}
