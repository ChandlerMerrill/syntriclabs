"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import StatusBadge from "@/components/admin/shared/StatusBadge"
import ConfirmDialog from "@/components/admin/shared/ConfirmDialog"
import ActivityFeed from "@/components/admin/activities/ActivityFeed"
import {
  ArrowLeft, Edit, Trash2, Globe, Mail, Phone, MapPin, Plus,
  ArrowUpRight, ArrowDownLeft, Mic,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { DOCUMENT_TYPE_COLORS } from "@/lib/constants"
import { useClient, type ClientDetailData } from "@/hooks/admin/useClient"

export default function ClientDetail({ initialData }: { initialData: ClientDetailData }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { data } = useClient(initialData.client.id, initialData)
  const d = data ?? initialData
  const { client, projects, activities, documents, emails, transcripts } = d

  const handleDelete = async () => {
    const supabase = createClient()
    const { error } = await supabase.from("clients").delete().eq("id", client.id)
    if (error) {
      toast.error("Failed to delete client")
    } else {
      toast.success("Client deleted")
      router.push("/admin/clients")
      router.refresh()
    }
  }

  const primaryContact = client.client_contacts?.find((c) => c.is_primary) ?? client.client_contacts?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/clients" className="mb-2 flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Clients
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">{client.company_name}</h1>
            <StatusBadge status={client.status} />
          </div>
          {client.industry && <p className="mt-0.5 text-sm text-[#94A3B8]">{client.industry}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/clients/${client.id}/edit`}>
            <Button variant="outline" size="sm" className="border-white/8 text-[#94A3B8] hover:text-white">
              <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="text-[#94A3B8] hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-[#0B1120] border border-white/8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="emails">Emails ({emails.length})</TabsTrigger>
          <TabsTrigger value="transcripts">Transcripts ({transcripts.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Info cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-white/8 bg-[#1E293B]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-[#94A3B8]">Company Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#94A3B8]" />
                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-[#60A5FA] hover:underline">
                      {client.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <span className="text-xs">Source:</span>
                  <span className="capitalize text-white">{client.source.replace("_", " ")}</span>
                </div>
                {client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {client.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-[#334155] text-white text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
                {(client.address_street || client.address_city) && (
                  <div className="flex items-start gap-2 pt-1">
                    <MapPin className="mt-0.5 h-4 w-4 text-[#94A3B8]" />
                    <span className="text-white">
                      {[client.address_street, client.address_city, client.address_state, client.address_zip]
                        .filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-[#1E293B]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-[#94A3B8]">Contacts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.client_contacts?.length > 0 ? (
                  client.client_contacts.map((contact) => (
                    <div key={contact.id} className="flex items-start justify-between rounded-lg bg-[#0B1120] p-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {contact.name}
                          {contact.is_primary && <span className="ml-1.5 text-xs text-[#60A5FA]">(Primary)</span>}
                        </p>
                        {contact.role && <p className="text-xs text-[#94A3B8]">{contact.role}</p>}
                        <div className="mt-1 flex items-center gap-3 text-xs text-[#94A3B8]">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-[#60A5FA]">
                              <Mail className="h-3 w-3" /> {contact.email}
                            </a>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#94A3B8]">No contacts added.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {client.notes && (
            <Card className="border-white/8 bg-[#1E293B]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-[#94A3B8]">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-white">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <div className="mb-4 flex justify-end">
            <Link href={`/admin/projects/new?client_id=${client.id}`}>
              <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
                <Plus className="mr-1.5 h-4 w-4" /> Add Project
              </Button>
            </Link>
          </div>
          {projects.length > 0 ? (
            <div className="rounded-lg border border-white/8">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="text-[#94A3B8]">Name</TableHead>
                    <TableHead className="text-[#94A3B8]">Status</TableHead>
                    <TableHead className="text-[#94A3B8]">Start Date</TableHead>
                    <TableHead className="text-[#94A3B8]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer border-white/8 hover:bg-white/5"
                      onClick={() => router.push(`/admin/projects/${p.id}`)}
                    >
                      <TableCell className="font-medium text-white">{p.name}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-[#94A3B8]">{p.start_date ? formatDate(p.start_date) : "—"}</TableCell>
                      <TableCell className="text-[#94A3B8]">{formatDate(p.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#94A3B8]">No projects for this client yet.</p>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="mb-4 flex justify-end">
            <Link href={`/admin/documents/new?client_id=${client.id}`}>
              <Button size="sm" className="bg-[#2563EB] text-white hover:bg-[#3B82F6]">
                <Plus className="mr-1.5 h-4 w-4" /> New Document
              </Button>
            </Link>
          </div>
          {documents.length > 0 ? (
            <div className="rounded-lg border border-white/8">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8 hover:bg-transparent">
                    <TableHead className="text-[#94A3B8]">Title</TableHead>
                    <TableHead className="text-[#94A3B8]">Type</TableHead>
                    <TableHead className="text-[#94A3B8]">Status</TableHead>
                    <TableHead className="text-[#94A3B8]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer border-white/8 hover:bg-white/5"
                      onClick={() => router.push(`/admin/documents/${doc.id}`)}
                    >
                      <TableCell className="font-medium text-white">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={DOCUMENT_TYPE_COLORS[doc.type]}>
                          {doc.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={doc.status} /></TableCell>
                      <TableCell className="text-[#94A3B8]">{formatDate(doc.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#94A3B8]">No documents for this client yet.</p>
          )}
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          {emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-start gap-3 rounded-lg border border-white/8 bg-[#1E293B] p-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => router.push(`/admin/emails?thread=${email.gmail_thread_id}`)}
                >
                  {email.direction === "outbound" ? (
                    <ArrowUpRight className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowDownLeft className="mt-0.5 h-4 w-4 text-blue-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{email.subject ?? "(no subject)"}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {email.direction === "outbound" ? "To" : "From"}: {email.from_name || email.from_address}
                    </p>
                    <p className="mt-0.5 text-xs text-[#94A3B8]/70 truncate">{email.snippet}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[#94A3B8]">{formatDate(email.internal_date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#94A3B8]">No emails linked to this client yet.</p>
          )}
        </TabsContent>

        <TabsContent value="transcripts" className="mt-4">
          {transcripts.length > 0 ? (
            <div className="space-y-2">
              {transcripts.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-white/8 bg-[#1E293B] p-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => router.push(`/admin/transcripts/${t.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-purple-400 shrink-0" />
                      <p className="text-sm font-medium text-white">{t.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.sentiment && (
                        <Badge variant="secondary" className={
                          t.sentiment === "positive" ? "bg-emerald-500/10 text-emerald-400" :
                          t.sentiment === "negative" ? "bg-red-500/10 text-red-400" :
                          t.sentiment === "mixed" ? "bg-amber-500/10 text-amber-400" :
                          "bg-zinc-500/10 text-zinc-400"
                        }>
                          {t.sentiment}
                        </Badge>
                      )}
                      <span className="text-xs text-[#94A3B8]">{formatDate(t.date)}</span>
                    </div>
                  </div>
                  {t.summary && (
                    <p className="mt-1.5 text-xs text-[#94A3B8] line-clamp-2">{t.summary}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#94A3B8]">No transcripts linked to this client yet.</p>
          )}
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <ActivityFeed activities={activities} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete client"
        description={`This will permanently delete "${client.company_name}" and all associated contacts, projects, deals, and activities.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  )
}
