import MarketingNav from "./MarketingNav"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <MarketingNav />
      {children}
    </div>
  )
}
