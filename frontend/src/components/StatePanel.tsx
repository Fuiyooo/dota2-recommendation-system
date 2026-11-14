import type { ReactNode } from "react";

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="panel p-4" role="status">
      <p className="text-sm">Memuat {label}...</p>
    </div>
  );
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel border-red-800 p-4" role="alert">
      <p className="text-sm font-medium text-red-800">Gagal memuat data</p>
      <p className="muted mt-1 text-sm">{message}</p>
      {onRetry ? (
        <button type="button" className="button mt-3" onClick={onRetry}>
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}

export function EmptyPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="panel border-dashed p-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="muted mt-1 text-sm">{children}</div>
    </div>
  );
}
