"use client";

import type { CccdData } from "../types";

interface Props {
  data: Partial<CccdData>;
  onChange: (data: Partial<CccdData>) => void;
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

export default function DataReview({ data, onChange, onBack, onNext }: Props) {
  const filled = FIELDS.filter((f) => data[f.key]?.trim()).length;
  const total = FIELDS.length;
  const hasMinRequired = !!(data.hoTen?.trim() && data.soCanCuoc?.trim());

  const handleChange = (key: keyof CccdData, value: string) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Kiểm tra &amp; chỉnh sửa thông tin
        </h2>
        <p className="text-sm text-gray-500">
          OCR đã nhận dạng được{" "}
          <span
            className={`font-semibold ${
              filled === total ? "text-green-600" : "text-amber-600"
            }`}
          >
            {filled}/{total}
          </span>{" "}
          trường. Chỉnh sửa trực tiếp bất kỳ trường nào nếu cần.
        </p>
      </div>

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
                className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  empty
                    ? "border-amber-300 bg-amber-50 placeholder-amber-300"
                    : "border-gray-300 bg-white"
                }`}
              />
              {field.hint && (
                <p className="mt-0.5 text-xs text-gray-400">{field.hint}</p>
              )}
            </div>
          );
        })}
      </div>

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
          className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Tiếp theo →
        </button>
      </div>
    </div>
  );
}
