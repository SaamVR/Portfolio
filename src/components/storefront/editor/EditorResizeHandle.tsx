"use client";

import { useRef } from "react";

export function EditorResizeHandle({
  value,
  min = 360,
  max = 520,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const draggingRef = useRef(false);

  const beginDrag = () => {
    draggingRef.current = true;

    const onMove = (event: MouseEvent) => {
      if (!draggingRef.current) return;
      onChange(Math.max(min, Math.min(max, event.clientX - 64)));
    };

    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onMouseDown={beginDrag}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onChange(Math.max(min, value - 16));
        if (event.key === "ArrowRight") onChange(Math.min(max, value + 16));
      }}
      className="hidden w-1 cursor-col-resize bg-transparent transition-colors hover:bg-emerald-500 focus-visible:bg-emerald-500 lg:block"
    />
  );
}
