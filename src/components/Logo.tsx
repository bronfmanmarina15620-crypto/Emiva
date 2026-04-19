type Props = {
  size?: number;
};

export function Logo({ size = 48 }: Props) {
  return (
    <svg
      viewBox="0 0 200 48"
      width={(size * 200) / 48}
      height={size}
      role="img"
      aria-label="Emiva"
    >
      <rect x="0" y="32" width="14" height="8" rx="4" fill="#DCE7DD" />
      <rect x="18" y="20" width="14" height="20" rx="4" fill="#AECBB3" />
      <rect x="36" y="8" width="14" height="32" rx="4" fill="#7BA881" />

      <text
        x="64"
        y="38"
        fontSize="38"
        fontWeight="800"
        fontFamily="var(--font-heebo), system-ui, sans-serif"
        letterSpacing="-0.5"
        style={{ direction: "ltr" }}
      >
        <tspan fill="#2B2735">Em</tspan>
        <tspan fill="#7BA881">i</tspan>
        <tspan fill="#2B2735">va</tspan>
      </text>
    </svg>
  );
}
