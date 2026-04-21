"use client";

import { useState } from "react";
import type { CccdData } from "../types";

interface Props {
  data: Partial<CccdData>;
  onChange: (data: Partial<CccdData>) => void;
  rawTextFront?: string;
  rawTextBack?: string;
  onBack: () => void;
  onNext: () => void;
}

interface FieldDef {
  key: keyof CccdData;
  label: string;
  placeholder: string;
  span?: boolean;
  hint?: string;
}

const FIELDS: FieldDef[] = [
  { key: "hoTen", label: "Họ và tên", placeholder: "VD: NGUYỄN VĂN A" },
  { key: "soCanCuoc", label: "Số CCCD / Hộ chiếu", placeholder: "12 chữ số" },
  { key: "ngaySinh", label: "Ngày/tháng/năm sinh", placeholder: "DD/MM/YYYY" },
  { key: "gioiTinh", label: "Giới tính", placeholder: "Nam / Nữ" },
  {
    key: "capNgay",
    label: "Cấp ngày (CCCD)",
    placeholder: "DD/MM/YYYY",
    hint: "Mặt sau CCCD hoặc nhập tay",
  },
  {
    key: "capTai",
    label: "Cấp tại",
    placeholder: "VD: Cục CS QLHC về TTXH",
    hint: "Nơi cấp CCCD",
  },
  { key: "queQuan", label: "Quê quán", placeholder: "Tỉnh/thành phố" },
  {
    key: "thuongTru",
    label: "Hộ khẩu thường trú",
    placeholder: "Địa chỉ đầy đủ",
    span: true,
  },
  { key: "quocTich", label: "Quốc tịch", placeholder: "Việt Nam" },
  {
    key: "ngayHetHan",
    label: "CCCD có giá trị đến",
    placeholder: "DD/MM/YYYY",
  },
];

export default function DataReview({ data, onChange, rawTextFront, rawTextBack, onBack, onNext }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const filled = FIELDS.filter((f) => data[f.key]?.trim()).length;
  const total = FIELDS.length;
  const hasMinRequired = !!(data.hoTen?.trim() && data.soCanCuoc?.trim());

  const handleChange = (key: keyof CccdData, value: string) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Kiểm tra &amp; chỉnh sửa thông tin</h2>
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 mb-2">
          <span aria-hidden>✓</span>
          OCR đã nhận dạng được {filled}/{total} trường
        </div>
        <p className="text-sm text-gray-600">
          Chỉnh sửa trực tiếp bất kỳ trường nào nếu cần — đối chiếu với ảnh gốc.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="aspect-[16/10] rounded-2xl bg-gradient-to-br from-[#0f3357] to-[#1d4d79] p-4 text-white shadow-inner">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">OCR Analysis Insights</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/10 p-2">
                <p className="text-cyan-200">Document</p>
                <p className="font-semibold text-white">CCCD</p>
              </div>
              <div className="rounded-lg bg-white/10 p-2">
                <p className="text-cyan-200">Confidence</p>
                <p className="font-semibold text-white">{Math.round((filled / total) * 100)}%</p>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-white/10 p-2 text-xs text-cyan-100">
              Hệ thống đã map dữ liệu OCR vào các trường hợp đồng. Bạn có thể chỉnh tay trước khi tạo file.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
            Mẹo: kiểm tra kỹ <strong>họ tên</strong>, <strong>số CCCD</strong> và <strong>ngày cấp</strong> để tránh sai hợp đồng.
          </div>
        </aside>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map((field) => {
            const v = data[field.key] ?? "";
            const empty = !v.trim();
            return (
              <div
                key={field.key}
                className={field.span ? "sm:col-span-2" : ""}
              >
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {field.label}
                  {empty && (
                    <span className="ml-1 text-amber-500 font-normal normal-case">
                      (chưa nhận dạng)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={v}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold text-black transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400/80 ${
                    empty
                      ? "border-amber-300 bg-amber-50 placeholder:text-gray-500"
                      : "border-gray-200 bg-slate-100 placeholder:text-gray-500"
                  }`}
                />
                {field.hint && (
                  <p className="mt-0.5 text-xs text-gray-600">{field.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw OCR debug panel */}
      {(rawTextFront || rawTextBack) && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            <span>🔍 Raw OCR text (debug)</span>
            <span>{showRaw ? "▲ Ẩn" : "▼ Xem"}</span>
          </button>
          {showRaw && (
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
              {[{ label: "Mặt trước", text: rawTextFront }, { label: "Mặt sau", text: rawTextBack }].map(({ label, text }) => (
                <div key={label} className="p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">{label}</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-48 overflow-y-auto">
                    {text || "(trống)"}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasMinRequired && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          Vui lòng điền ít nhất{" "}
          <strong className="mx-1">Họ và tên</strong> và{" "}
          <strong className="mx-1">Số CCCD</strong> để tiếp tục.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          ← Quay lại
        </button>
        <button
          onClick={onNext}
          disabled={!hasMinRequired}
          className="flex-1 h-12 rounded-xl bg-sky-900 text-white font-semibold text-sm hover:bg-sky-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md"
        >
          Tiếp theo →
        </button>
      </div>
    </div>
  );
}
