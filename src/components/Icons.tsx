import React from "react";

interface IconProps {
  className?: string;
}

export function BenchLogo({ className = "h-6 w-auto" }: IconProps) {
  return (
    <span className={`inline-flex items-baseline gap-1 select-none ${className}`}>
      <span className="font-sans text-[22px] font-extrabold tracking-[-0.03em] text-[#1E1C19] leading-none">
        BENCH
      </span>
      <span
        className="inline-block h-2 w-2 rounded-full bg-[#C85A32]"
        aria-hidden="true"
      />
    </span>
  );
}

export function WorkbenchIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6.5" y1="2.5" x2="6.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6.5" y1="7.5" x2="14" y2="7.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function RadarIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="8" x2="12.25" y2="3.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ChipIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 1.75V4M9.5 1.75V4M6.5 12V14.25M9.5 12V14.25M1.75 6.5H4M1.75 9.5H4M12 6.5H14.25M12 9.5H14.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BookmarkIcon({ className = "w-4 h-4", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} className={className} aria-hidden="true">
      <path d="M3.5 2.5H12.5V13.75L8 10.6L3.5 13.75V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function ShuffleIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 4.5H5L10.5 11.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 11.5H5L10.5 4.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 2.5L14 4.5L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9.5L14 11.5L12 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M8 2L14 5.5L8 9L2 5.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 8.75L8 12.25L14 8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11.75L8 15L14 11.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="5.25" y="5.25" width="8.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.75 5.25V2.75C10.75 2.47 10.53 2.25 10.25 2.25H2.75C2.47 2.25 2.25 2.47 2.25 2.75V10.25C2.25 10.53 2.47 10.75 2.75 10.75H5.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CheckIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2.75 8.25L6.25 11.75L13.25 4.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M6.5 3H3.5C3.22 3 3 3.22 3 3.5V12.5C3 12.78 3.22 13 3.5 13H12.5C12.78 13 13 12.78 13 12.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 2.5H13.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7.5" y1="8.5" x2="13.25" y2="2.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <line x1="2.5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M13 8A5 5 0 1 1 11.5 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 2V5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TerminalIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1.75" y="2.5" width="12.5" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 6L7 8L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8.5" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function XIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
