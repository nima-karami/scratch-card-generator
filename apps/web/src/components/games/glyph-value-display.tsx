import { useState, useMemo } from "react";
import { cn } from "../../lib/utils";

/** Fixed glyph order in the sheet: $ , 0 1 2 3 4 5 6 7 8 9 (12 cells). */
const GLYPH_ORDER = "$,0123456789";

export interface GlyphValueDisplayProps {
  value: string;
  glyphSheetSrc?: string;
  cols: number;
  rows: number;
  /** Fraction of each cell to hide from each edge per axis (0 = full cell). Values clamped to [0, 0.5). */
  cellInset?: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a dollar/numeric value using a glyph sheet image, or plain text if the image is missing or fails to load.
 * Each character in value is mapped to a cell in the sheet (cols x rows grid); order is $ , 0-9.
 */
export function GlyphValueDisplay({
  value,
  glyphSheetSrc,
  cols,
  rows,
  cellInset,
  className,
  style,
}: GlyphValueDisplayProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const useGlyphs = Boolean(glyphSheetSrc && !imageFailed);

  const entries = useMemo(() => {
    return value.split("").map((char) => {
      const index = GLYPH_ORDER.indexOf(char);
      return { char, index };
    });
  }, [value]);

  if (!useGlyphs) {
    return (
      <span className={className} style={style}>
        {value}
      </span>
    );
  }

  return (
    <span
      className={cn("relative inline-flex items-center justify-center gap-0", className)}
      style={style}
    >
      {/* Hidden img to detect load failure (1px so the browser loads it) */}
      <img
        src={glyphSheetSrc}
        alt=""
        className="absolute opacity-0 pointer-events-none w-px h-px"
        onError={() => setImageFailed(true)}
      />
      <span aria-hidden className="inline-flex items-center">
        {entries.map(({ index }, i) => {
          if (index === -1) {
            return <span key={i} className="inline-block w-[0.15em]" aria-hidden />;
          }
          const col = index % cols;
          const row = Math.floor(index / cols);
          const insetX = Math.min(0.49, Math.max(0, cellInset?.x ?? 0));
          const insetY = Math.min(0.49, Math.max(0, cellInset?.y ?? 0));
          const visX = 1 - 2 * insetX;
          const visY = 1 - 2 * insetY;
          const bgSize = `${(cols * 100) / visX}% ${(rows * 100) / visY}%`;
          const posXem = 0.5 - (col + 0.5) / visX;
          const posYem = 0.5 - (row + 0.5) / visY;
          return (
            <span
              key={i}
              className="inline-block bg-no-repeat shrink-0"
              style={{
                backgroundImage: `url(${glyphSheetSrc})`,
                backgroundPosition: `${posXem}em ${posYem}em`,
                backgroundSize: bgSize,
                width: "1em",
                height: "1em",
              }}
            />
          );
        })}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
