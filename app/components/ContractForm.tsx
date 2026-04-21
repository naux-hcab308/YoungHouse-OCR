"use client";

import { useEffect, useState } from "react";
import type { CccdData, CompanionInfo, ContractDetails, ContractType } from "../types";
import {
  generateAnnexContract,
  generateDepositContract,
  generateFireSafetyCommitment,
  generateHouseRulesCommitment,
  generateRentalContract,
} from "../lib/generateContract";

// ── Số → chữ tiếng Việt ───────────────────────────────────────────────────────

const _DON_VI = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function _readHundreds(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  let s = "";
  if (h > 0) s += _DON_VI[h] + " trăm";
  if (t === 0 && u === 0) return s;
  if (t === 0) return s + (s ? " lẻ " : "") + _DON_VI[u];
  const tensWord = t === 1 ? "mười" : _DON_VI[t] + " mươi";
  s += (s ? " " : "") + tensWord;
  if (u > 0) s += " " + (u === 1 && t > 1 ? "mốt" : u === 5 && t > 0 ? "lăm" : _DON_VI[u]);
  return s;
}

export function soThanhChu(n: number): string {
  if (!n || isNaN(n) || n === 0) return "";
  const ty = Math.floor(n / 1_000_000_000);
  const trieu = Math.floor((n % 1_000_000_000) / 1_000_000);
  const nghin = Math.floor((n % 1_000_000) / 1_000);
  const tram = n % 1_000;
  const parts: string[] = [];
  if (ty > 0) parts.push(_readHundreds(ty) + " tỷ");
  if (trieu > 0) parts.push(_readHundreds(trieu) + " triệu");
  if (nghin > 0) parts.push(_readHundreds(nghin) + " nghìn");
  if (tram > 0) parts.push(_readHundreds(tram));
  const result = parts.join(" ");
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

// ── Default state ──────────────────────────────────────────────────────────────

const emptyCompanion = (): CompanionInfo => ({
  hoTen: "",
  soDienThoai: "",
  soCCCD: "",
  capNgay: "",
  capTai: "",
  ngaySinh: "",
  hoKhau: "",
  sdtNguoiThan: "",
});

function defaultDetails(): ContractDetails {
  const now = new Date();
  return {
    loaiHopDong: "thue-nha",
    ngayKy: String(now.getDate()).padStart(2, "0"),
    thangKy: String(now.getMonth() + 1).padStart(2, "0"),
    namKy: String(now.getFullYear()),
    benA_ten: "CÔNG TY TNHH ĐẦU TƯ VÀ THƯƠNG MẠI YOUNG HOUSE",
    benA_mst: "0111355826",
    benA_diaChi: "Số 85 Đường Mục Uyên - Công Nghệ, Xã Hạ Bằng, Thành phố Hà Nội, Việt Nam",
    benA_sdt: "0962 888 797",
    benB_sdt: "",
    benB_sdtNguoiThan: "",
    nguoiOCung: [],
    soPhong: "",
    soNguoiO: "",
    soXeMay: "",
    bienSoXe: "",
    giaThue: "",
    giaThueText: "",
    ngayGiaKhongDoiDen: "",
    tienCoc: "",
    tienCocText: "",
    phiQuanLy: "",
    phuongThucThanhToan: "1",
    dot1Tu: "",
    dot1Den: "",
    dot1HanChot: "",
    ngayBatDau: "",
    ngayKetThuc: "",
    toaNha: "",
    soThangThue: "",
    thoiGianTinhTien: "",
    ngayHenKyHopDong: "",
    dienMuaDong: "",
    dienMuaHe: "",
    anTheoThang: false,
    donVeSinhTheoThang: false,
  };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** DD/MM/YYYY → YYYY-MM-DD for <input type="date"> */
function toHtmlDate(v: string): string {
  const p = v.split("/");
  if (p.length !== 3 || !p[2] || !p[1] || !p[0]) return "";
  return `${p[2]}-${p[1]}-${p[0]}`;
}

/** YYYY-MM-DD → DD/MM/YYYY */
function fromHtmlDate(v: string): string {
  if (!v) return "";
  const p = v.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

// ── Money helper ──────────────────────────────────────────────────────────────

function parseRawNumber(v: string): number {
  return parseInt(v.replace(/\D/g, ""), 10) || 0;
}

function fmtVND(n: number): string {
  return n.toLocaleString("vi-VN");
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  placeholder,
  onChange,
  hint,
  span,
  required,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  hint?: string;
  span?: boolean;
  required?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-400/80 transition-colors"
      />
      {hint && <p className="mt-0.5 text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

/** Date picker – stores / exposes value as DD/MM/YYYY */
function DateField({
  label,
  value,
  onChange,
  required,
  span,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type="date"
        value={toHtmlDate(value)}
        onChange={(e) => onChange(fromHtmlDate(e.target.value))}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-black focus:outline-none focus:ring-2 focus:ring-rose-400/80 transition-colors"
      />
      {value && (
        <p className="mt-0.5 text-xs text-gray-500">{value}</p>
      )}
    </div>
  );
}

/** Money selector – chip mode (few options) or dropdown mode (many options) */
function MoneySelect({
  label,
  value,
  valueText,
  presets,
  onChangeAmount,
  required,
  span,
  suffix = "/tháng",
  useDropdown = false,
}: {
  label: string;
  value: string;
  valueText: string;
  presets: number[];
  onChangeAmount: (amount: string, text: string) => void;
  required?: boolean;
  span?: boolean;
  suffix?: string;
  useDropdown?: boolean;
}) {
  const currentNum = parseRawNumber(value);

  const selectNum = (n: number) => onChangeAmount(fmtVND(n), soThanhChu(n));

  const handleCustom = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const n = parseInt(digits, 10);
    onChangeAmount(
      digits ? fmtVND(n) : "",
      digits && !isNaN(n) ? soThanhChu(n) : ""
    );
  };

  const labelEl = (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );

  const autoTextEl = valueText && (
    <p className="text-xs text-emerald-700 font-medium italic bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5">
      → {valueText}
    </p>
  );

  // ── Dropdown mode ──────────────────────────────────────────────────────────
  if (useDropdown) {
    return (
      <div className={`space-y-2 ${span ? "sm:col-span-2" : ""}`}>
        {labelEl}
        <div className="relative">
          <select
            value={currentNum || ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n)) selectNum(n);
              else onChangeAmount("", "");
            }}
            className="w-full appearance-none px-3 py-2 pr-10 rounded-lg border border-gray-300 bg-white text-sm text-black focus:outline-none focus:ring-2 focus:ring-rose-400/80 transition-colors cursor-pointer"
          >
            <option value="">— Chọn giá —</option>
            {presets.map((p) => (
              <option key={p} value={p}>
                {fmtVND(p)} đ {suffix && suffix !== "/tháng" ? suffix : "/ tháng"}
              </option>
            ))}
          </select>
          {/* Chevron icon */}
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        {autoTextEl}
      </div>
    );
  }

  // ── Chip mode ──────────────────────────────────────────────────────────────
  return (
    <div className={`space-y-2 ${span ? "sm:col-span-2" : ""}`}>
      {labelEl}

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectNum(p)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              currentNum === p
                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                : "bg-white text-gray-600 border-gray-300 hover:border-rose-400 hover:text-rose-600"
            }`}
          >
            {fmtVND(p)}
          </button>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder="Hoặc nhập số tiền…"
          onChange={(e) => handleCustom(e.target.value)}
          className="w-full px-3 py-2 pr-16 rounded-lg border border-gray-300 bg-white text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400/80 transition-colors"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
          {suffix}
        </span>
      </div>

      {autoTextEl}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-1">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

// ── Preset price lists ─────────────────────────────────────────────────────────

/** 1,400,000 → 4,500,000 step 100,000 (32 options) */
const RENT_RANGE: number[] = Array.from(
  { length: Math.floor((4_500_000 - 1_400_000) / 100_000) + 1 },
  (_, i) => 1_400_000 + i * 100_000
);

/** 150,000 → 230,000 step 10,000 (9 options) */
const SERVICE_RANGE: number[] = Array.from(
  { length: Math.floor((230_000 - 150_000) / 10_000) + 1 },
  (_, i) => 150_000 + i * 10_000
);


const ELECTRIC_PRESETS = [3_000, 3_200, 3_400, 3_500, 3_800, 4_000];

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  cccd: Partial<CccdData>;
  rawText: { front: string; back: string };
  onBack: () => void;
}

export default function ContractForm({ cccd, rawText, onBack }: Props) {
  const [d, setD] = useState<ContractDetails>(defaultDetails);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof ContractDetails>(key: K, value: ContractDetails[K]) =>
    setD((prev) => ({ ...prev, [key]: value }));

  const setMoney = (
    amountKey: keyof ContractDetails,
    textKey: keyof ContractDetails,
    amount: string,
    text: string
  ) => setD((prev) => ({ ...prev, [amountKey]: amount, [textKey]: text }));

  /** Update signing date from a single DD/MM/YYYY string */
  const setSigningDate = (v: string) => {
    const p = v.split("/");
    setD((prev) => ({
      ...prev,
      ngayKy: p[0] ?? "",
      thangKy: p[1] ?? "",
      namKy: p[2] ?? "",
    }));
  };

  // Companion helpers
  const addCompanion = () => {
    if (d.nguoiOCung.length >= 3) return;
    set("nguoiOCung", [...d.nguoiOCung, emptyCompanion()]);
  };
  const removeCompanion = (idx: number) =>
    set("nguoiOCung", d.nguoiOCung.filter((_, i) => i !== idx));
  const updateCompanion = (idx: number, key: keyof CompanionInfo, value: string) => {
    const arr = d.nguoiOCung.map((c, i) => (i === idx ? { ...c, [key]: value } : c));
    set("nguoiOCung", arr);
  };

  // Auto-fill person 1 from CCCD when switching to phu-luc
  useEffect(() => {
    if (d.loaiHopDong !== "phu-luc") return;
    setD((prev) => {
      const person1: CompanionInfo = {
        hoTen: cccd.hoTen ?? "",
        soCCCD: cccd.soCanCuoc ?? "",
        capNgay: cccd.capNgay ?? "",
        capTai: cccd.capTai ?? "",
        ngaySinh: cccd.ngaySinh ?? "",
        hoKhau: cccd.thuongTru ?? "",
        soDienThoai: prev.benB_sdt ?? "",
        sdtNguoiThan: prev.benB_sdtNguoiThan ?? "",
      };
      const rest = prev.nguoiOCung.slice(1);
      return { ...prev, nguoiOCung: [person1, ...rest] };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.loaiHopDong]);

  const canGenerate =
    d.loaiHopDong === "dat-coc"
      ? !!(d.soPhong.trim() && d.tienCoc.trim())
      : d.loaiHopDong === "phu-luc" ||
        d.loaiHopDong === "cam-ket-chay" ||
        d.loaiHopDong === "cam-ket-noi-quy"
      ? !!d.soPhong.trim()
      : !!(d.soPhong.trim() && d.giaThue.trim() && d.ngayBatDau.trim());

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setDone(false);
    try {
      const blob =
        d.loaiHopDong === "thue-nha"
          ? await generateRentalContract(cccd, d)
          : d.loaiHopDong === "phu-luc"
          ? await generateAnnexContract(d)
          : d.loaiHopDong === "cam-ket-chay"
          ? await generateFireSafetyCommitment(d)
          : d.loaiHopDong === "cam-ket-noi-quy"
          ? await generateHouseRulesCommitment(d)
          : await generateDepositContract(cccd, d);

      const safeName = cccd.hoTen?.replace(/\s+/g, "-") ?? "khach";
      const fileName =
        d.loaiHopDong === "thue-nha"
          ? `HDTN_${d.soPhong || "phong"}_${safeName}.docx`
          : d.loaiHopDong === "phu-luc"
          ? `PhuLuc_${d.soPhong || "phong"}_${safeName}.docx`
          : d.loaiHopDong === "cam-ket-chay"
          ? `CamKetChayNo_${d.soPhong || "phong"}.docx`
          : d.loaiHopDong === "cam-ket-noi-quy"
          ? `CamKetNoiQuy_${d.soPhong || "phong"}.docx`
          : `GiayDatCoc_${d.soPhong || "phong"}_${safeName}.docx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tạo file. Vui lòng thử lại."
      );
    } finally {
      setGenerating(false);
    }
  };

  const contractTypes: Array<{ id: ContractType; label: string; emoji: string; desc: string }> = [
    { id: "thue-nha", label: "Hợp đồng thuê nhà", emoji: "🏠", desc: "Hợp đồng chính" },
    { id: "phu-luc", label: "Phụ lục hợp đồng", emoji: "📎", desc: "Bổ sung chi tiết" },
    { id: "cam-ket-chay", label: "Cam kết cháy nổ", emoji: "🔥", desc: "An toàn phòng cháy" },
    { id: "cam-ket-noi-quy", label: "Cam kết nội quy", emoji: "📋", desc: "Tuân thủ quy tắc" },
    { id: "dat-coc", label: "Giấy đặt cọc", emoji: "💰", desc: "Đặt cọc thuê phòng" },
  ];

  const signingDateValue = d.ngayKy && d.thangKy && d.namKy
    ? `${d.ngayKy}/${d.thangKy}/${d.namKy}`
    : "";

  return (
    <div className="flex gap-6 xl:gap-8">
      {/* Left sidebar */}
      <aside className="hidden lg:block lg:w-80 flex-shrink-0">
        <div className="sticky top-6 space-y-4">
          <div className="rounded-2xl bg-slate-100/90 border border-slate-200/80 p-4">
            <p className="text-xs font-bold text-sky-800 uppercase tracking-wide mb-3">
              Thông tin CCCD (từ OCR)
            </p>
            <div className="space-y-2 text-sm">
              {[
                ["Họ tên", cccd.hoTen],
                ["Số CCCD", cccd.soCanCuoc],
                ["Ngày sinh", cccd.ngaySinh],
                ["Cấp ngày", cccd.capNgay],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-gray-600 font-medium">{k}:</span>{" "}
                  <span className="font-semibold text-black">{v || "–"}</span>
                </div>
              ))}
            </div>
          </div>

          {(rawText.front || rawText.back) && (
            <div className="space-y-3">
              {rawText.front && (
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">Mặt trước (OCR)</p>
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 max-h-32 overflow-y-auto font-mono">
                    {rawText.front}
                  </div>
                </div>
              )}
              {rawText.back && (
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">Mặt sau (OCR)</p>
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-700 max-h-32 overflow-y-auto font-mono">
                    {rawText.back}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-7">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Chọn loại tài liệu</h2>
          <p className="text-sm text-gray-500">Chọn loại tài liệu muốn tạo và điền thông tin chi tiết.</p>
        </div>

        {/* Document type buttons */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Loại tài liệu</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contractTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => set("loaiHopDong", type.id)}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all shadow-sm ${
                  d.loaiHopDong === type.id
                    ? "border-rose-500 bg-rose-50/80 ring-1 ring-rose-200"
                    : "border-gray-200 bg-gray-50/50 hover:border-rose-200 hover:bg-white"
                }`}
              >
                {d.loaiHopDong === type.id && (
                  <span className="absolute top-2 right-2 text-rose-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                <div className="text-2xl mb-2">{type.emoji}</div>
                <div className="font-semibold text-sm text-gray-900 mb-1">{type.label}</div>
                <div className="text-xs text-gray-600">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form – cam-ket (minimal) */}
        {(d.loaiHopDong === "cam-ket-chay" || d.loaiHopDong === "cam-ket-noi-quy") && (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
              <span className="text-lg">{d.loaiHopDong === "cam-ket-noi-quy" ? "📋" : "🔥"}</span>
              <span>
                Bạn đang tạo{" "}
                <strong>
                  {d.loaiHopDong === "cam-ket-noi-quy" ? "Bản Cam Kết Nội Quy" : "Bản Cam Kết PCCC"}
                </strong>{" "}
                – chỉ cần ngày ký, số phòng và tòa nhà.
              </span>
            </div>
            <Section title="Ngày ký">
              <DateField label="Ngày ký" value={signingDateValue} onChange={setSigningDate} span />
            </Section>
            <Section title="Thông tin phòng *">
              <Field label="Số phòng *" value={d.soPhong} placeholder="VD: YH11-01" onChange={(v) => set("soPhong", v)} required />
              <Field label="Tòa nhà (mã số)" value={d.toaNha ?? ""} placeholder="VD: 11" onChange={(v) => set("toaNha", v)} />
            </Section>
          </>
        )}

        {/* Form – thue-nha, dat-coc, phu-luc, or cam-ket-chay */}
        {(d.loaiHopDong === "thue-nha" ||
          d.loaiHopDong === "dat-coc" ||
          d.loaiHopDong === "phu-luc" ||
          d.loaiHopDong === "cam-ket-chay" ||
          d.loaiHopDong === "cam-ket-noi-quy") && (
          <>
            {d.loaiHopDong === "dat-coc" && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <span className="text-lg">💰</span>
                <span>Bạn đang tạo <strong>Giấy Đặt Cọc</strong> – điền thông tin, tải về, in và ký ngay tại chỗ.</span>
              </div>
            )}

            {d.loaiHopDong === "phu-luc" && (
              <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800">
                <span className="text-lg">📎</span>
                <span>Bạn đang tạo <strong>Phụ Lục Hợp Đồng</strong> – liệt kê những người ở cùng trong phòng.</span>
              </div>
            )}

            {/* ── PHỤ LỤC form ─────────────────────────────────────────── */}
            {d.loaiHopDong === "phu-luc" && (
              <>
                <Section title="Ngày ký">
                  <DateField label="Ngày ký phụ lục" value={signingDateValue} onChange={setSigningDate} span />
                </Section>

                <Section title="Thông tin phòng *">
                  <Field label="Số phòng" value={d.soPhong} placeholder="VD: YH11-01" onChange={(v) => set("soPhong", v)} required />
                  <Field label="Tòa nhà (mã số)" value={d.toaNha ?? ""} placeholder="VD: YH11" onChange={(v) => set("toaNha", v)} />
                </Section>

                {/* Companions – person 1 auto-filled from CCCD, persons 2-3 optional */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                    <h3 className="text-sm font-bold text-gray-700">Người ở cùng trong phòng</h3>
                    {d.nguoiOCung.length < 3 && (
                      <button
                        onClick={addCompanion}
                        className="text-xs text-indigo-700 hover:text-indigo-800 font-semibold flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Thêm người 2 / 3
                      </button>
                    )}
                  </div>
                  {d.nguoiOCung.map((c, idx) => (
                    <div key={idx} className="border border-indigo-100 rounded-xl p-4 space-y-3 bg-indigo-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-700 uppercase">Người {idx + 1}</span>
                          {idx === 0 && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                              Từ CCCD
                            </span>
                          )}
                        </div>
                        {idx > 0 && (
                          <button onClick={() => removeCompanion(idx)} className="text-xs text-red-500 hover:text-red-600 font-semibold">Xoá</button>
                        )}
                      </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(
                            [
                              { key: "hoTen", label: "Họ và tên", ph: "Họ tên đầy đủ" },
                              { key: "soDienThoai", label: "Số điện thoại", ph: "0xxx xxx xxx" },
                              { key: "soCCCD", label: "Số CCCD/HC", ph: "12 chữ số" },
                              { key: "capNgay", label: "Cấp ngày", ph: "DD/MM/YYYY" },
                              { key: "capTai", label: "Cấp tại", ph: "Nơi cấp" },
                              { key: "ngaySinh", label: "Ngày sinh", ph: "DD/MM/YYYY" },
                              { key: "hoKhau", label: "Hộ khẩu thường trú", ph: "Địa chỉ đầy đủ", span: true },
                              { key: "sdtNguoiThan", label: "SĐT người thân", ph: "0xxx xxx xxx" },
                            ] as { key: keyof CompanionInfo; label: string; ph: string; span?: boolean }[]
                          ).map((f) => (
                            <div key={f.key} className={f.span ? "sm:col-span-2" : ""}>
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
                              <input
                                type="text"
                                value={c[f.key]}
                                placeholder={f.ph}
                                onChange={(e) => updateCompanion(idx, f.key, e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/80"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>

                <Section title="Thông tin bên A (Young House)">
                  <Field label="Tên công ty" value={d.benA_ten} onChange={(v) => set("benA_ten", v)} span />
                  <Field label="Địa chỉ" value={d.benA_diaChi} onChange={(v) => set("benA_diaChi", v)} span />
                </Section>
              </>
            )}

            {/* ── THUE-NHA / DAT-COC form ──────────────────────────────── */}
            {(d.loaiHopDong === "thue-nha" || d.loaiHopDong === "dat-coc") && (
              <>
                {/* Tenant summary */}
                <div className="rounded-2xl bg-slate-100/90 border border-slate-200/80 p-4 text-gray-900">
                  <p className="text-xs font-bold text-sky-800 uppercase tracking-wide mb-3">
                    Thông tin người thuê (từ CCCD)
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-gray-600 font-medium">Họ tên:</span> <span className="font-semibold text-black">{cccd.hoTen || "–"}</span></div>
                    <div><span className="text-gray-600 font-medium">Số CCCD:</span> <span className="font-semibold text-black">{cccd.soCanCuoc || "–"}</span></div>
                    <div><span className="text-gray-600 font-medium">Ngày sinh:</span> <span className="font-semibold text-black">{cccd.ngaySinh || "–"}</span></div>
                    <div><span className="text-gray-600 font-medium">Cấp ngày:</span> <span className="font-semibold text-black">{cccd.capNgay || "–"}</span></div>
                    <div className="col-span-2"><span className="text-gray-600 font-medium">Thường trú:</span> <span className="font-semibold text-black">{cccd.thuongTru || "–"}</span></div>
                  </div>
                </div>

                {/* Signing date */}
                <Section title="Ngày ký">
                  <DateField label="Ngày ký hợp đồng" value={signingDateValue} onChange={setSigningDate} span />
                </Section>

                {/* Bên B extras */}
                <Section title="Thông tin bổ sung bên B (người thuê)">
                  <Field label="Số điện thoại" value={d.benB_sdt} placeholder="0xxx xxx xxx" onChange={(v) => set("benB_sdt", v)} />
                  <Field label="SĐT người thân (khi cần liên lạc)" value={d.benB_sdtNguoiThan} placeholder="0xxx xxx xxx" onChange={(v) => set("benB_sdtNguoiThan", v)} />
                </Section>

                {/* Companions – thue-nha only */}
                {d.loaiHopDong === "thue-nha" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                      <h3 className="text-sm font-bold text-gray-700">Người ở cùng</h3>
                      {d.nguoiOCung.length < 3 && (
                        <button onClick={addCompanion} className="text-xs text-sky-700 hover:text-sky-800 font-semibold flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Thêm người
                        </button>
                      )}
                    </div>
                    {d.nguoiOCung.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Chưa có người ở cùng. Nhấn "Thêm người" để thêm.</p>
                    ) : (
                      d.nguoiOCung.map((c, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase">Người {idx + 1}</span>
                            <button onClick={() => removeCompanion(idx)} className="text-xs text-red-500 hover:text-red-600 font-semibold">Xoá</button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(
                              [
                                { key: "hoTen", label: "Họ và tên", ph: "Họ tên đầy đủ" },
                                { key: "soDienThoai", label: "Số điện thoại", ph: "0xxx xxx xxx" },
                                { key: "soCCCD", label: "Số CCCD/HC", ph: "12 chữ số" },
                                { key: "capNgay", label: "Cấp ngày", ph: "DD/MM/YYYY" },
                                { key: "capTai", label: "Cấp tại", ph: "Nơi cấp" },
                                { key: "ngaySinh", label: "Ngày sinh", ph: "DD/MM/YYYY" },
                                { key: "hoKhau", label: "Hộ khẩu thường trú", ph: "Địa chỉ đầy đủ", span: true },
                                { key: "sdtNguoiThan", label: "SĐT người thân", ph: "0xxx xxx xxx" },
                              ] as { key: keyof CompanionInfo; label: string; ph: string; span?: boolean }[]
                            ).map((f) => (
                              <div key={f.key} className={f.span ? "sm:col-span-2" : ""}>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
                                <input
                                  type="text"
                                  value={c[f.key]}
                                  placeholder={f.ph}
                                  onChange={(e) => updateCompanion(idx, f.key, e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-slate-50 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-400/80"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Room info */}
                <Section title="Thông tin phòng">
                  <Field label="Số phòng" value={d.soPhong} placeholder="VD: YH11-01" onChange={(v) => set("soPhong", v)} required />
                  <Field label="Số người ở" value={d.soNguoiO} placeholder="VD: 2" onChange={(v) => set("soNguoiO", v)} />
                  {d.loaiHopDong === "thue-nha" && (
                    <>
                      <Field label="Số xe máy" value={d.soXeMay} placeholder="VD: 1" onChange={(v) => set("soXeMay", v)} />
                      <Field label="Biển số xe" value={d.bienSoXe} placeholder="VD: 30F1-12345" onChange={(v) => set("bienSoXe", v)} />
                    </>
                  )}
                </Section>

                {/* Pricing */}
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-1">Giá thuê &amp; đặt cọc</h3>
                  <MoneySelect label={d.loaiHopDong === "dat-coc" ? "Giá thuê dự kiến" : "Giá thuê *"} value={d.giaThue} valueText={d.giaThueText} presets={RENT_RANGE} onChangeAmount={(a, t) => setMoney("giaThue", "giaThueText", a, t)} required={d.loaiHopDong === "thue-nha"} useDropdown span />
                  <MoneySelect label={d.loaiHopDong === "dat-coc" ? "Tiền đặt cọc *" : "Tiền đặt cọc"} value={d.tienCoc} valueText={d.tienCocText} presets={RENT_RANGE} onChangeAmount={(a, t) => setMoney("tienCoc", "tienCocText", a, t)} required={d.loaiHopDong === "dat-coc"} useDropdown span suffix="VNĐ" />
                  <MoneySelect label="Phí dịch vụ / người / tháng" value={d.phiQuanLy} valueText="" presets={SERVICE_RANGE} onChangeAmount={(a) => set("phiQuanLy", a)} useDropdown suffix="đ/người" />
                  {d.loaiHopDong === "thue-nha" && (
                    <DateField label="Giá không đổi đến ngày" value={d.ngayGiaKhongDoiDen} onChange={(v) => set("ngayGiaKhongDoiDen", v)} />
                  )}
                </div>

                {/* Electricity & services – dat-coc */}
                {d.loaiHopDong === "dat-coc" && (
                  <>
                    <div className="space-y-5">
                      <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-1">Giá điện</h3>
                      <MoneySelect label="Mùa Đông (đồng/số)" value={d.dienMuaDong ?? ""} valueText="" presets={ELECTRIC_PRESETS} onChangeAmount={(a) => set("dienMuaDong", a)} suffix="đ/kWh" />
                      <MoneySelect label="Mùa Hè (đồng/số)" value={d.dienMuaHe ?? ""} valueText="" presets={ELECTRIC_PRESETS} onChangeAmount={(a) => set("dienMuaHe", a)} suffix="đ/kWh" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-1">Dịch vụ khác</h3>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                          <input type="checkbox" checked={!!d.anTheoThang} onChange={(e) => set("anTheoThang", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400" />
                          Ăn theo tháng
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                          <input type="checkbox" checked={!!d.donVeSinhTheoThang} onChange={(e) => set("donVeSinhTheoThang", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-400" />
                          Dọn vệ sinh theo tháng
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Rental period */}
                <Section title="Thời hạn hợp đồng">
                  <DateField label="Ngày bắt đầu" value={d.ngayBatDau} onChange={(v) => set("ngayBatDau", v)} required={d.loaiHopDong === "thue-nha"} />
                  <DateField label="Ngày kết thúc" value={d.ngayKetThuc} onChange={(v) => set("ngayKetThuc", v)} />
                  {d.loaiHopDong === "dat-coc" && (
                    <Field label="Số tháng thuê" value={d.soThangThue ?? ""} placeholder="VD: 12" onChange={(v) => set("soThangThue", v)} />
                  )}
                </Section>

                {/* Deposit slip time & appointment */}
                {d.loaiHopDong === "dat-coc" && (
                  <Section title="Thời gian thanh toán & lịch hẹn">
                    <DateField label="Hẹn ngày ký hợp đồng chính thức" value={d.ngayHenKyHopDong ?? ""} onChange={(v) => set("ngayHenKyHopDong", v)} />
                    <Field label="Kỳ hạn thanh toán (tháng/lần)" value={d.phuongThucThanhToan} placeholder="VD: 1 hoặc 3" onChange={(v) => set("phuongThucThanhToan", v)} />
                    <Field label="Thời gian tính tiền thuê nhà" value={d.thoiGianTinhTien ?? ""} placeholder="VD: Từ ngày 01 hàng tháng" onChange={(v) => set("thoiGianTinhTien", v)} span />
                  </Section>
                )}

                {/* Payment schedule – thue-nha only */}
                {d.loaiHopDong === "thue-nha" && (
                  <Section title="Phương thức & lịch thanh toán">
                    <Field label="Phương thức TT (tháng/lần)" value={d.phuongThucThanhToan} placeholder="VD: 1 hoặc 3" onChange={(v) => set("phuongThucThanhToan", v)} />
                    <DateField label="Đợt 1 – Từ ngày" value={d.dot1Tu} onChange={(v) => set("dot1Tu", v)} />
                    <DateField label="Đợt 1 – Đến ngày" value={d.dot1Den} onChange={(v) => set("dot1Den", v)} />
                    <DateField label="Đợt 1 – Hạn TT muộn nhất" value={d.dot1HanChot} onChange={(v) => set("dot1HanChot", v)} />
                  </Section>
                )}

                {/* Bên A */}
                <Section title="Thông tin bên A (chủ nhà – Young House)">
                  <Field label="Tên công ty / Chủ nhà" value={d.benA_ten} onChange={(v) => set("benA_ten", v)} span />
                  <Field label="Mã số thuế" value={d.benA_mst} onChange={(v) => set("benA_mst", v)} />
                  <Field label="Số điện thoại" value={d.benA_sdt} onChange={(v) => set("benA_sdt", v)} />
                  <Field label="Địa chỉ" value={d.benA_diaChi} onChange={(v) => set("benA_diaChi", v)} span />
                </Section>
              </>
            )}

            {/* Validation hint */}
            {!canGenerate && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {d.loaiHopDong === "dat-coc" ? (
                  <>Vui lòng điền: <strong className="mx-1">Số phòng</strong> và <strong className="mx-1">Tiền đặt cọc</strong> để tạo giấy đặt cọc.</>
                ) : d.loaiHopDong === "phu-luc" ? (
                  <>Vui lòng điền: <strong className="mx-1">Số phòng</strong> để tạo phụ lục.</>
                ) : d.loaiHopDong === "cam-ket-chay" ? (
                  <>Vui lòng điền: <strong className="mx-1">Số phòng</strong> để tạo bản cam kết.</>
                ) : d.loaiHopDong === "cam-ket-noi-quy" ? (
                  <>Vui lòng điền: <strong className="mx-1">Số phòng</strong> để tạo bản cam kết.</>
                ) : (
                  <>Vui lòng điền: <strong className="mx-1">Số phòng</strong>, <strong className="mx-1">Giá thuê</strong> và <strong className="mx-1">Ngày bắt đầu</strong> để tạo hợp đồng.</>
                )}
              </div>
            )}

            {/* Error / success */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            {done && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                File Word đã tải xuống thành công!
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              <button onClick={onBack} className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors">
                ← Quay lại
              </button>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="flex-1 h-12 rounded-xl bg-sky-900 text-white font-semibold text-sm hover:bg-sky-950 active:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                {generating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    {d.loaiHopDong === "dat-coc"
                      ? "Tạo & tải Giấy Đặt Cọc (.docx)"
                      : d.loaiHopDong === "phu-luc"
                      ? "Tạo & tải Phụ Lục (.docx)"
                      : d.loaiHopDong === "cam-ket-chay"
                      ? "Tạo & tải Cam Kết PCCC (.docx)"
                      : d.loaiHopDong === "cam-ket-noi-quy"
                      ? "Tạo & tải Cam Kết Nội Quy (.docx)"
                      : "Tạo & tải hợp đồng (.docx)"}
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Placeholder for unimplemented types */}
        {!["thue-nha", "dat-coc", "phu-luc", "cam-ket-chay", "cam-ket-noi-quy"].includes(d.loaiHopDong) && (
          <div className="flex items-center justify-center p-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700 mb-2">Sắp ra mắt</p>
              <p className="text-sm text-gray-500">Chức năng này sẽ được cập nhật sớm.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
