import type { SupabaseClient } from '@supabase/supabase-js'
import type { MarketingProspect } from '../types'

/**
 * Pasted rows in, prospects out.
 *
 * The input is whatever a person copied out of a spreadsheet, so the parser has
 * to survive quoted fields with commas in them, CRLF, and a header row whose
 * column is called "Business" rather than "company". None of that is
 * interesting; getting it wrong silently is, because a misparsed row becomes a
 * prospect with a company name of `"Redrock` and an email of `UT"`.
 *
 * Two rules that are not conveniences:
 *
 *   - **An imported row never overwrites an existing prospect.** It is skipped
 *     with the reason shown. Pasting a list is not a statement about the rows
 *     already on file, and an import that updated them would be the same bug as
 *     the one the Add form had: an unrelated action clearing suppression.
 *   - **Every row lands `qualified: null`.** Import is transport, not judgement.
 *     Nothing here decides a prospect is worth contacting.
 */

export interface ImportRow {
  company: string
  contactName: string | null
  email: string
  website: string | null
  location: string | null
  linkedinUrl: string | null
  notes: string | null
}

export interface ParseResult {
  rows: ImportRow[]
  /** Per-line problems, with the line number a person can find in their paste. */
  errors: { line: number; reason: string }[]
  /** Which pasted header supplied each field, so the operator can check it. */
  mapping: Record<string, string>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Header spellings seen in the wild, per field. Matched after normalising to
 * lowercase single-spaced text, so `Contact_Name` and `CONTACT NAME` both land.
 */
const ALIASES: Record<keyof ImportRow, string[]> = {
  company: ['company', 'company name', 'business', 'business name', 'organization', 'organisation', 'account', 'operator'],
  contactName: ['contact name', 'contact', 'name', 'full name', 'first name', 'owner', 'owner name'],
  email: ['email', 'email address', 'e mail', 'e-mail', 'contact email'],
  website: ['website', 'web site', 'url', 'site', 'domain', 'web'],
  location: ['location', 'city', 'address', 'region', 'state', 'city state'],
  linkedinUrl: ['linkedin', 'linkedin url', 'linkedin profile'],
  notes: ['notes', 'note', 'comment', 'comments', 'description', 'detail', 'details'],
}

function normalizeHeader(raw: string): string {
  return raw
    .replace(/^﻿/, '') // Excel writes a BOM on the first header
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * RFC 4180-ish split. Quotes protect the delimiter and newlines inside them, and
 * a doubled quote is a literal one — the two things a spreadsheet export
 * actually produces.
 */
function splitDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
      continue
    }

    if (ch === '"') quoted = true
    else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else if (ch !== '\r') field += ch
  }

  row.push(field)
  rows.push(row)

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

