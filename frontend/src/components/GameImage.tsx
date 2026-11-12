import { useState } from "react";

interface GameImageProps {
  src: string;
  width: number;
  height: number;
  variant?: "thumb" | "icon";
  className?: string;
  eager?: boolean;
  alt?: string;
}

export function GameImage({
  src,
  width,
  height,
  variant = "thumb",
  className,
  eager = false,
  alt = "",
}: GameImageProps) {
  const [failed, setFailed] = useState(false);
  const base = variant === "thumb" ? "asset-thumb" : "asset-icon";

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={`${base} inline-block shrink-0 ${className ?? ""}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`${base} shrink-0 ${className ?? ""}`}
      onError={() => setFailed(true)}
    />
  );
}
