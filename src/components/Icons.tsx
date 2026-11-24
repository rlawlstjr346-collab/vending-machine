import React from "react";

interface IconProps {
  className?: string;
}

export function DispenserLogo({ className = "" }: IconProps) {
  return (
    <span className={`inline-flex items-center gap-2 select-none ${className}`}>
      <span className="font-sans text-[19px] font-extrabold tracking-[0.06em] text-[#0F172A] leading-none sm:text-[21px]">
        DISPENSER
      </span>
      <span
        className="inline-block h-2 w-2 rounded-full bg-[#2563EB]"
        aria-hidden="true"
      />
    </span>
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

export function ArrowLeftIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <line x1="13.5" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 4L3 8L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <line x1="2.5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M13 8A5 5 0 1 1 11.5 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.5 2V5H8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
