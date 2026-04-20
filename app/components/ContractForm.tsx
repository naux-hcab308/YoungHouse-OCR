"use client";

import { useState } from "react";
import type { CccdData, CompanionInfo, ContractDetails, ContractType } from "../types";
import {
  generateDepositContract,
  generateRentalContract,
} from "../lib/generateContract";

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
  };
}

// ── Small sub-components ───────────────────────────────────────────────────────

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
        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      />
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
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

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  cccd: Partial<CccdData>;
  onBack: () => void;
}

export default function ContractForm({ cccd, onBack }: Props) {
  const [d, setD] = useState<ContractDetails>(defaultDetails);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof ContractDetails>(key: K, value: ContractDetails[K]) =>
    setD((prev) => ({ ...prev, [key]: value }));

  // Companion helpers
  const addCompanion = () => {
    if (d.nguoiOCung.length >= 3) return;
    set("nguoiOCung", [...d.nguoiOCung, emptyCompanion()]);
  };
  const removeCompanion = (idx: number) =>
    set("nguoiOCung", d.nguoiOCung.filter((_, i) => i !== idx));
  const updateCompanion = (idx: number, key: keyof CompanionInfo, value: string) => {
    const arr = d.nguoiOCung.map((c, i) =>
      i === idx ? { ...c, [key]: value } : c
    );
    set("nguoiOCung", arr);
  };

  const canGenerate = !!(d.soPhong.trim() && d.giaThue.trim() && d.ngayBatDau.trim());

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setDone(false);
    try {
      const blob =
        d.loaiHopDong === "thue-nha"
          ? await generateRentalContract(cccd, d)
          : await generateDepositContract(cccd, d);

      const safeName = cccd.hoTen?.replace(/\s+/g, "-") ?? "khach";
      const fileName =
        d.loaiHopDong === "thue-nha"
          ? `HDTN_${d.soPhong || "phong"}_${safeName}.docx`
          : `HDDC_${d.soPhong || "phong"}_${safeName}.docx`;

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

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Thông tin hợp đồng</h2>
        <p className="text-sm text-gray-500">Điền các thông tin còn lại để hoàn thiện hợp đồng.</p>
      </div>

      {/* Contract type */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Loại hợp đồng</p>
        <div className="grid grid-cols-2 gap-3">
          {(["thue-nha", "dat-coc"] as ContractType[]).map((type) => (
            <button
              key={type}
              onClick={() => set("loaiHopDong", type)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                d.loaiHopDong === type
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="text-2xl mb-1">{type === "thue-nha" ? "🏠" : "🤝"}</div>
              <div className={`font-semibold text-sm ${d.loaiHopDong === type ? "text-blue-700" : "text-gray-700"}`}>
                {type === "thue-nha" ? "Hợp đồng thuê nhà" : "Hợp đồng đặt cọc"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tenant summary */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
          Thông tin người thuê (từ CCCD)
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><span className="text-gray-400">Họ tên:</span> <span className="font-medium">{cccd.hoTen || "–"}</span></div>
          <div><span className="text-gray-400">Số CCCD:</span> <span className="font-medium">{cccd.soCanCuoc || "–"}</span></div>
          <div><span className="text-gray-400">Ngày sinh:</span> <span className="font-medium">{cccd.ngaySinh || "–"}</span></div>
          <div><span className="text-gray-400">Cấp ngày:</span> <span className="font-medium">{cccd.capNgay || "–"}</span></div>
          <div className="col-span-2"><span className="text-gray-400">Thường trú:</span> <span className="font-medium">{cccd.thuongTru || "–"}</span></div>
        </div>
      </div>

      {/* Signing date */}
      <Section title="Ngày ký hợp đồng">
        <Field label="Ngày" value={d.ngayKy} placeholder="DD" onChange={(v) => set("ngayKy", v)} />
        <Field label="Tháng" value={d.thangKy} placeholder="MM" onChange={(v) => set("thangKy", v)} />
        <Field label="Năm" value={d.namKy} placeholder="YYYY" onChange={(v) => set("namKy", v)} />
      </Section>

      {/* Bên B extras */}
      <Section title="Thông tin bổ sung bên B (người thuê)">
        <Field label="Số điện thoại" value={d.benB_sdt} placeholder="0xxx xxx xxx" onChange={(v) => set("benB_sdt", v)} />
        <Field label="SĐT người thân (khi cần liên lạc)" value={d.benB_sdtNguoiThan} placeholder="0xxx xxx xxx" onChange={(v) => set("benB_sdtNguoiThan", v)} />
      </Section>

      {/* Companions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
          <h3 className="text-sm font-bold text-gray-700">Người ở cùng</h3>
          {d.nguoiOCung.length < 3 && (
            <button
              onClick={addCompanion}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
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
                <button
                  onClick={() => removeCompanion(idx)}
                  className="text-xs text-red-500 hover:text-red-600 font-semibold"
                >
                  Xoá
                </button>
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
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {f.label}
                    </label>
                    <input
                      type="text"
                      value={c[f.key]}
                      placeholder={f.ph}
                      onChange={(e) => updateCompanion(idx, f.key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-black placeholder:text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Room info */}
      <Section title="Thông tin phòng">
        <Field label="Số phòng" value={d.soPhong} placeholder="VD: YH11-01" onChange={(v) => set("soPhong", v)} required />
        <Field label="Số người ở" value={d.soNguoiO} placeholder="VD: 2" onChange={(v) => set("soNguoiO", v)} />
        <Field label="Số xe máy" value={d.soXeMay} placeholder="VD: 1" onChange={(v) => set("soXeMay", v)} />
        <Field label="Biển số xe" value={d.bienSoXe} placeholder="VD: 30F1-12345" onChange={(v) => set("bienSoXe", v)} />
      </Section>

      {/* Pricing */}
      <Section title="Giá thuê & đặt cọc">
        <Field label="Giá thuê (số tiền, VNĐ)" value={d.giaThue} placeholder="VD: 3,500,000" onChange={(v) => set("giaThue", v)} required />
        <Field label="Giá thuê (bằng chữ)" value={d.giaThueText} placeholder="VD: Ba triệu năm trăm nghìn" onChange={(v) => set("giaThueText", v)} />
        <Field label="Giá không đổi đến ngày" value={d.ngayGiaKhongDoiDen} placeholder="DD/MM/YYYY" onChange={(v) => set("ngayGiaKhongDoiDen", v)} />
        <Field label="Tiền đặt cọc (VNĐ)" value={d.tienCoc} placeholder="VD: 3,500,000" onChange={(v) => set("tienCoc", v)} />
        <Field label="Tiền cọc (bằng chữ)" value={d.tienCocText} placeholder="VD: Ba triệu năm trăm nghìn" onChange={(v) => set("tienCocText", v)} />
        <Field label="Phí quản lý (đồng/người/tháng)" value={d.phiQuanLy} placeholder="VD: 100,000" onChange={(v) => set("phiQuanLy", v)} />
      </Section>

      {/* Payment */}
      <Section title="Phương thức & lịch thanh toán">
        <Field label="Phương thức TT (tháng/lần)" value={d.phuongThucThanhToan} placeholder="VD: 1 hoặc 3" onChange={(v) => set("phuongThucThanhToan", v)} />
        <Field label="Đợt 1 – Từ ngày" value={d.dot1Tu} placeholder="DD/MM/YYYY" onChange={(v) => set("dot1Tu", v)} />
        <Field label="Đợt 1 – Đến ngày" value={d.dot1Den} placeholder="DD/MM/YYYY" onChange={(v) => set("dot1Den", v)} />
        <Field label="Đợt 1 – Hạn TT muộn nhất" value={d.dot1HanChot} placeholder="DD/MM/YYYY" onChange={(v) => set("dot1HanChot", v)} />
      </Section>

      {/* Contract period */}
      <Section title="Thời hạn hợp đồng">
        <Field label="Ngày bắt đầu" value={d.ngayBatDau} placeholder="DD/MM/YYYY" onChange={(v) => set("ngayBatDau", v)} required />
        <Field label="Ngày kết thúc" value={d.ngayKetThuc} placeholder="DD/MM/YYYY" onChange={(v) => set("ngayKetThuc", v)} />
      </Section>

      {/* Bên A (collapsible/editable) */}
      <Section title="Thông tin bên A (chủ nhà – Young House)">
        <Field label="Tên công ty / Chủ nhà" value={d.benA_ten} onChange={(v) => set("benA_ten", v)} span />
        <Field label="Mã số thuế" value={d.benA_mst} onChange={(v) => set("benA_mst", v)} />
        <Field label="Số điện thoại" value={d.benA_sdt} onChange={(v) => set("benA_sdt", v)} />
        <Field label="Địa chỉ" value={d.benA_diaChi} onChange={(v) => set("benA_diaChi", v)} span />
      </Section>

      {/* Validation hint */}
      {!canGenerate && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Vui lòng điền: <strong className="mx-1">Số phòng</strong>, <strong className="mx-1">Giá thuê</strong> và <strong className="mx-1">Ngày bắt đầu</strong> để tạo hợp đồng.
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
          className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
              Tạo &amp; tải hợp đồng (.docx)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
