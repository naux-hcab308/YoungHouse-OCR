"use client";

interface Step {
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { label: "Quét CCCD", icon: "1" },
  { label: "Kiểm tra thông tin", icon: "2" },
  { label: "Tạo hợp đồng", icon: "3" },
];

export default function StepIndicator({ current }: { current: number }) {
  return (
    <nav className="flex items-center justify-start gap-0 select-none overflow-x-auto" aria-label="Tiến trình">
      {STEPS.map((step, idx) => {
        const num = idx + 1;
        const done = num < current;
        const active = num === current;

        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done
                    ? "bg-[#006da6] text-white"
                    : active
                    ? "bg-[#cf0f75] text-white ring-4 ring-rose-100"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={`mt-2 text-xs font-semibold whitespace-nowrap uppercase tracking-[0.08em] ${
                  active ? "text-[#cf0f75]" : done ? "text-[#006da6]" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`mx-2 mb-5 h-0.5 w-20 transition-colors ${
                  num < current ? "bg-[#006da6]" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
