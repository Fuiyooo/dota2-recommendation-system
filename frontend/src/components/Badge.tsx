import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "border-line-strong bg-surface-muted text-ink-soft",
  accent: "border-accent bg-accent-soft text-link",
  ok: "border-emerald-700 bg-emerald-50 text-emerald-800",
  warn: "border-amber-700 bg-amber-50 text-amber-900",
  danger: "border-red-800 bg-red-50 text-red-800",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap border px-1.5 py-0.5 text-xs rounded-sm ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function validationTone(status: string): Tone {
  if (status === "VERIFIED") return "ok";
  if (status === "MISMATCH" || status === "FAILED") return "danger";
  if (status === "REVIEW_REQUIRED" || status === "PARTIAL") return "warn";
  return "neutral";
}

export function runTone(status: string): Tone {
  if (status === "SUCCESS") return "ok";
  if (status === "FAILED") return "danger";
  if (status === "RUNNING" || status === "PARTIAL") return "warn";
  return "neutral";
}

export function calculationTone(status: string): Tone {
  if (status === "SUPPORTED" || status === "VERIFIED") return "ok";
  if (status === "PARTIAL" || status === "REVIEW_REQUIRED") return "warn";
  if (status === "UNSUPPORTED" || status === "ERROR" || status === "FAILED") {
    return "danger";
  }
  return "neutral";
}
