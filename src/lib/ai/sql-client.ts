import postgres from 'postgres'

const MAX_ROWS = 500
const STATEMENT_TIMEOUT_MS = 10_000

type Sql = ReturnType<typeof postgres>

let _sql: Sql | null = null

function getClient(): Sql {
  if (_sql) return _sql
  const url = process.env.POSTGRES_URL
  if (!url) {
    throw new Error('POSTGRES_URL is not set. Add it in Vercel env + .env.local (Supabase pooler connection string with service_role credentials).')
  }
  _sql = postgres(url, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
  })
  return _sql
}

export interface QueryExecutionResult {
  rows: Record<string, unknown>[]
  rowCount: number
  columns: string[]
  truncated: boolean
}

/**
 * Runs a pre-validated query inside a transaction with a hard statement_timeout.
 * Returns { rows, rowCount, columns, truncated }.
 */
export async function executeQuery(query: string): Promise<QueryExecutionResult> {
  const sql = getClient()
  const result = await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`)
    return tx.unsafe(query)
  }) as unknown as { columns?: { name: string }[]; length: number } & Record<string, unknown>[]

  const rowsArr = Array.isArray(result) ? result as unknown as Record<string, unknown>[] : []
  const columns = Array.isArray(result) && (result as unknown as { columns?: { name: string }[] }).columns
    ? ((result as unknown as { columns: { name: string }[] }).columns).map(c => c.name)
    : rowsArr[0]
      ? Object.keys(rowsArr[0])
      : []

  const truncated = rowsArr.length >= MAX_ROWS
  return {
    rows: rowsArr,
    rowCount: rowsArr.length,
    columns,
    truncated,
  }
}

/**
 * Run arbitrary SELECTs WITHOUT going through the safety parser — only for describeSchema.
 * Still wrapped in a short-timeout transaction.
 */
export async function executeInternalRead(query: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const sql = getClient()
  const result = await sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`)
    return tx.unsafe(query, params as never[])
  })
  return Array.isArray(result) ? (result as unknown as Record<string, unknown>[]) : []
}
