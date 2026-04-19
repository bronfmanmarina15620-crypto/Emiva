type Props = {
  size?: number;
};

export function LogoMark({ size = 48 }: Props) {
  return (
    <svg
      viewBox="0 0 52 48"
      width={size}
      height={(size * 48) / 52}
      role="img"
      aria-label="Emiva"
    >
      <rect x="0" y="32" width="14" height="8" rx="4" fill="#DCE7DD" />
      <rect x="18" y="20" width="14" height="20" rx="4" fill="#AECBB3" />
      <rect x="36" y="8" width="14" height="32" rx="4" fill="#7BA881" />
    </svg>
  );
}
