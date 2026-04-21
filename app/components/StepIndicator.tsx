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
    <nav className="flex items-center justify-center gap-0 mb-8 select-none" aria-label="Tiến trình">
      {STEPS.map((step, idx) => {
        const num = idx + 1;
        const done = num < current;
        const active = num === current;

        return (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done
                    ? "bg-cyan-600 text-white"
                    : active
                    ? "bg-rose-500 text-white ring-4 ring-rose-100"
                    : "bg-gray-200 text-gray-500"
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
                className={`mt-1 text-xs font-medium whitespace-nowrap ${
                  active ? "text-rose-600" : done ? "text-cyan-700" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-1 mb-4 transition-colors ${
                  num < current ? "bg-cyan-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
