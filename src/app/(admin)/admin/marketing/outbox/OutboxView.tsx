"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import PageHeader from "@/components/admin/shared/PageHeader"
import SendList, { initialSendStatusSelection } from "@/components/admin/marketing/SendList"
import QueueVariantPanel, {
  type QueueableVariant,
} from "@/components/admin/marketing/QueueVariantPanel"
import { Sparkles } from "lucide-react"
import type { SendWithContext } from "@/lib/marketing/services"

interface Props {
  initialSends: SendWithContext[]
  readyVariants: QueueableVariant[]
}

export default function OutboxView({ initialSends, readyVariants }: Props) {
  const router = useRouter()
  const [showQueue, setShowQueue] = useState(initialSends.length === 0)
  // Held here so queueing can point the list at what it just created.
  const [statusSel, setStatusSel] = useState<Set<string>>(() =>
    initialSendStatusSelection(initialSends)
  )

  // One fetch of everything, filtered in the browser — the counts on each filter
  // are only honest if the whole set is in hand.
  const { data, mutate } = useSWR<{ sends: SendWithContext[] }>(
    "/api/admin/marketing/outbox?status=all",
    {
      fallbackData: { sends: initialSends },
      refreshInterval: (latest) =>
        latest?.sends.some((s) => s.status === "sending" || s.status === "approved") ? 10000 : 0,
    }
  )

  const sends = useMemo(() => data?.sends ?? [], [data?.sends])

  function revalidate() {
    mutate()
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outbox"
        description="Nothing leaves without a recorded human approval. The schema refuses it, not just the code."
      >
        <Button
          size="sm"
          onClick={() => setShowQueue((v) => !v)}
          className="bg-[#2563EB] text-white hover:bg-[#3B82F6]"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {showQueue ? "Hide queue panel" : "Queue a variant"}
        </Button>
      </PageHeader>

      {showQueue && (
        <QueueVariantPanel
          readyVariants={readyVariants}
          onQueued={() => {
            setStatusSel(new Set(["pending_approval"]))
            revalidate()
          }}
        />
      )}

      <SendList
        sends={sends}
        onChanged={revalidate}
        statusSelection={statusSel}
        onStatusSelectionChange={setStatusSel}
      />
    </div>
  )
}
