"use client";

export function FileFormatBadges({
  formats,
  className = "",
}: {
  formats: string[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {formats.map((format) => (
        <span
          key={format}
          className="inline-flex items-center rounded-full border border-[#dcefdc] bg-[#f5fbf5] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2f8f3c] dark:border-primary/20 dark:bg-primary/10 dark:text-primary"
        >
          {format}
        </span>
      ))}
    </div>
  );
}
