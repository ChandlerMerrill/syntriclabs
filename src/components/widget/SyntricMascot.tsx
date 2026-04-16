export default function SyntricMascot({
  size = 24,
  variant = "brand",
}: {
  size?: number
  variant?: "brand" | "light"
}) {
  const primary = variant === "light" ? "white" : "#8B5CF6"
  const body = variant === "light" ? "rgba(255,255,255,0.85)" : "#7C3AED"
  const arms = variant === "light" ? "rgba(255,255,255,0.7)" : "#6D28D9"
  const antenna = variant === "light" ? "rgba(255,255,255,0.9)" : "#A78BFA"
  const eyes = variant === "light" ? "#6D28D9" : "white"

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Antenna */}
      <rect x="7.5" y="0" width="1" height="1" fill={antenna} />
      {/* Head */}
      <rect x="5" y="1" width="6" height="5" fill={primary} />
      {/* Eyes */}
      <rect x="7" y="3" width="1" height="1" fill={eyes} />
      <rect x="9" y="3" width="1" height="1" fill={eyes} />
      {/* Body */}
      <rect x="6" y="6" width="4" height="4" fill={body} />
      {/* Arms */}
      <rect x="4" y="7" width="2" height="1" fill={arms} />
      <rect x="10" y="7" width="2" height="1" fill={arms} />
      {/* Legs */}
      <rect x="6" y="10" width="2" height="2" fill={body} />
      <rect x="8" y="10" width="2" height="2" fill={body} />
    </svg>
  )
}
