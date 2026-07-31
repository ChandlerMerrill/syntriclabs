import { generateObject } from 'ai'
import { z } from 'zod'
import { marketingModel, MARKETING_MAX_OUTPUT_TOKENS } from '../model'
import type { PainPointCandidate } from './extract'
import type { PainPointEvidence } from '../types'

/**
 * The ranking step — the one that gets skipped.
 *
 * Frequency of mention across *distinct sources* is the whole point: it is what
 * separates a real pain point from one that merely sounds compelling to a
 * builder. Sorting by how good a statement reads produces a list that flatters
 * the person who wrote it.
 *
 * Merging is done by a model rather than string matching because the same
 * complaint arrives in a dozen phrasings across a forum, a review, and a job
 * posting, and mechanical matching under-merges — which silently deflates
 * frequency and therefore the ranking itself.
 */

const clusterSchema = z.object({
  clusters: z.array(
    z.object({
      /** The canonical phrasing. Operator's framing, one sentence. */
      statement: z.string(),
      /** Indices into the candidate list that belong to this cluster. */
      memberIndices: z.array(z.number().int().nonnegative()),
      icpFear: z.string().nullable(),
    })
  ),
})

export interface RankedPainPoint {
  statement: string
  /** Distinct sources that mentioned it. Not raw candidate count. */
  frequency: number
  /** frequency weighted by source signal quality. */
  score: number
  rank: number
  evidence: PainPointEvidence[]
  icpFear: string | null
}

/**
 * Signal weight per source rank. Operator forums (1) count for more than trade
 * press (4), and the gap is deliberately wide — a complaint one operator makes
 * to another is worth several paragraphs of association copy.
 */
const SIGNAL_WEIGHT: Record<number, number> = { 1: 1.0, 2: 0.8, 3: 0.6, 4: 0.3 }

export async function clusterAndRank(
  candidates: PainPointCandidate[],
  opts?: { minFrequency?: number }
): Promise<RankedPainPoint[]> {
  if (candidates.length === 0) return []

  const listing = candidates
    .map((c, i) => `${i}. [${c.sourceUrl ?? 'unknown source'}] ${c.statement}`)
    .join('\n')

  const { object } = await generateObject({
    model: marketingModel('extract'),
    schema: clusterSchema,
    maxOutputTokens: MARKETING_MAX_OUTPUT_TOKENS,
    system:
      'You merge duplicate findings from a research pass. Two findings belong in the same ' +
      'cluster when an operator would recognise them as the same complaint, even when the ' +
      'wording is entirely different. Do not merge distinct complaints just because they share ' +
      'a topic — "reconciling receipts weeks later" and "no way to see trip margin" are ' +
      'different problems about the same thing.',
    prompt: [
      'Cluster these extracted pain points. Every index must appear in exactly one cluster.',
      'Write each cluster statement in the operator\'s framing, as a problem they feel.',
      'For icpFear, use the value most of the cluster members carry, or null.',
      '',
      listing,
    ].join('\n'),
  })

  const ranked: RankedPainPoint[] = []

  for (const cluster of object.clusters) {
    const members = cluster.memberIndices
      .map((i) => candidates[i])
      .filter((c): c is PainPointCandidate => Boolean(c))
    if (members.length === 0) continue

    // Frequency counts distinct sources, not candidates. One long forum thread
    // that yields six phrasings of the same complaint is one mention.
    const distinctSources = new Set(
      members.map((m) => m.sourceId ?? m.sourceUrl ?? 'unknown')
    )

    const score = members.reduce((sum, m) => {
      const weight = SIGNAL_WEIGHT[m.signalRank] ?? 0.3
      const confidence = m.confidence === 'high' ? 1 : m.confidence === 'medium' ? 0.7 : 0.4
      return sum + weight * confidence
    }, 0)

    const evidence: PainPointEvidence[] = []
    const seenQuotes = new Set<string>()
    for (const m of members) {
      const key = `${m.sourceUrl ?? ''}::${m.quote}`
      if (seenQuotes.has(key)) continue
      seenQuotes.add(key)
      evidence.push({ source_id: m.sourceId, quote: m.quote, url: m.sourceUrl })
    }

    ranked.push({
      statement: cluster.statement,
      frequency: distinctSources.size,
      score: Number(score.toFixed(3)),
      rank: 0,
      evidence,
      icpFear: cluster.icpFear,
    })
  }

  const minFrequency = opts?.minFrequency ?? 1

  return ranked
    .filter((p) => p.frequency >= minFrequency)
    // Every pain point carries a link, or it is an assumption and gets dropped.
    .filter((p) => p.evidence.some((e) => Boolean(e.url)))
    .sort((a, b) => b.score - a.score || b.frequency - a.frequency)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}
