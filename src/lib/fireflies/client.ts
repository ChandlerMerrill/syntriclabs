const FIREFLIES_API = 'https://api.fireflies.ai/graphql'

function getApiKey(): string {
  const key = process.env.FIREFLIES_API_KEY
  if (!key) throw new Error('FIREFLIES_API_KEY not configured')
  return key
}

export async function firefliesGQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(FIREFLIES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`Fireflies API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  if (json.errors) {
    throw new Error(`Fireflies GraphQL error: ${json.errors[0]?.message ?? 'Unknown error'}`)
  }

  return json.data
}

export interface FirefliesTranscript {
  id: string
  title: string
  date: number // Unix timestamp in ms
  duration: number // seconds
  organizer_email: string
  participants: string[]
  transcript_url: string
  sentences: {
    speaker_name: string
    text: string
    start_time: number // seconds
    end_time: number
  }[]
  summary?: {
    overview?: string
    action_items?: string[]
    keywords?: string[]
  }
}

export async function getTranscript(id: string): Promise<FirefliesTranscript> {
  const data = await firefliesGQL<{ transcript: FirefliesTranscript }>(`
    query Transcript($id: String!) {
      transcript(id: $id) {
        id
        title
        date
        duration
        organizer_email
        participants
        transcript_url
        sentences {
          speaker_name
          text
          start_time
          end_time
        }
        summary {
          overview
          action_items
          keywords
        }
      }
    }
  `, { id })
  return data.transcript
}

export async function listTranscripts(params?: { limit?: number; skip?: number }): Promise<FirefliesTranscript[]> {
  const data = await firefliesGQL<{ transcripts: FirefliesTranscript[] }>(`
    query Transcripts($limit: Int, $skip: Int) {
      transcripts(limit: $limit, skip: $skip) {
        id
        title
        date
        duration
        organizer_email
        participants
        transcript_url
        sentences {
          speaker_name
          text
          start_time
          end_time
        }
        summary {
          overview
          action_items
          keywords
        }
      }
    }
  `, { limit: params?.limit ?? 50, skip: params?.skip ?? 0 })
  return data.transcripts
}
