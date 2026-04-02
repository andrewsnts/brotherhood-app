"use client";

function getBatteryColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-400";
  if (pct >= 40) return "bg-orange-400";
  return "bg-red-500";
}

export default function BatteryGauge({ percent }: { percent: number }) {
  const color = getBatteryColor(percent);
  return (
    <div className="flex items-center gap-3">
      {/* battery shell */}
      <div className="relative flex items-center w-24 h-10 rounded-md border-2 border-gray-600 bg-gray-900">
        {/* nub */}
        <div className="absolute -right-[7px] w-[6px] h-4 rounded-r bg-gray-600" />
        {/* fill */}
        <div
          className={`h-full rounded transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
        {/* label */}
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
          {percent}%
        </span>
      </div>
    </div>
  );
}