export function parseProspectPaste(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { rows: [], errors: [{ line: 0, reason: 'Nothing pasted' }], mapping: {} }

  // Tabs win when present: a tab-separated paste is what you get from selecting
  // cells in a spreadsheet, and its fields routinely contain commas.
  const firstLine = trimmed.split('\n')[0]
  const delimiter = firstLine.includes('\t') ? '\t' : ','

  const table = splitDelimited(trimmed, delimiter)
  if (table.length < 2) {
    return {
      rows: [],
      errors: [{ line: 0, reason: 'Needs a header row and at least one data row' }],
      mapping: {},
    }
  }

  const headers = table[0].map(normalizeHeader)
  const index = {} as Record<keyof ImportRow, number>
  const mapping: Record<string, string> = {}

  for (const field of Object.keys(ALIASES) as (keyof ImportRow)[]) {
    const at = headers.findIndex((h) => ALIASES[field].includes(h))
    index[field] = at
    if (at > -1) mapping[field] = table[0][at].trim()
  }

  if (index.company === -1) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          reason: `No company column. Saw: ${headers.filter(Boolean).join(', ') || '(empty header)'}`,
        },
      ],
      mapping,
    }
  }
  if (index.email === -1) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          reason: `No email column. Saw: ${headers.filter(Boolean).join(', ') || '(empty header)'}`,
        },
      ],
      mapping,
    }
  }

  const cell = (row: string[], at: number): string | null => {
    if (at === -1) return null
    return row[at]?.trim() || null
  }

  const rows: ImportRow[] = []
  const errors: ParseResult['errors'] = []

  for (let r = 1; r < table.length; r++) {
    const line = r + 1
    const raw = table[r]
    const company = cell(raw, index.company)
    const email = cell(raw, index.email)?.toLowerCase() ?? null

    if (!company) {
      errors.push({ line, reason: 'No company' })
      continue
    }
    // An email is required, not optional. A row without one cannot be deduped
    // against what is already on file, cannot be qualified against anything, and
    // cannot be sent to — so importing it would only look like progress.
    if (!email) {
      errors.push({ line, reason: `${company}: no email address` })
      continue
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ line, reason: `${company}: not an email address — ${email}` })
      continue
    }

    rows.push({
      company,
      email,
      contactName: cell(raw, index.contactName),
      website: cell(raw, index.website),
      location: cell(raw, index.location),
      linkedinUrl: cell(raw, index.linkedinUrl),
      notes: cell(raw, index.notes),
    })
  }

  return { rows, errors, mapping }
}

export interface ImportResult {
  imported: MarketingProspect[]
  skipped: { company: string; email: string; reason: string }[]
  errors: { line: number; reason: string }[]
  mapping: Record<string, string>
}

export async function importProspects(
  supabase: SupabaseClient,
  text: string,
  opts?: { segmentId?: string | null }
): Promise<ImportResult> {
  const { rows, errors, mapping } = parseProspectPaste(text)
  const skipped: ImportResult['skipped'] = []

  // Duplicates inside the paste itself, resolved before touching the database.
  // First occurrence wins; the rest are reported rather than dropped quietly.
  const seen = new Map<string, ImportRow>()
  for (const row of rows) {
    if (seen.has(row.email)) {
      skipped.push({
        company: row.company,
        email: row.email,
        reason: `Duplicate of "${seen.get(row.email)!.company}" in this paste`,
      })
      continue
    }
    seen.set(row.email, row)
  }

  const candidates = [...seen.values()]
  if (candidates.length === 0) return { imported: [], skipped, errors, mapping }

  // Against the partial unique index on lower(email). Checked up front so a
  // collision is a readable skip rather than a constraint error naming an index.
  const { data: existing, error: lookupError } = await supabase
    .from('marketing_prospects')
    .select('id, company, email')
    .in(
      'email',
      candidates.map((c) => c.email)
    )
  if (lookupError) throw new Error(`Failed to check existing prospects: ${lookupError.message}`)

  const onFile = new Map(
    ((existing ?? []) as { company: string; email: string | null }[])
      .filter((e) => e.email)
      .map((e) => [e.email!.toLowerCase(), e.company])
  )

  const fresh = candidates.filter((c) => {
    const holder = onFile.get(c.email)
    if (!holder) return true
    skipped.push({
      company: c.company,
      email: c.email,
      reason: `Already on file as "${holder}" — left untouched`,
    })
    return false
  })

  if (fresh.length === 0) return { imported: [], skipped, errors, mapping }

  const { data: inserted, error: insertError } = await supabase
    .from('marketing_prospects')
    .insert(
      fresh.map((row) => ({
        segment_id: opts?.segmentId ?? null,
        company: row.company,
        contact_name: row.contactName,
        email: row.email,
        website: row.website,
        location: row.location,
        linkedin_url: row.linkedinUrl,
        notes: row.notes,
        // Unreviewed. Qualification is a separate, deliberate step.
        qualified: null,
        qualification_reason: null,
      }))
    )
    .select('*')

  if (insertError) throw new Error(`Failed to import prospects: ${insertError.message}`)

  return { imported: (inserted ?? []) as MarketingProspect[], skipped, errors, mapping }
}
