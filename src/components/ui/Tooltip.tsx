"use client";

import { useState, useRef } from "react";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function show() {
    timeoutRef.current = setTimeout(() => setVisible(true), 300);
  }

  function hide() {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-atlas-body text-atlas-on-primary bg-atlas-primary rounded-lg shadow-lg max-w-[250px] text-center whitespace-normal pointer-events-none"
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-atlas-primary" />
        </div>
      )}
    </div>
  );
}
