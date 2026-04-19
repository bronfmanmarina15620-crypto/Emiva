type Props = {
  value: number;
  size?: number;
};

export function MasteryJar({ value, size = 180 }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  const bodyTop = 60;
  const bodyHeight = 150;
  const fillHeight = bodyHeight * pct;
  const fillY = bodyTop + bodyHeight - fillHeight;
  const label = `${Math.round(pct * 100)}%`;
  const textY = bodyTop + bodyHeight / 2 + 12;

  const uid = `jar-${Math.round(pct * 1000)}`;

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={(size * 240) / 200}
      role="img"
      aria-label={`שליטה ${label}`}
    >
      <defs>
        <clipPath id={`${uid}-body`}>
          <rect x="30" y={bodyTop} width="140" height={bodyHeight} rx="22" />
        </clipPath>
        <clipPath id={`${uid}-above`}>
          <rect x="0" y="0" width="200" height={fillY} />
        </clipPath>
        <clipPath id={`${uid}-below`}>
          <rect x="0" y={fillY} width="200" height={240 - fillY} />
        </clipPath>
      </defs>

      <rect
        x="26"
        y={bodyTop}
        width="148"
        height={bodyHeight + 4}
        rx="24"
        fill="#FFFFFF"
        stroke="#E8E2D4"
        strokeWidth="3"
      />

      <rect x="18" y="36" width="164" height="28" rx="10" fill="#E8E2D4" />
      <rect x="28" y="44" width="144" height="12" rx="6" fill="#F3EDDD" />

      {pct > 0 && (
        <g clipPath={`url(#${uid}-body)`}>
          <rect
            x="30"
            y={fillY}
            width="140"
            height={fillHeight + 4}
            fill="#7BA881"
          />
          <ellipse
            cx="60"
            cy={fillY + 10}
            rx="14"
            ry="5"
            fill="#FFFFFF"
            opacity="0.28"
          />
          <ellipse
            cx="140"
            cy={fillY + 14}
            rx="8"
            ry="3"
            fill="#FFFFFF"
            opacity="0.18"
          />
        </g>
      )}

      <text
        x="100"
        y={textY}
        textAnchor="middle"
        fontSize="38"
        fontWeight="800"
        fill="#2B2735"
        fontFamily="var(--font-heebo), system-ui, sans-serif"
        clipPath={`url(#${uid}-above)`}
      >
        {label}
      </text>
      <text
        x="100"
        y={textY}
        textAnchor="middle"
        fontSize="38"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="var(--font-heebo), system-ui, sans-serif"
        clipPath={`url(#${uid}-below)`}
      >
        {label}
      </text>
    </svg>
  );
}
