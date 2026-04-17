import PageHeader from "@/components/admin/shared/PageHeader"
import PlaygroundChat from "./PlaygroundChat"

export default function AIPlaygroundPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Playground"
        description="Test Claude's tools end-to-end without pushing through Telegram. Tool calls and results render inline."
      />
      <PlaygroundChat />
    </div>
  )
}
