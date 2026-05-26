import type { BarModelBar } from "@/lib/types";

type Props = {
  bars: readonly BarModelBar[];
  width?: number;
};

const SAGE = "#7BA881";
const SAGE_SOFT = "#DCE8DD";
const CREAM = "#FAF6EE";
const LINE = "#E8E2D4";
const TEXT_DARK = "#3E342B";
const TEXT_MUTED = "#7A6E62";
const UNKNOWN_FILL = "#F5E4D8";

const BAR_HEIGHT = 56;
const BAR_GAP = 14;
const LABEL_WIDTH = 120;
const TOTAL_LABEL_HEIGHT = 28;
const V_PAD = 10;
const SEGMENT_CHAR_WIDTH = 12; // empirical estimate for Hebrew + digits @ 20px bold
const SEGMENT_INNER_PAD = 16;

/**
 * If the full label fits in the segment width, return it. Otherwise fall
 * back to the trailing value: text after " — " if present, else the last
 * whitespace-separated token (typically a number or "?"). This keeps the
 * digit visible in narrow segments without bleeding Hebrew text into
 * neighbors.
 */
function fitLabel(label: string, segW: number): string {
  const available = Math.max(0, segW - SEGMENT_INNER_PAD);
  if (label.length * SEGMENT_CHAR_WIDTH <= available) return label;
  const dashIdx = label.lastIndexOf("—");
  if (dashIdx !== -1) {
    const tail = label.slice(dashIdx + 1).trim();
    if (tail.length * SEGMENT_CHAR_WIDTH <= available) return tail;
  }
  const tokens = label.split(/\s+/);
  return tokens[tokens.length - 1] ?? label;
}

export function BarModelViz({ bars, width = 440 }: Props) {
  if (bars.length === 0) return null;

  // RTL layout: row labels live to the RIGHT of the bar (Hebrew reading
  // starts there). Bars extend leftward from the right-side label column.
  const hasRowLabel = bars.some((b) => !!b.rowLabel);
  const leftPad = 12;
  const rightPad = hasRowLabel ? LABEL_WIDTH : 12;
  const barWidth = width - leftPad - rightPad;
  // textAnchor="start" + direction="rtl" anchors the source-first char
  // (visual RIGHT for Hebrew) at labelX. Set labelX to the far-right edge
  // so the whole label sits inside the right margin.
  const labelX = width - 6;

  const bottomLabelsHeight = bars.some((b) => !!b.totalLabel)
    ? TOTAL_LABEL_HEIGHT
    : 0;
  const rowHeight = BAR_HEIGHT + bottomLabelsHeight + BAR_GAP;
  const height = V_PAD * 2 + rowHeight * bars.length - BAR_GAP;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="מודל מלבן לבעיה מילולית"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      {bars.map((bar, rowIdx) => {
        const rowTop = V_PAD + rowIdx * rowHeight;
        const totalWeight = bar.segments.reduce((s, seg) => s + seg.weight, 0) || 1;
        let cursorX = leftPad;

        return (
          <g key={rowIdx}>
            {bar.rowLabel && (
              <text
                x={labelX}
                y={rowTop + BAR_HEIGHT / 2}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={16}
                fontWeight={600}
                fill={TEXT_DARK}
                direction="rtl"
              >
                {bar.rowLabel}
              </text>
            )}

            <rect
              x={leftPad}
              y={rowTop}
              width={barWidth}
              height={BAR_HEIGHT}
              rx={10}
              fill={CREAM}
              stroke={LINE}
              strokeWidth={1.5}
            />

            {bar.segments.map((seg, segIdx) => {
              const segW = (seg.weight / totalWeight) * barWidth;
              const x = cursorX;
              cursorX += segW;
              const isUnknown = seg.label === "?";
              const fill = isUnknown ? UNKNOWN_FILL : SAGE_SOFT;
              const displayLabel = fitLabel(seg.label, segW);

              return (
                <g key={segIdx}>
                  <rect
                    x={x + 1.5}
                    y={rowTop + 1.5}
                    width={segW - 3}
                    height={BAR_HEIGHT - 3}
                    rx={8}
                    fill={fill}
                    stroke={isUnknown ? SAGE : LINE}
                    strokeWidth={isUnknown ? 2 : 1}
                    strokeDasharray={isUnknown ? "4 3" : undefined}
                  />
                  <text
                    x={x + segW / 2}
                    y={rowTop + BAR_HEIGHT / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={20}
                    fontWeight={700}
                    fill={TEXT_DARK}
                    direction="rtl"
                  >
                    {displayLabel}
                  </text>
                  {segIdx < bar.segments.length - 1 && (
                    <line
                      x1={x + segW}
                      y1={rowTop + 6}
                      x2={x + segW}
                      y2={rowTop + BAR_HEIGHT - 6}
                      stroke={LINE}
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              );
            })}

            {bar.totalLabel && (
              <text
                x={leftPad + barWidth / 2}
                y={rowTop + BAR_HEIGHT + 20}
                textAnchor="middle"
                fontSize={14}
                fill={TEXT_MUTED}
                direction="rtl"
              >
                {`סה"כ: ${bar.totalLabel}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
