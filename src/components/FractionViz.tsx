type Props = {
  parts: number;
  filled: number;
  width?: number;
  height?: number;
};

const SAGE = "#7BA881";
const CREAM = "#FAF6EE";
const LINE = "#E8E2D4";

export function FractionViz({
  parts,
  filled,
  width = 240,
  height = 72,
}: Props) {
  const safeParts = Math.max(1, Math.round(parts));
  const safeFilled = Math.max(0, Math.min(safeParts, Math.round(filled)));
  const segW = width / safeParts;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${safeFilled} מתוך ${safeParts} חלקים שווים`}
    >
      <rect
        x={1.5}
        y={1.5}
        width={width - 3}
        height={height - 3}
        rx={12}
        fill={CREAM}
        stroke={LINE}
        strokeWidth={1.5}
      />
      {Array.from({ length: safeParts }).map((_, i) => {
        const x = i * segW;
        const isFilled = i < safeFilled;
        return (
          <g key={i}>
            {isFilled && (
              <rect
                x={x + 2}
                y={2}
                width={segW - 4}
                height={height - 4}
                rx={10}
                fill={SAGE}
              />
            )}
            {i < safeParts - 1 && (
              <line
                x1={(i + 1) * segW}
                y1={8}
                x2={(i + 1) * segW}
                y2={height - 8}
                stroke={LINE}
                strokeWidth={1.5}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
