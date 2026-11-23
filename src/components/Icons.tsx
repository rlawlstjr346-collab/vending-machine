import React from "react";

interface IconProps {
  className?: string;
}

export function BenchLogo({ className = "h-5 w-auto" }: IconProps) {
  return (
    <svg
      viewBox="0 0 112 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BENCH."
      role="img"
    >
      <rect x="0.75" y="3.75" width="14.5" height="14.5" stroke="#111111" strokeWidth="1.5" />
      <line x1="0.75" y1="11" x2="15.25" y2="11" stroke="#111111" strokeWidth="1.5" />
      <line x1="8" y1="3.75" x2="8" y2="18.25" stroke="#111111" strokeWidth="1.5" />
      <text
        x="22"
        y="17"
        fill="#111111"
        fontFamily="Inter, Pretendard, sans-serif"
        fontSize="16"
        fontWeight="700"
        letterSpacing="0.06em"
      >
        BENCH.
      </text>
    </svg>
  );
}

export function WorkbenchIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.75" y="2.25" width="12.5" height="11.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6.25" y1="2.25" x2="6.25" y2="13.75" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6.25" y1="7.5" x2="14.25" y2="7.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function RadarIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="8" x2="12.5" y2="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ChipIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 1.5V4M9.5 1.5V4M6.5 12V14.5M9.5 12V14.5M1.5 6.5H4M1.5 9.5H4M12 6.5H14.5M12 9.5H14.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BookmarkIcon({ className = "w-4 h-4", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} className={className} aria-hidden="true">
      <path d="M3.25 2.25H12.75V13.75L8 10.5L3.25 13.75V2.25Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ShuffleIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 4.5H5L10.5 11.5H14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 11.5H5L10.5 4.5H14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2.5L14 4.5L12 6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 9.5L14 11.5L12 13.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BranchIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="4" cy="3.5" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="12.5" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 5.25V10.75M4 5.25C4 7.5 6.5 8 10.25 8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LayersIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2L14 5.5L8 9L2 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 8.75L8 12.25L14 8.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 11.75L8 15L14 11.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CopyIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="5.25" y="5.25" width="8.5" height="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.75 5.25V2.25H2.25V10.75H5.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CheckIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2.75 8.25L6.25 11.75L13.25 4.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M6.5 3H3V13H13V9.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 2.5H13.5V6.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7.5" y1="8.5" x2="13.25" y2="2.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <line x1="2.5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function RefreshIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M13 8A5 5 0 1 1 11.5 4.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 2V5H8.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function TerminalIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.75" y="2.5" width="12.5" height="11" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 6L7 8L4.5 10" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8.5" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function LinkIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M6.5 9.5L9.5 6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 11.5L4.5 12.5A2.5 2.5 0 0 1 1 9L2 8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 4.5L11.5 3.5A2.5 2.5 0 0 1 15 7L14 8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.2 6.8L6.8 4.2A2.5 2.5 0 0 1 10.3 7.7L9.5 8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.8 9.2L9.2 11.8A2.5 2.5 0 0 1 5.7 8.3L6.5 7.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function XIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
