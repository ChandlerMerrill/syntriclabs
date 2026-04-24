import Image from "next/image"

export default function SyntricMascot({
  size = 24,
  variant: _variant = "brand",
}: {
  size?: number
  variant?: "brand" | "light"
}) {
  return (
    <Image
      src="/images/syntric-bot.png"
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
      aria-hidden="true"
      priority
    />
  )
}
